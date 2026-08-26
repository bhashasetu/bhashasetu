import { SarvamAIClient } from "sarvamai";

/**
 * The only file that talks to Sarvam.
 *
 * It used to hand-roll the HTTP calls against pasted documentation, which meant
 * guessing which endpoint served which model and which field the audio came
 * back in. This uses Sarvam's own client instead, so the request shapes are the
 * contract rather than a reconstruction of it — and the guesses it removed were
 * real: the chat client accepts sarvam-105b and nothing else, so the
 * "conversations" variant this project was about to offer had no endpoint here
 * at all.
 *
 * Two client defaults are overridden deliberately, and both matter:
 *
 *  - maxRetries: 0. The SDK retries 429s and 5xxs with backoff. Every call from
 *    this file is billed, and the assistant has a correct answer without any of
 *    them — the stored one. A provider having a bad minute must not become a
 *    bill, so a failure here falls through to the database rather than being
 *    tried again.
 *
 *  - The key is read at call time from the server environment and never held in
 *    a module-level client, so a build that starts before the environment is
 *    populated cannot capture an empty one.
 */

/** Beyond this, a slow provider is a failure rather than a wait. */
const TIMEOUT_SECONDS = 12;

/** Speech takes longer than text: upload, decode, transcribe. */
const TRANSCRIBE_TIMEOUT_SECONDS = 25;

export type SarvamResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number | null; detail: string };

function clientOrNull(): SarvamAIClient | null {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!key) return null;
  return new SarvamAIClient({
    apiSubscriptionKey: key,
    maxRetries: 0,
    timeoutInSeconds: TIMEOUT_SECONDS,
  });
}

/**
 * Whatever went wrong, in a form the Back Office can show.
 *
 * Sarvam answers an invalid key with 403 rather than 401, which reads as a
 * network block unless it is named — so it is named. The provider's own message
 * is passed through because the only place it is ever shown is the admin test
 * screen; a visitor sees none of this.
 */
function failure(err: unknown): { ok: false; status: number | null; detail: string } {
  const e = err as { statusCode?: number; body?: unknown; message?: string };
  const status = typeof e?.statusCode === "number" ? e.statusCode : null;

  if (status === 403) {
    return {
      ok: false,
      status,
      detail: "Rejected the key (Sarvam returns 403, not 401, for a bad key).",
    };
  }

  const body =
    typeof e?.body === "string" ? e.body : e?.body ? JSON.stringify(e.body) : "";
  return {
    ok: false,
    status,
    detail: (body || e?.message || "Request failed").slice(0, 500),
  };
}

const NO_KEY = {
  ok: false as const,
  status: null,
  detail: "SARVAM_API_KEY is not set.",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

/** Our three locales in the BCP-47 form every Sarvam endpoint expects. */
function bcp47(locale: string): "en-IN" | "hi-IN" | "mr-IN" {
  return locale === "hi" ? "hi-IN" : locale === "mr" ? "mr-IN" : "en-IN";
}

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
  const client = clientOrNull();
  if (!client) return NO_KEY;

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

  try {
    const res = await client.chat.completions({
      model: options.model as "sarvam-105b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: options.question },
      ],
      temperature: 0.2,
      max_tokens: Math.ceil(options.maxWords * 2.5),
    });

    const choice = res.choices?.[0];
    const text =
      typeof choice?.message?.content === "string"
        ? choice.message.content.trim()
        : "";

    if (!text) {
      return { ok: false, status: null, detail: "No answer in the response." };
    }
    if (text.toUpperCase().includes("NO_ANSWER")) {
      return { ok: false, status: null, detail: "NO_ANSWER" };
    }
    return { ok: true, value: text };
  } catch (err) {
    return failure(err);
  }
}

/**
 * Put verified content into a sentence.
 *
 * The facts are already decided — deterministic search found them — so this is
 * a wording job, and the prompt says as much. History is included so follow-ups
 * work ("give me another", "say that again"); it is capped by the caller and
 * held only in the visitor's browser, so no conversation is stored anywhere.
 *
 * A failure here is not an error the visitor sees. The caller falls back to the
 * card and the stored answer, which were correct before a model was involved
 * and remain correct without one.
 */
