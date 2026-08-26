import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest } from "@/lib/api/respond";
import { ping, speak, transcribe } from "@/lib/chat/sarvam";
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
/**
 * A one-second 16 kHz mono WAV, built by hand.
 *
 * Sarvam's transcription works best at 16 kHz, and a real recording is the one
 * thing an admin screen cannot produce. This is enough to find out whether the
 * endpoint accepts what we send it.
 */
function oneSecondOfSound(): File {
  const rate = 16000;
  const samples = rate;
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) {
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);        // PCM chunk size
  header.writeUInt16LE(1, 20);         // PCM
  header.writeUInt16LE(1, 22);         // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);  // byte rate
  header.writeUInt16LE(2, 32);         // block align
  header.writeUInt16LE(16, 34);        // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return new File([Buffer.concat([header, data])], "test.wav", {
    type: "audio/wav",
  });
}

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

  /**
   * The half that Test voice cannot reach.
   *
   * Bulbul succeeding proves the key and the account, and says nothing at all
   * about speech-to-text: that one is a different endpoint, a different model,
   * and the only call in this project that uploads a file. When the microphone
   * does nothing and Bulbul is fine, this is what is left — and it runs without
   * a browser, so a failure here is Sarvam's and a failure there is ours.
   *
   * The audio is a second of a generated tone. Nobody is speaking, so an empty
   * transcript is a pass: what is being tested is whether the request is
   * accepted at all.
   */
  if (body?.kind === "listen") {
    const started = Date.now();
    const result = await transcribe({ audio: oneSecondOfSound(), locale: "en" });
    const ms = Date.now() - started;

    if (result.ok) {
      return NextResponse.json({
        data: {
          ok: true,
          reply: `Accepted the recording (heard: "${result.value.text}")`,
          ms,
        },
      });
    }
    // "Nothing was heard" is the expected answer to a tone, and means the
    // request was accepted — which is the whole question.
    const accepted = result.status === null && result.detail === "Nothing was heard.";
    return NextResponse.json({
      data: accepted
        ? { ok: true, reply: "Accepted the recording (no speech in it, as expected)", ms }
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
