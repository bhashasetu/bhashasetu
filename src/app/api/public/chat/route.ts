import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routeIntent, type ChatMode } from "@/lib/chat/intent";
import { matchFaq, recordUnanswered } from "@/lib/chat/faq-match";
import { getPublicChatConfig } from "@/lib/chat/config";
import { answerFromFaqs } from "@/lib/chat/sarvam";
import { getPublishedFaqs, faqInLocale } from "@/lib/faq/queries";
import { isFaqLocale, type FaqLocale } from "@/lib/faq/queries";
import { pronunciationAudioIds, searchEntries } from "@/lib/entries/search";

/**
 * My BhashaSetu.
 *
 * Every Warli and Katkari answer comes out of the database, and no model is
 * consulted about one at any point — not to classify the question, not to
 * answer it, not to phrase it. That is what makes the "Uses verified content
 * only" badge both approved designs print here honest: inventing a word is
 * impossible rather than discouraged, because the language route terminates in
 * a query several steps before a provider is reachable.
 *
 * A model is used in exactly one place: a help question that the published
 * FAQs do not match exactly, when an editor has switched it on. It is handed
 * those same published answers and told to work from them alone, so the most
 * it can do is recognise a rewording of something already answered.
 *
 * The response is a typed card, not prose, because most of what the assistant
 * says is a database record — a word with its meanings and its recording — and
 * flattening that into a sentence would lose the play button and the source.
 */

export type ChatReply =
  | {
      kind: "verified_words";
      intent: "word_lookup";
      term: string;
      matchedOn: string;
      entries: {
        id: string;
        native_text: string;
        transliteration: string | null;
        english_meaning: string | null;
        hindi_meaning: string | null;
        entry_type: string;
        audio_asset_id: string | null;
      }[];
    }
  | {
      kind: "help_answer";
      intent: "platform_help";
      question: string;
      answer: string;
      translated: boolean;
      /** Present when this answer can be read aloud; absent for generated prose. */
      faqId?: string;
      /** True when a model rephrased approved content rather than quoting it. */
      generated?: boolean;
    }
  | {
      kind: "no_result";
      intent: "word_lookup" | "platform_help";
      term?: string;
    }
  | { kind: "disabled" };

/** Bounded so a long paste cannot become a long, expensive query. */
const MAX_MESSAGE = 500;

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json().catch(() => null);
  const raw = typeof body?.message === "string" ? body.message.trim() : "";
  const requested = typeof body?.locale === "string" ? body.locale : undefined;
  // Which module the visitor is in. Absent means an older client, or a direct
  // caller: fall back to inferring intent from the sentence, as before.
  const mode: ChatMode | undefined =
    body?.mode === "learn" || body?.mode === "help" ? body.mode : undefined;

  if (!raw) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (raw.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Please keep questions under ${MAX_MESSAGE} characters.` },
      { status: 400 }
    );
  }

  const config = await getPublicChatConfig(supabase);
  if (!config.enabled) {
    return NextResponse.json({ data: { kind: "disabled" } satisfies ChatReply });
  }

  const locale: FaqLocale = isFaqLocale(requested)
    ? requested
    : isFaqLocale(config.defaultLocale)
      ? config.defaultLocale
      : "en";

  // Is the whole message a term the collection already knows? One indexed
  // lookup, and it lets a bare word typed on its own route correctly without
  // any guessing about sentence shape.
  //
  // Only needed when the module is unknown. A visitor who chose Learn has
  // already told us more than this query could, and one who chose Help is not
  // asking about a word at all — running it there would be a wasted round trip
  // on every message.
  const asTerm = mode ? null : await searchEntries(supabase, null, raw);
  const routed = routeIntent(raw, {
    mode,
    mentionsKnownEntry:
      asTerm?.matchedOn === "native_text" || asTerm?.matchedOn === "alias",
  });

  if (routed.intent === "word_lookup") {
    const term = routed.term?.trim() || raw;
    // Reuse the result we already have when the message was the term itself.
    const result =
      asTerm && term === raw ? asTerm : await searchEntries(supabase, null, term);

    if (result.data.length === 0) {
      await recordUnanswered(supabase, raw, locale);
      return NextResponse.json({
        data: { kind: "no_result", intent: "word_lookup", term } satisfies ChatReply,
      });
    }

    const audio = await pronunciationAudioIds(supabase, result.data);

    return NextResponse.json({
      data: {
        kind: "verified_words",
        intent: "word_lookup",
        term,
        matchedOn: result.matchedOn ?? "partial",
        entries: result.data.slice(0, 8).map((e) => ({
          id: e.id,
          native_text: e.native_text,
          transliteration: e.transliteration,
          english_meaning: e.english_meaning,
          hindi_meaning: e.hindi_meaning,
          entry_type: e.entry_type,
          audio_asset_id: audio[e.id] ?? null,
        })),
      } satisfies ChatReply,
    });
  }

  const faq = await matchFaq(supabase, raw, locale);
  if (faq) {
    return NextResponse.json({
      data: {
        kind: "help_answer",
        intent: "platform_help",
        question: faq.question,
        answer: faq.answer,
        translated: faq.translated,
        faqId: faq.faq.id,
      } satisfies ChatReply,
    });
  }

  // Nothing matched exactly. The model gets one chance, and only here: it is
  // given the published answers and told to work from those alone, so the most
  // it can do is recognise that a differently-worded question is one we have
  // already answered. It is never asked about Warli or Katkari — that route
  // ended in the database long before this line.
  //
  // The question is recorded either way. A model answer is a stopgap; the fix
  // is an editor adding the phrasing as an alias, and that only happens if the
  // miss is visible.
  await recordUnanswered(supabase, raw, locale);

  const model = config.chatModel?.trim();

  if (config.llmEnabled && model) {
    const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "llm" });

    if (allowed === true) {
      const published = await getPublishedFaqs(supabase);
      const grounding = published.map((f) => {
        const { question, answer } = faqInLocale(f, locale);
        return { question, answer };
      });

      const result = await answerFromFaqs({
        model,
        question: raw,
        locale,
        maxWords: config.maxResponseWords,
        faqs: grounding,
      });

      if (result.ok) {
        return NextResponse.json({
          data: {
            kind: "help_answer",
            intent: "platform_help",
            question: raw,
            answer: result.value,
            translated: true,
            generated: true,
          } satisfies ChatReply,
        });
      }
      // A provider that is down, slow, misconfigured, or that honestly said it
      // could not answer, all land here — and all fall through to the same
      // honest miss below. The assistant never fails because Sarvam did.
    }
  }

  return NextResponse.json({
    data: { kind: "no_result", intent: "platform_help" } satisfies ChatReply,
  });
}
