import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FAQ_COLUMNS,
  faqInLocale,
  type FaqLocale,
  type FaqRow,
} from "@/lib/faq/queries";

/**
 * Matching a visitor's question to a published answer, without a model.
 *
 * The cascade mirrors the one used for learning entries: try the certain match
 * first, stop at the first hit, and end with an honest miss rather than a
 * guess. What makes it work in practice is the alias list — "is it free" and
 * "how much does it cost" are one question, and an editor adds the second
 * phrasing in seconds from the unanswered list.
 */

export type FaqAnswer = {
  faq: FaqRow;
  question: string;
  answer: string;
  /** False when the chosen language has no answer written and English is shown. */
  translated: boolean;
  matchedOn: "alias" | "question" | "keyword";
};

/** Words too common to carry meaning in a short question. */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "it", "do", "does", "i", "you", "we", "to", "of",
  "in", "on", "for", "and", "or", "can", "how", "what", "where", "when",
  "why", "this", "that", "my", "me", "your", "are", "be", "have", "has",
]);

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:"'“”‘’()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(text: string): string[] {
  return normalise(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export async function matchFaq(
  supabase: SupabaseClient,
  message: string,
  locale: FaqLocale
): Promise<FaqAnswer | null> {
  const asked = normalise(message);
  if (!asked) return null;

  const { data } = await supabase
    .from("chat_faqs")
    .select(FAQ_COLUMNS)
    .eq("status", "published")
    .order("display_order", { ascending: true });

  const faqs = (data ?? []) as unknown as FaqRow[];
  if (faqs.length === 0) return null;

  const shape = (faq: FaqRow, matchedOn: FaqAnswer["matchedOn"]): FaqAnswer => ({
    faq,
    ...faqInLocale(faq, locale),
    matchedOn,
  });

  // 1. An exact phrasing an editor has already recorded. Aliases come first
  //    because they are the deliberate, human-curated signal.
  const { data: aliasRows } = await supabase
    .from("chat_faq_aliases")
    .select("faq_id, alias")
    .eq("locale", locale);

  for (const row of aliasRows ?? []) {
    if (normalise(row.alias) === asked) {
      const faq = faqs.find((f) => f.id === row.faq_id);
      if (faq) return shape(faq, "alias");
    }
  }

  // 2. The question itself, in any of the three languages — someone who
  //    switched language mid-conversation still gets an answer.
  for (const faq of faqs) {
    for (const q of [faq.question_en, faq.question_hi, faq.question_mr]) {
      if (q && normalise(q) === asked) return shape(faq, "question");
    }
  }

  // 3. Overlapping keywords, scored. Deliberately strict: a weak match that
  //    confidently answers the wrong question is worse than admitting a miss,
  //    because the miss is what puts the phrasing in front of an editor.
  let best: { faq: FaqRow; score: number } | null = null;
  const asking = keywords(message);
  if (asking.length > 0) {
    // "is it free" leaves one content word once the stop words are gone, and
    // it is among the commonest phrasings there is. A short question must
    // therefore match on all of its words rather than on two of them.
    const minHits = asking.length <= 2 ? asking.length : 2;
    for (const faq of faqs) {
      const haystack = new Set([
        ...keywords(faq.question_en),
        ...keywords(faq.question_hi ?? ""),
        ...keywords(faq.question_mr ?? ""),
        ...(aliasRows ?? [])
          .filter((a) => a.faq_id === faq.id)
          .flatMap((a) => keywords(a.alias)),
      ]);
      const hits = asking.filter((w) => haystack.has(w)).length;
      const score = hits / asking.length;
      if (hits >= minHits && score >= 0.5 && (!best || score > best.score)) {
        best = { faq, score };
      }
    }
  }

  return best ? shape(best.faq, "keyword") : null;
}

/**
 * Record a question nothing answered.
 *
 * The only user text stored anywhere, and the reason the alias list improves by
 * evidence rather than guesswork. A failure here is swallowed: not being able
 * to log a miss is no reason to fail the visitor's request.
 */
export async function recordUnanswered(
  supabase: SupabaseClient,
  message: string,
  locale: FaqLocale
): Promise<void> {
  await supabase
    .from("chat_unanswered")
    .insert({ query_text: message.slice(0, 500), locale })
    .then(
      () => undefined,
      () => undefined
    );
}
