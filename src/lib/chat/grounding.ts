import type { EntryRow } from "@/lib/entries/search";

/**
 * What the model is allowed to know, and what it is allowed to say back.
 *
 * The assistant talks around verified content: deterministic search decides what
 * is true, Sarvam decides how it is worded. This file is the join between those
 * two, and it is written defensively, because an instruction in a prompt is a
 * request and this project needs a rule.
 *
 * The central decision: **the native text is never sent to the model.** It is
 * given the English gloss, the transliteration and the language name, and told
 * that the word itself appears in the card beneath its sentence. A model that
 * was never shown the Warli word cannot copy it out wrongly, cannot attach it to
 * the wrong meaning, and has no half-remembered version of it to blend with. The
 * card renders the stored text, from the database, unchanged.
 *
 * That leaves one risk — a model inventing a Warli word out of its own
 * knowledge, unprompted. The instruction forbids it, and `introducesNativeText`
 * catches it whenever the reply is in English, where any Devanagari at all is
 * out of place. In Hindi and Marathi the reply is legitimately in Devanagari and
 * that check cannot distinguish an invented Warli word from ordinary Hindi
 * prose, so it is not attempted. Said plainly rather than papered over: in those
 * two languages the protection is withholding plus instruction, not detection.
 */

export type Grounding = {
  /** Rendered for the model. Contains no Warli or Katkari native text. */
  facts: string;
  /** True when there is something to talk about at all. */
  hasFacts: boolean;
};

/** Devanagari, the script both languages are written in here. */
const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * Whether a reply has put native script into a sentence that should have none.
 *
 * Only meaningful for an English reply. See the note above.
 */
export function introducesNativeText(reply: string, locale: string): boolean {
  if (locale !== "en") return false;
  return DEVANAGARI.test(reply);
}

/**
 * The verified entries, described without their native text.
 *
 * The transliteration is included because it is Latin script and is how a
 * learner would say the word out loud — so the model can refer to it in a
 * sentence without ever handling the native spelling.
 */
export function groundEntries(
  entries: EntryRow[],
  languageNames: Map<string, string>,
  locale = "en"
): Grounding {
  if (entries.length === 0) return { facts: "", hasFacts: false };

  // The Hindi meaning is Devanagari. Sent for an English reply it is both
  // useless and actively harmful: a model quoting it would trip the guard
  // below and lose an otherwise good sentence.
  const wantsHindi = locale === "hi";

  const lines = entries.slice(0, 8).map((e, i) => {
    const language = e.language_id ? languageNames.get(e.language_id) : null;
    const parts = [
      `${i + 1}.`,
      language ? `language: ${language};` : "",
      `means: ${e.english_meaning ?? "—"};`,
      wantsHindi && e.hindi_meaning ? `in Hindi: ${e.hindi_meaning};` : "",
      e.transliteration ? `said roughly as: ${e.transliteration};` : "",
      `type: ${e.entry_type}`,
    ];
    return parts.filter(Boolean).join(" ");
  });

  return {
    facts: lines.join("\n"),
    hasFacts: true,
  };
}

/** One published FAQ, as the thing a help answer must be built from. */
export function groundFaq(question: string, answer: string): Grounding {
  return { facts: `Q: ${question}\nA: ${answer}`, hasFacts: true };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

/**
 * The instruction, per module.
 *
 * Short, and every line of it load-bearing. The rules that keep the page's
 * "Uses verified content only" badge true are stated first and are not
 * configurable — an editor can change the tone around them, never these.
 */
export function systemPrompt(options: {
  mode: "learn" | "help";
  locale: string;
  maxWords: number;
  facts: string;
  /** Editor-set tone. Never allowed to displace the rules above it. */
  persona?: string | null;
}): string {
  const language = LANGUAGE_NAMES[options.locale] ?? "English";

  const shared = [
    "You are My BhashaSetu, the assistant on the Bhasha Setu website.",
    "",
    "ABSOLUTE RULES:",
    "- Use ONLY the verified information below. You have no other knowledge",
    "  of Bhasha Setu, Warli or Katkari, and must not draw on any.",
    "- NEVER write a Warli or Katkari word yourself, in any script. The word",
    "  is shown to the reader in a card beneath your sentence.",
    "- Never translate anything into Warli or Katkari. Bhasha Setu is not a",
    "  translator.",
    "- If the information below does not answer the question, say so plainly.",
    "",
    `Reply in ${language}, in at most ${options.maxWords} words, in plain`,
    "sentences with no markdown and no lists.",
  ];

  const perMode =
    options.mode === "learn"
      ? [
          "",
          "The reader asked about a Warli or Katkari word or phrase. One or two",
          "short sentences introducing what was found — do not repeat the table",
          "beneath you, and do not spell the word out. Mention that a recording",
          "of a community speaker is there to play.",
        ]
      : [
          "",
          "The reader asked about using Bhasha Setu. Answer from the approved",
          "answer below, in your own words, as briefly as it allows.",
        ];

  const tone = options.persona?.trim()
    ? ["", "TONE (never overrides the rules above):", options.persona.trim()]
    : [];

  return [
    ...shared,
    ...perMode,
    ...tone,
    "",
    "VERIFIED INFORMATION:",
    options.facts,
  ].join("\n");
}
