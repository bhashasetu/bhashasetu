import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  faqInLocale,
  getPublishedFaqs,
  groupByCategory,
  isFaqLocale,
} from "@/lib/faq/queries";

export const dynamic = "force-dynamic";

/**
 * Frequently asked questions.
 *
 * These used to be five entries hardcoded in this component, which meant an
 * editor could not change an answer and the assistant had no approved help
 * content to retrieve at all. Both now read the same published rows, so the
 * page and My BhashaSetu cannot tell a visitor different things.
 *
 * ?lang=hi or ?lang=mr renders the same answers in that language, falling back
 * to English for anything not yet written. A query parameter rather than
 * client state so each language is a real, shareable, crawlable URL.
 */
export default async function FAQPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const raw = params.lang;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const locale = isFaqLocale(requested) ? requested : "en";

  const faqs = await getPublishedFaqs(supabase);
  const groups = groupByCategory(faqs);

  const langHref = (code: string) =>
    code === "en" ? "/faq" : `/faq?lang=${code}`;

  return (
    <main className="faq-page">
      <h1>Frequently asked questions</h1>

      <nav className="faq-langs" aria-label="Language">
        {[
          ["en", "English"],
          ["hi", "हिन्दी"],
          ["mr", "मराठी"],
        ].map(([code, label]) => (
          <Link
            key={code}
            href={langHref(code)}
            className={
              locale === code ? "faq-langs__link is-current" : "faq-langs__link"
            }
            aria-current={locale === code ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className="faq-empty">
          No questions have been published yet.
        </p>
      ) : (
        groups.map((group) => (
          <section className="faq-group" key={group.category}>
            <h2>{group.label}</h2>
            <dl>
              {group.faqs.map((faq) => {
                const { question, answer, translated } = faqInLocale(faq, locale);
                return (
                  <div className="faq-item" key={faq.id} id={faq.slug}>
                    <dt>{question}</dt>
                    <dd>
                      {answer}
                      {!translated && (
                        // Honest rather than silent: this answer has not been
                        // written in the chosen language yet.
                        <span className="faq-item__fallback">
                          {" "}
                          (English)
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))
      )}

      <p className="faq-back">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
