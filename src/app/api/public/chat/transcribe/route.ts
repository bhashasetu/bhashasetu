import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/chat/sarvam";
import { getPublicChatConfig } from "@/lib/chat/config";
import { isFaqLocale } from "@/lib/faq/queries";

/**
 * A spoken question, turned into text the visitor can see.
 *
 * The transcript is returned, not acted on. It goes into the text box for them
 * to read and correct before they press send — which is the difference between
 * a mis-heard word being a visible typo and being a mysterious "we have not
 * collected that". Sarvam has no Warli or Katkari model, so a spoken native
 * word comes back as approximate Devanagari; that is fine when a person can see
 * it, and confusing when they cannot.
 *
 * The recording is never stored. It arrives, goes to Sarvam, and the response
 * is a string — nothing is written to the database or to storage, so there are
 * no voice recordings of visitors anywhere in this project.
 */

/**
 * Sarvam's REST transcription is for clips under 30 seconds, and Vercel caps a
 * request body well below what a long recording would weigh. The browser stops
 * recording before either matters; this is the backstop for a caller that does
 * not.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();

  const config = await getPublicChatConfig(supabase);
  if (!config.enabled || !config.asrEnabled) {
    return NextResponse.json(
      { error: "Spoken questions are not switched on." },
      { status: 409 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No recording received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That recording is too long. Try a shorter question." },
      { status: 413 }
    );
  }

  const requested = form?.get("locale");
  const locale =
    typeof requested === "string" && isFaqLocale(requested)
      ? requested
      : isFaqLocale(config.defaultLocale)
        ? config.defaultLocale
        : "en";

  const { data: allowed } = await supabase.rpc("chat_claim_call", { kind: "stt" });
  if (allowed !== true) {
    return NextResponse.json(
      { error: "Today's spoken-question limit has been reached. Type it instead." },
      { status: 429 }
    );
  }

  const result = await transcribe({ audio: file, locale });

  if (!result.ok) {
    // The provider's message is for the Back Office, not for a visitor.
    return NextResponse.json(
      { error: "That could not be transcribed. Try again, or type it." },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: result.value });
}
