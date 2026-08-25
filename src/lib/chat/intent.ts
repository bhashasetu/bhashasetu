/**
 * Deciding what kind of question this is, before anything else runs.
 *
 * The two things the assistant does need entirely different machinery, and one
 * of them must never reach a language model. Routing here — in ordinary code,
 * against ordinary rules — is what makes that structural rather than a promise
 * in a prompt. A model asked to classify would cost a call per message, add
 * latency before any work happened, and could be talked out of its answer by
 * the message it was classifying.
 *
 * The errors are deliberately asymmetric. A help question misrouted to word
 * lookup returns "not found", which is annoying. A word question misrouted to
 * help could reach a model and come back with invented Warli, which is the one
 * outcome this project cannot allow. So anything that smells like a language
 * question goes to lookup and stops there, even at the cost of false positives.
 */

export type Intent = "word_lookup" | "platform_help" | "unsupported";

/**
 * Which module the visitor is in.
 *
 * My BhashaSetu is two things, and the visitor says which one they want by
 * choosing a module rather than by phrasing a sentence a certain way. That
 * removes the guessing below from the common case entirely: in Learn every
 * message is a language question, in Help every message is about the site.
 *
 * The rules that follow still run, because they extract the term out of the
 * sentence — but they no longer have to infer intent from it.
 */
export type ChatMode = "learn" | "help";

export type Routed = {
  intent: Intent;
  /** For word_lookup, the term to search for once the question is stripped. */
  term?: string;
};

/** Mentions of the two languages, in the scripts people actually type. */
const LANGUAGE_MENTIONS = [
  "warli",
  "varli",
  "katkari",
  "kathkari",
  "वारली",
  "वारलि",
  "कातकरी",
  "कातकरि",
];

/**
 * Wrappers people put around a word they want the meaning of. Ordered longest
 * first so "what does X mean in warli" strips fully rather than leaving "in
 * warli" behind.
 */
