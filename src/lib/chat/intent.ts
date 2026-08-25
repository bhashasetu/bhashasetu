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
  /^what\s+(?:does|is)\s+(?:the\s+)?(?:word\s+)?["']?(.+?)["']?\s+mean(?:\s+in\s+\w+)?\??$/i,
  /^what\s+is\s+(?:the\s+)?(?:meaning\s+of\s+)?["']?(.+?)["']?(?:\s+in\s+\w+)?\??$/i,
  /^how\s+do\s+(?:you|i|we)\s+say\s+["']?(.+?)["']?\s+in\s+\w+\??$/i,
  /^how\s+to\s+say\s+["']?(.+?)["']?\s+in\s+\w+\??$/i,
  /^meaning\s+of\s+["']?(.+?)["']?\??$/i,
  /^(?:the\s+)?(?:warli|katkari)\s+(?:word\s+)?for\s+["']?(.+?)["']?\??$/i,
  /^["']?(.+?)["']?\s+in\s+(?:warli|katkari)\??$/i,
  // Hindi and Marathi: "X का अर्थ", "X म्हणजे काय"
  /^["']?(.+?)["']?\s*(?:का\s*(?:अर्थ|मतलब))\s*(?:क्या\s*है)?\??$/i,
  /^["']?(.+?)["']?\s*म्हणजे\s*काय\??$/i,
];

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
  options: { mentionsKnownEntry?: boolean } = {}
): Routed {
  const text = normalise(message);
  if (!text) return { intent: "unsupported" };

  const lower = text.toLowerCase();

  // 1. A wrapper we recognise: pull the term out of the sentence.
  for (const pattern of LOOKUP_WRAPPERS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { intent: "word_lookup", term: normalise(match[1]) };
    }
  }

  // 2. Names either language: a language question however it is phrased.
  if (LANGUAGE_MENTIONS.some((name) => lower.includes(name))) {
    // Strip the language name so what is left can be searched.
    let term = text;
    for (const name of LANGUAGE_MENTIONS) {
      term = term.replace(new RegExp(name, "gi"), " ");
    }
    term = normalise(term.replace(/\b(in|the|word|for|say|how|do|you|i|what|is|does|mean)\b/gi, " "))
      .replace(/[?."']/g, "")
      .trim();
    return { intent: "word_lookup", term: term || text };
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
