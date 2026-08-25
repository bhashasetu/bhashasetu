/**
 * The only file that talks to Sarvam.
 *
 * Written against Sarvam's published documentation for Bulbul v3 and the
 * Sarvam-105B chat models. Two details are worth knowing before editing:
 *
 *  - The chat endpoint depends on the model. sarvam-105b is served on the
 *    OpenAI-compatible /v2/chat/completions; sarvam-105b-conversations, meant
 *    for real-time dialogue, is on /v1. Sending a model to the wrong one fails.
 *
 *  - Bulbul takes a single `text`, not an array, and calls the language field
 *    `language_code`. It also warns that romanised Indic input degrades output
 *    badly — which is fine here, because the Hindi and Marathi answers are
 *    stored in Devanagari and are read as stored.
 *
 * The one thing still taken on trust is the field the audio comes back in, so
 * the parser accepts either form Sarvam has used rather than betting on one.
 */

const BASE_URL = "https://api.sarvam.ai";
const TTS_PATH = "/text-to-speech";
const AUTH_HEADER = "api-subscription-key";

/**
 * Where each chat model is served.
 *
 * sarvam-m and sarvam-30b are deprecated and deliberately absent: offering a
 * model that no longer answers would look like a bug the first time someone
 * chose it.
 */
const CHAT_PATH_BY_MODEL: Record<string, string> = {
  "sarvam-105b": "/v2/chat/completions",
  "sarvam-105b-conversations": "/v1/chat/completions",
};

function chatPathFor(model: string): string | null {
  return CHAT_PATH_BY_MODEL[model] ?? null;
}

/** Bulbul rejects anything longer; answers are 40-60 words, so this is slack. */
const TTS_MAX_CHARS = 2500;

/** Beyond this, a slow provider is a failure rather than a wait. */
const TIMEOUT_MS = 12_000;

export type SarvamResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number | null; detail: string };

function keyOrNull(): string | null {
  const key = process.env.SARVAM_API_KEY?.trim();
  return key ? key : null;
}

/**
 * One request, bounded and never retried.
 *
 * A paid call that failed is not retried automatically: a provider outage
 * would otherwise multiply into a bill, and the assistant has a perfectly good
 * answer without it — the deterministic one.
 */
async function call(
  path: string,
  body: unknown,
  accept: "json" | "audio"
): Promise<SarvamResult<unknown>> {
  const key = keyOrNull();
  if (!key) {
    return { ok: false, status: null, detail: "SARVAM_API_KEY is not set." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(BASE_URL + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [AUTH_HEADER]: key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      // The provider's own message is the most useful thing here, and it is
      // shown only in the Back Office test — never to a visitor, and never
      // logged with the key.
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, detail: text.slice(0, 500) };
    }

    if (accept === "audio") {
      const json = await res.json().catch(() => null);
      return { ok: true, value: json };
    }
    return { ok: true, value: await res.json() };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: null,
      detail: aborted
        ? `No response within ${TIMEOUT_MS / 1000} seconds.`
        : err instanceof Error
          ? err.message
          : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

/**
 * Answer a help question, grounded in published FAQs.
 *
 * The instruction is narrow on purpose. The model is given the approved
 * answers and told to work only from them, because the one thing it must never
 * do is answer from its own knowledge — it has no reliable knowledge of this
 * project, and none at all of Warli or Katkari.
 *
 * Language questions never reach this function: they terminate in the database
 * before the chat route gets here.
 */
export async function answerFromFaqs(options: {
  model: string;
  question: string;
  locale: string;
  maxWords: number;
  faqs: { question: string; answer: string }[];
}): Promise<SarvamResult<string>> {
  const language = LANGUAGE_NAMES[options.locale] ?? "English";

  const context = options.faqs
    .map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`)
    .join("\n");

  const system = [
    "You answer questions about the Bhasha Setu website using ONLY the",
    "approved answers below. Do not use any other knowledge.",
    "",
    "If the approved answers do not cover the question, reply with exactly:",
    "NO_ANSWER",
    "",
    "Never invent or translate Warli or Katkari words, phrases or",
    "pronunciations. Bhasha Setu is not a translator.",
    "",
    `Reply in ${language}, in at most ${options.maxWords} words, in plain`,
    "sentences with no markdown.",
    "",
    "APPROVED ANSWERS:",
    context,
  ].join("\n");

  const path = chatPathFor(options.model);
  if (!path) {
    return {
      ok: false,
      status: null,
      detail: `Unknown model "${options.model}".`,
    };
  }

  const result = await call(
    path,
    {
      model: options.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: options.question },
      ],
      temperature: 0.2,
      max_tokens: Math.ceil(options.maxWords * 2.5),
    },
    "json"
  );

  if (!result.ok) return result;

  const body = result.value as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    return { ok: false, status: null, detail: "No answer in the response." };
  }
  if (text.toUpperCase().includes("NO_ANSWER")) {
    return { ok: false, status: null, detail: "NO_ANSWER" };
  }

  return { ok: true, value: text };
}

/**
 * Read an approved answer aloud.
 *
 * The caller passes text that came out of the database, never anything a
 * visitor typed and never a Warli or Katkari word — see the speak route, which
 * looks the text up itself rather than accepting it, so that this cannot be
 * used to make a synthetic voice guess at a pronunciation it has never heard.
 */
export async function speak(options: {
  text: string;
  voice: string;
  locale: string;
}): Promise<SarvamResult<string>> {
  const result = await call(
    TTS_PATH,
    {
      text: options.text.slice(0, TTS_MAX_CHARS),
      language_code:
        options.locale === "hi" ? "hi-IN" : options.locale === "mr" ? "mr-IN" : "en-IN",
      speaker: options.voice,
      model: "bulbul:v3",
    },
    "audio"
  );

  if (!result.ok) return result;

  // Base64 audio, which the browser plays from a data: URL without the bytes
  // needing to pass through storage. Sarvam has returned this under both
  // `audios` and `audio`; either is accepted rather than guessing.
  const body = result.value as { audios?: string[]; audio?: string };
  const audio = body?.audios?.[0] ?? body?.audio;

  if (!audio) {
    return { ok: false, status: null, detail: "No audio in the response." };
  }
  return { ok: true, value: audio };
}

/** One minimal call, for the Back Office connection test. */
export async function ping(model: string): Promise<SarvamResult<string>> {
  const path = chatPathFor(model);
  if (!path) {
    return { ok: false, status: null, detail: `Unknown model "${model}".` };
  }

  const result = await call(
    path,
    {
      model,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      max_tokens: 5,
    },
    "json"
  );

  if (!result.ok) return result;
  const body = result.value as { choices?: { message?: { content?: string } }[] };
  return {
    ok: true,
    value: body?.choices?.[0]?.message?.content?.trim() ?? JSON.stringify(body).slice(0, 200),
  };
}
