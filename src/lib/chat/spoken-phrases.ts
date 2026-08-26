/**
 * The only sentences Bulbul is allowed to say that are not stored content.
 *
 * The speak route refuses free text on purpose: give a synthetic voice a Warli
 * word and it applies Hindi phonetics and produces something confidently wrong
 * that a learner cannot detect. That rule does not change here. What changes is
 * that a caller may now name one of these fixed phrases by its key, and the
 * server supplies the words — exactly as it already does for a FAQ id.
 *
 * So the surface stays closed: a caller can ask for "the greeting", never for
 * "say this". Nothing in this file contains a Warli or Katkari word, and
 * nothing ever should.
 *
 * These are interface phrases rather than editorial content — the spoken
 * equivalent of a placeholder or a button label — so they live in code
 * (CLAUDE.md section 4). If an editor ever needs to change their wording, they
 * move to chat_config alongside the persona.
 */

export type SpokenPhrase = "call_open" | "not_found";

const PHRASES: Record<SpokenPhrase, Record<string, string>> = {
  /**
   * When the collection has nothing. The conversation continues rather than
   * ending in silence, and it does not guess at a word.
   */
  not_found: {
    en: "I could not find that one in our collection. Try another word or phrase.",
    hi: "यह हमारे संग्रह में नहीं मिला। कोई और शब्द या वाक्य आज़माइए।",
    mr: "ते आमच्या संग्रहात सापडलं नाही. दुसरा शब्द किंवा वाक्य वापरून पहा.",
  },

  /**
   * What the assistant says when a visitor starts a spoken conversation:
   * hello, and then the question that hands the turn back to them.
   *
   * One clip rather than two. It is one utterance to a listener, and it is also
   * one billed call instead of two.
   */
  call_open: {
    en: "Namaste! I am My BhashaSetu. Which Warli or Katkari word or phrase would you like to learn?",
    hi: "नमस्ते! मैं माय भाषा सेतु हूँ। आप वारली या कातकरी का कौन सा शब्द या वाक्य सीखना चाहेंगे?",
    mr: "नमस्कार! मी माय भाषा सेतू आहे. तुम्हाला वारली किंवा कातकरी मधला कोणता शब्द किंवा वाक्य शिकायचं आहे?",
  },
};

/**
 * What the assistant says just before a recording plays.
 *
 * Built from the language name and the English or Hindi meaning — both of which
 * are ordinary text in a language Bulbul speaks. The Warli or Katkari word
 * itself is never in this sentence: the recording says it, in the voice of
 * someone who speaks it. That is the whole point of the two clips.
 */
export function introducing(options: {
  language: string | null;
  meaning: string | null;
  locale: string;
}): string {
  const language = options.language ?? "this language";
  const meaning = options.meaning?.trim();

  if (options.locale === "hi") {
    return meaning
      ? `${language} में, "${meaning}" ऐसे कहते हैं।`
      : `${language} में यह ऐसे कहते हैं।`;
  }
  if (options.locale === "mr") {
    return meaning
      ? `${language} मध्ये, "${meaning}" असं म्हणतात.`
      : `${language} मध्ये हे असं म्हणतात.`;
  }
  return meaning
    ? `In ${language}, "${meaning}" is said like this.`
    : `In ${language}, it is said like this.`;
}

export function isSpokenPhrase(value: unknown): value is SpokenPhrase {
  return typeof value === "string" && value in PHRASES;
}

/** The words for a phrase, falling back to English where a locale has none. */
export function spokenPhrase(key: SpokenPhrase, locale: string): string {
  const byLocale = PHRASES[key];
  return byLocale[locale] ?? byLocale.en;
}
