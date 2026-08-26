import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest } from "@/lib/api/respond";
import { ping, speak } from "@/lib/chat/sarvam";
import { isSarvamConfigured } from "@/lib/chat/config";
import { chatModelValues } from "@/lib/validation/schemas";

/**
 * One real call to Sarvam, and the unedited result.
 *
 * Whether this account can reach a given model is not something the code can
 * know, so this asks: press it, and read what the provider actually said.
 *
 * Admin-only, and the provider's message is returned verbatim because that is
 * the point. The key is never included: it goes in a header and is never read
 * back out.
 */
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  if (!isSarvamConfigured()) {
    return badRequest("SARVAM_API_KEY is not set in this environment.");
  }

  const body = await request.json().catch(() => null);

  /**
   * The voice half, which had no way of being tested at all.
   *
   * A visitor pressing the microphone and getting nothing gives an editor
   * nowhere to look: the provider's real complaint never reaches a screen. One
   * short Bulbul call proves the key, the account and the voice, and shows
   * Sarvam's own error verbatim when it does not.
   *
   * It exercises text-to-speech rather than speech-to-text because the second
   * needs an audio file, and both fail the same way when the key or the
   * account is the problem — which is the common case.
   */
  if (body?.kind === "voice") {
    const started = Date.now();
    const voice = typeof body?.voice === "string" ? body.voice : "priya";
    const result = await speak({ text: "Namaste.", voice, locale: "en" });
    const ms = Date.now() - started;

    return NextResponse.json({
      data: result.ok
        ? { ok: true, reply: `Bulbul returned ${result.value.length} bytes of audio`, ms }
        : { ok: false, status: result.status, detail: result.detail || "No detail returned.", ms },
    });
  }

  const model = typeof body?.model === "string" ? body.model.trim() : "";
  if (!model) return badRequest("Choose a model first, then test.");
  // Not merely validation: each model has its own endpoint, so one outside this
  // list has nowhere to be sent. Refused here rather than billed for a 404.
  if (!(chatModelValues as readonly string[]).includes(model)) {
    return badRequest(`This build cannot reach "${model}".`);
  }

  const started = Date.now();
  const result = await ping(model);
  const ms = Date.now() - started;

  if (!result.ok) {
    return NextResponse.json({
      data: {
        ok: false,
        status: result.status,
        detail: result.detail || "No detail returned.",
        ms,
      },
    });
  }

  return NextResponse.json({
    data: { ok: true, reply: result.value.slice(0, 200), ms },
  });
}
