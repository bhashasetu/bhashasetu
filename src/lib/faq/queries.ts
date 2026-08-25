import type { SupabaseClient } from "@supabase/supabase-js";
import { faqLocaleValues } from "@/lib/validation/schemas";

/**
 * Reading approved help content.
 *
 * One source for two surfaces: the /faq page and My BhashaSetu's platform-help
 * route. They used to be different things entirely — /faq hardcoded five
 * questions in its own component and the assistant had nothing at all — which
 * guaranteed they would disagree the moment either changed.
 */

export type FaqLocale = (typeof faqLocaleValues)[number];

export type FaqRow = {
  id: string;
  slug: string;
  category: string;
  display_order: number;
  status: string;
  question_en: string;
  answer_en: string;
  question_hi: string | null;
  answer_hi: string | null;
  question_mr: string | null;
  answer_mr: string | null;
};

export const FAQ_COLUMNS =
  "id, slug, category, display_order, status, " +
  "question_en, answer_en, question_hi, answer_hi, question_mr, answer_mr";

/** Reading order on both surfaces, so the two never disagree. */
export const CATEGORY_LABELS: Record<string, string> = {
  about: "About Bhasha Setu",
  using: "Using the site",
  language: "The language content",
  assistant: "My BhashaSetu",
  practical: "Practical",
};

export const CATEGORY_ORDER = [
  "about",
  "using",
  "language",
  "assistant",
  "practical",
] as const;

export function isFaqLocale(value: string | undefined | null): value is FaqLocale {
  return !!value && (faqLocaleValues as readonly string[]).includes(value);
}

/**
 * The question and answer in one language.
 *
 * A locale that has not been written yet falls back to English rather than
 * rendering an empty bubble. The flag says which happened, so a caller can be
 * honest about it instead of silently pretending the translation exists.
 */
export function faqInLocale(
  faq: FaqRow,
  locale: FaqLocale
): { question: string; answer: string; translated: boolean } {
  const question = locale === "hi" ? faq.question_hi : locale === "mr" ? faq.question_mr : null;
  const answer = locale === "hi" ? faq.answer_hi : locale === "mr" ? faq.answer_mr : null;

  if (locale !== "en" && question?.trim() && answer?.trim()) {
    return { question: question.trim(), answer: answer.trim(), translated: true };
  }
  return {
    question: faq.question_en,
    answer: faq.answer_en,
    translated: locale === "en",
  };
}

/** Published FAQs, in the order both surfaces present them. */
export async function getPublishedFaqs(
  supabase: SupabaseClient
): Promise<FaqRow[]> {
  const { data } = await supabase
    .from("chat_faqs")
    .select(FAQ_COLUMNS)
    .eq("status", "published")
    .order("display_order", { ascending: true });

  return (data ?? []) as unknown as FaqRow[];
}

/** Published FAQs grouped by category, empty groups dropped. */
export function groupByCategory(
  faqs: FaqRow[]
): { category: string; label: string; faqs: FaqRow[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    faqs: faqs.filter((f) => f.category === category),
  })).filter((group) => group.faqs.length > 0);
}
