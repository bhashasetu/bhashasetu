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

export type SpokenPhrase = "call_open";

const PHRASES: Record<SpokenPhrase, Record<string, string>> = {
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

export function isSpokenPhrase(value: unknown): value is SpokenPhrase {
  return typeof value === "string" && value in PHRASES;
}

/** The words for a phrase, falling back to English where a locale has none. */
export function spokenPhrase(key: SpokenPhrase, locale: string): string {
  const byLocale = PHRASES[key];
  return byLocale[locale] ?? byLocale.en;
}