const LOOKUP_WRAPPERS: RegExp[] = [
  // First, because it is the most specific: "what is the warli word for rice"
  // also matches the generic "what is X" below, which would capture the whole
  // of "warli word for rice" as the thing to search for.
  /^(?:what(?:'s|\s+is)\s+)?(?:the\s+)?(?:warli|katkari)\s+(?:word|phrase|term)\s+for\s+["']?(.+?)["']?\??$/i,
  /^what\s+(?:does|is)\s+(?:the\s+)?(?:word\s+)?["']?(.+?)["']?\s+mean(?:\s+in\s+\w+)?\??$/i,
  /^what\s+is\s+(?:the\s+)?(?:meaning\s+of\s+)?["']?(.+?)["']?(?:\s+in\s+\w+)?\??$/i,
  /^how\s+(?:do|would)\s+(?:you|i|we)\s+say\s+["']?(.+?)["']?(?:\s+in\s+\w+)?\??$/i,
  /^how\s+to\s+say\s+["']?(.+?)["']?(?:\s+in\s+\w+)?\??$/i,
  /^(?:can\s+you\s+)?(?:please\s+)?(?:tell\s+me\s+)?(?:the\s+)?(?:word|phrase)\s+for\s+["']?(.+?)["']?(?:\s+in\s+\w+)?\??$/i,
  /^say\s+["']?(.+?)["']?\s+in\s+\w+\??$/i,
  /^meaning\s+of\s+["']?(.+?)["']?\??$/i,
  /^["']?(.+?)["']?\s+in\s+(?:warli|katkari)\??$/i,

  // Hindi and Marathi. These are how a student in Palghar or Raigad actually
  // types the question, and none of them were recognised before.
  //   "X का अर्थ क्या है"      "X म्हणजे काय"
  //   "X को कातकरी में क्या कहते हैं"
  //   "कातकरी में X कैसे कहते हैं"
  /^["']?(.+?)["']?\s*(?:का\s*(?:अर्थ|मतलब))\s*(?:क्या\s*है)?\s*\??$/i,
  /^["']?(.+?)["']?\s*म्हणजे\s*काय\s*\??$/i,
  /^["']?(.+?)["']?\s*(?:को|ला)?\s*(?:वारली|कातकरी)\s*(?:में|मध्ये)\s*(?:क्या|काय)?\s*(?:कहते|कहेंगे|बोलते|म्हणतात)\s*(?:हैं|है)?\s*\??$/i,
  /^(?:वारली|कातकरी)\s*(?:में|मध्ये)\s*["']?(.+?)["']?\s*(?:कैसे|कसं|कसे)\s*(?:कहते|बोलते|म्हणतात)\s*(?:हैं|है)?\s*\??$/i,
];

/**
 * The question with its wrapper removed, or null if none was recognised.
 *
 * Worth its own export because Learn mode needs the term whether or not the
 * shape of the sentence told us anything about intent — the module already did.
 */
export function stripFrame(message: string): string | null {
  const text = normalise(message);
  for (const pattern of LOOKUP_WRAPPERS) {
    const match = text.match(pattern);
    if (match?.[1]) return normalise(match[1]);
  }
  return null;
}

/**
 * What is left of a message once the scaffolding is gone.
 *
 * A last resort, used only when the message names one of the languages but
 * matches no wrapper — "warli word rice", say. It is deliberately not applied
 * to a bare phrase: stripping small words out of "I'm fine" or "what is your
 * name" destroys the very thing being looked up.
 */
function bareTerm(text: string): string {
  let term = text;
  for (const name of LANGUAGE_MENTIONS) {
    term = term.replace(new RegExp(name, "gi"), " ");
  }
  term = term
    // The lookahead keeps contractions intact. Without it "I'm fine" loses its
    // "I" to the stop-word list and becomes "m fine", which matches nothing.
    .replace(
      /\b(in|the|a|an|word|phrase|for|say|said|how|do|does|you|i|we|what|is|are|mean|means|tell|me|please|can|would)\b(?!['’])/gi,
      " "
    )
    .replace(/\s(में|मध्ये|का|की|के|को|ला|क्या|काय|कैसे|कसं|कसे|कहते|बोलते|म्हणतात|हैं|है|अर्थ|मतलब|म्हणजे)\s/g, " ")
    .replace(/[?।."']/g, " ");
  return normalise(term).trim();
}

/** Phrases that are asking about the platform, not about a word. */
const HELP_MARKERS = [
  "how do i use",
  "how to use",
  "how does this",
  "is it free",
  "cost",
  "price",
  "download",
  "app",
  "android",
  "privacy",
  "who made",
  "who built",
  "contact",
  "sign up",
  "account",
  "offline",
  "what is bhasha setu",
  "what can you do",
];

/**
 * Requests for a translation of something we could not have collected.
 *
 * These arrive constantly and are the highest-risk input the assistant takes:
 * a model would answer them fluently and wrongly. They route to word_lookup so
 * they terminate in the database, where a sentence will simply not be found.
 */
function looksLikeSentence(term: string): boolean {
  return term.trim().split(/\s+/).length > 4;
}

function normalise(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

/**
 * Classify one message.
 *
 * `knownTerm` is supplied by the caller and answers "is this string in the
 * learning collection?" — a cheap indexed lookup. It lets a bare word typed on
 * its own ("tandul") route to lookup without any guessing.
 */
export function routeIntent(
  message: string,
  options: { mentionsKnownEntry?: boolean; mode?: ChatMode } = {}
): Routed {
  const text = normalise(message);
  if (!text) return { intent: "unsupported" };

  const lower = text.toLowerCase();

  // 0. The visitor already said which module they are in, and that is better
  //    evidence than anything a rule can infer from the sentence. In Learn,
  //    "I'm fine" is a phrase to look up, not an unrecognised help question.
  if (options.mode === "help") return { intent: "platform_help" };
  if (options.mode === "learn") {
    // A message with no recognised wrapper is taken as the phrase itself. In
    // Learn that is almost always right — someone types "I'm fine" — and it is
    // the safest wrong answer too: an over-literal search finds nothing and
    // says so, where an over-trimmed one finds the wrong entry and looks sure.
    const framed = stripFrame(text);
    const namesLanguage = LANGUAGE_MENTIONS.some((name) => lower.includes(name));
    return {
      intent: "word_lookup",
      term: framed || (namesLanguage ? bareTerm(text) || text : text),
    };
  }

  // 1. A wrapper we recognise: pull the term out of the sentence.
  const framed = stripFrame(text);
  if (framed) return { intent: "word_lookup", term: framed };

  // 2. Names either language: a language question however it is phrased.
  if (LANGUAGE_MENTIONS.some((name) => lower.includes(name))) {
    return { intent: "word_lookup", term: bareTerm(text) || text };
  }

  // 3. Recognisably about the platform.
  if (HELP_MARKERS.some((marker) => lower.includes(marker))) {
    return { intent: "platform_help" };
  }

  // 4. A term the collection already knows, typed on its own.
  if (options.mentionsKnownEntry && !looksLikeSentence(text)) {
    return { intent: "word_lookup", term: text.replace(/[?."']/g, "").trim() };
  }

  // 5. Anything else is treated as a help question. Help is the safe default:
  //    its worst case is an unhelpful answer drawn from published content,
  //    where the language route's worst case would be an invented word.
  return { intent: "platform_help" };
}
