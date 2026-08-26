import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speak } from "@/lib/chat/sarvam";
import { getPublicChatConfig } from "@/lib/chat/config";
import { faqInLocale, isFaqLocale, FAQ_COLUMNS, type FaqRow } from "@/lib/faq/queries";
import { isSpokenPhrase, spokenPhrase, introducing } from "@/lib/chat/spoken-phrases";

/**
 * Read one published help answer aloud.
 *
 * This route deliberately does NOT accept text. It takes the id of a published
 * FAQ, of a published learning entry, or the key of a fixed interface phrase,
 * and fetches the words itself — so the only thing a synthetic voice can ever
 * say is copy that an editor wrote and published, or a sentence this codebase
 * owns.
 *
 * That is the difference between a rule and a guarantee. Bulbul has no Warli or
 * Katkari phonology — give it "Tandul" and it applies Hindi phonetics and
 * produces something confidently wrong, which a learner has no way to detect.
 * A route that accepted arbitrary text would be one careless caller away from
 * doing exactly that. This one cannot, whatever it is sent.
 *
 * Native-speaker recordings are served by /api/public/media instead, which is
 * where the real pronunciations live.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const config = await getPublicChatConfig(supabase);
  if (!config.enabled || !config.ttsEnabled) {
    return NextResponse.json(
      { error: "Spoken answers are not switched on." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const faqId = typeof body?.faq_id === "string" ? body.faq_id : "";
  const entryId = typeof body?.entry_id === "string" ? body.entry_id : "";
  const requested = typeof body?.locale === "string" ? body.locale : undefined;

  const locale = isFaqLocale(requested)
    ? requested
    : isFaqLocale(config.defaultLocale)
      ? config.defaultLocale
      : "en";

  /**
   * A fixed phrase, named by key.
   *
   * Same principle as a FAQ id and the same guarantee: the caller says which
   * sentence, the server says what the words are. Nothing a visitor types and
   * no Warli or Katkari word can reach Bulbul through here.
   */
  if (isSpokenPhrase(body?.phrase)) {
    const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "tts" });
    if (allowed !== true) {
      return NextResponse.json(
        { error: "Today's spoken-answer limit has been reached." },
        { status: 429 }
      );
    }

    const result = await speak({
      text: spokenPhrase(body.phrase, locale),
      voice: config.ttsVoice,
      locale,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "The spoken answer could not be produced." },
        { status: 502 }
      );
    }
    return NextResponse.json({ data: { audio: result.value } });
  }

  /**
   * The sentence that goes in front of a recording.
   *
   * This is what makes a spoken answer a conversation rather than a clip
   * arriving out of nowhere: "In Warli, 'I'm fine' is said like this." — and
   * then a Warli speaker says it.
   *
   * The caller sends an entry id and nothing else. The server reads the entry,
   * and builds the sentence from the language name and the meaning only. The
   * native text is fetched solely so it can be checked for and refused: Bulbul
   * has no Warli or Katkari phonology, so the one thing it must never be handed
   * is the word itself. The recording says that part, in the voice of someone
   * who speaks the language.
   */
  if (entryId) {
    // Published only, same as everywhere else: RLS enforces it and a draft
    // simply finds nothing rather than being read aloud.
    const { data: entry } = await supabase
      .from("learning_entries")
      .select("id, native_text, english_meaning, hindi_meaning, language_id")
      .eq("id", entryId)
      .eq("status", "published")
      .maybeSingle();

    if (!entry) {
      return NextResponse.json({ error: "No such entry." }, { status: 404 });
    }

    const { data: language } = entry.language_id
      ? await supabase
          .from("languages")
          .select("name")
          .eq("id", entry.language_id)
          .maybeSingle()
      : { data: null };

    // Hindi gets the Hindi meaning where there is one; English and Marathi get
    // the English. A meaning in the wrong script would be read with the wrong
    // phonetics, which is the same failure this route exists to prevent.
    const preferred =
      locale === "hi"
        ? (entry.hindi_meaning ?? entry.english_meaning)
        : entry.english_meaning;

    const native = (entry.native_text ?? "").trim().toLowerCase();
    const meaning = (preferred ?? "").trim();
    // A meaning field that has had the native word copied into it — data entry
    // being what it is — must not become a sentence for Bulbul to pronounce.
    const safeMeaning = meaning && meaning.toLowerCase() !== native ? meaning : null;

    const text = introducing({
      language: (language?.name as string | undefined) ?? null,
      meaning: safeMeaning,
      locale,
    });

    // The guarantee, checked rather than assumed: whatever the data looked
    // like, the native word is not in what gets sent.
    if (native && text.toLowerCase().includes(native)) {
      return NextResponse.json({ error: "No such entry." }, { status: 404 });
    }

    const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "tts" });
    if (allowed !== true) {
      return NextResponse.json(
        { error: "Today's spoken-answer limit has been reached." },
        { status: 429 }
      );
    }

    const result = await speak({ text, voice: config.ttsVoice, locale });
    if (!result.ok) {
      return NextResponse.json(
        { error: "The spoken answer could not be produced." },
        { status: 502 }
      );
    }
    return NextResponse.json({ data: { audio: result.value } });
  }

  if (!faqId) {
    return NextResponse.json({ error: "Missing faq_id" }, { status: 400 });
  }

  // Published only: RLS enforces it, and asking for a draft simply finds
  // nothing rather than leaking unreviewed copy through the speaker.
  const { data } = await supabase
    .from("chat_faqs")
    .select(FAQ_COLUMNS)
    .eq("id", faqId)
    .eq("status", "published")
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "No such answer." }, { status: 404 });
  }

  const { answer } = faqInLocale(data as unknown as FaqRow, locale);

  const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "tts" });
  if (allowed !== true) {
    return NextResponse.json(
      { error: "Today's spoken-answer limit has been reached." },
      { status: 429 }
    );
  }

  const result = await speak({ text: answer, voice: config.ttsVoice, locale });

  if (!result.ok) {
    // The provider's message is for the Back Office, not for a visitor.
    return NextResponse.json(
      { error: "The spoken answer could not be produced." },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: { audio: result.value } });
}