export async function phrase(options: {
  model: string;
  system: string;
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  maxWords: number;
}): Promise<SarvamResult<string>> {
  const client = clientOrNull();
  if (!client) return NO_KEY;

  try {
    const res = await client.chat.completions({
      model: options.model as "sarvam-105b",
      messages: [
        { role: "system", content: options.system },
        ...options.history,
        { role: "user", content: options.question },
      ],
      temperature: 0.3,
      max_tokens: Math.ceil(options.maxWords * 2.5),
    });

    const content = res.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) {
      return { ok: false, status: null, detail: "Empty reply." };
    }
    return { ok: true, value: text };
  } catch (err) {
    return failure(err);
  }
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
  const client = clientOrNull();
  if (!client) return NO_KEY;

  try {
    const res = await client.textToSpeech.convert({
      // bulbul:v3's limit. Answers are 40-60 words, so this is slack rather
      // than a constraint anyone will meet.
      text: options.text.slice(0, 2500),
      language_code: bcp47(options.locale),
      speaker: options.voice as "priya",
      model: "bulbul:v3",
    });

    const audio = res.audios?.[0];
    if (!audio) {
      return { ok: false, status: null, detail: "No audio in the response." };
    }
    return { ok: true, value: audio };
  } catch (err) {
    return failure(err);
  }
}

/**
 * Turn a spoken question into text.
 *
 * `transcribe`, never `translate`. The translate mode would turn a Hindi
 * question into English before it reached the search — and the Hindi meanings
 * in the collection are stored in Devanagari, so a translated question would
 * miss entries that are sitting right there.
 *
 * The result is not sent anywhere on its own. It goes into the visitor's text
 * box for them to read and correct, because Sarvam has no Warli or Katkari
 * model: a spoken native word comes back as approximate Devanagari, and a
 * transcript the visitor can see is a transcript they can fix.
 */
export async function transcribe(options: {
  audio: Blob;
  locale: string;
}): Promise<SarvamResult<{ text: string; detectedLocale: string | null }>> {
  const client = clientOrNull();
  if (!client) return NO_KEY;

  try {
    const res = await client.speechToText.transcribe(
      {
        file: options.audio,
        model: "saaras:v3",
        mode: "transcribe",
        /**
         * Auto-detect, rather than the language chip.
         *
         * The chip was used here, on the reasoning that the visitor had
         * already told us their language. They had not: the chip says which
         * language they want ANSWERS in, not which one they are speaking. A
         * visitor reading Hindi asked a question in English, Sarvam was told
         * the audio was Hindi, and it wrote English words in Devanagari —
         * "से हाउ आर यू इन वार्ली" — which then searched the collection and
         * of course found nothing.
         *
         * Detection is what the endpoint is for, and it returns what it heard
         * so the caller can see it.
         */
        language_code: "unknown",
      },
      { timeoutInSeconds: TRANSCRIBE_TIMEOUT_SECONDS }
    );

    const text = res.transcript?.trim();
    if (!text) {
      return { ok: false, status: null, detail: "Nothing was heard." };
    }
    return {
      ok: true,
      value: { text, detectedLocale: res.language_code ?? null },
    };
  } catch (err) {
    return failure(err);
  }
}

/** One minimal call, for the Back Office connection test. */
export async function ping(model: string): Promise<SarvamResult<string>> {
  const client = clientOrNull();
  if (!client) return NO_KEY;

  try {
    const res = await client.chat.completions({
      model: model as "sarvam-105b",
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      max_tokens: 5,
    });
    const content = res.choices?.[0]?.message?.content;
    return {
      ok: true,
      value:
        typeof content === "string" && content.trim()
          ? content.trim()
          : JSON.stringify(res).slice(0, 200),
    };
  } catch (err) {
    return failure(err);
  }
}
