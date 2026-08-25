import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speak } from "@/lib/chat/sarvam";
import { getPublicChatConfig } from "@/lib/chat/config";
import { faqInLocale, isFaqLocale, FAQ_COLUMNS, type FaqRow } from "@/lib/faq/queries";

/**
 * Read one published help answer aloud.
 *
 * This route deliberately does NOT accept text. It takes the id of a published
 * FAQ and fetches the answer itself, so the only thing a synthetic voice can
 * ever say is copy that an editor wrote and published.
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
  const requested = typeof body?.locale === "string" ? body.locale : undefined;

  if (!faqId) {
    return NextResponse.json({ error: "Missing faq_id" }, { status: 400 });
  }

  const locale = isFaqLocale(requested)
    ? requested
    : isFaqLocale(config.defaultLocale)
      ? config.defaultLocale
      : "en";

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
