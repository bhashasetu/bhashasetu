import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

/**
 * Questions the assistant could not answer.
 *
 * This is the only place a visitor's own words are stored, and it exists for
 * one reason: it is the list of phrasings to add as aliases, or of answers that
 * do not exist yet. Without it the alias list only grows by guesswork.
 *
 * Successful matches are never recorded, and rows are kept for thirty days —
 * which the public FAQ states plainly rather than burying.
 */
export default async function UnansweredPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_unanswered")
    .select("id, query_text, locale, asked_at")
    .order("asked_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  // The same question asked five times is one thing to fix, not five.
  const grouped = new Map<
    string,
    { text: string; locale: string | null; count: number; latest: string }
  >();
  for (const row of rows) {
    const key = `${row.locale ?? ""}:${row.query_text.trim().toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      if (row.asked_at > existing.latest) existing.latest = row.asked_at;
    } else {
      grouped.set(key, {
        text: row.query_text,
        locale: row.locale,
        count: 1,
        latest: row.asked_at,
      });
    }
  }
  const questions = [...grouped.values()].sort(
    (a, b) => b.count - a.count || b.latest.localeCompare(a.latest)
  );

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">Unanswered questions</h2>
          <p className="hp-bar__sub">
            What people asked that nothing matched. Add the phrasing to an
            existing question, or write a new answer.
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/faqs" className="admin-btn admin-btn--ghost">
            Back to Help &amp; FAQ
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="hp-msg hp-msg--error">
          Could not load: {error.message}
        </p>
      )}

      {!error && questions.length === 0 && (
        <section className="admin-card hp-section">
          <p className="admin-page-intro">
            Nothing here. Either every question asked so far has been answered,
            or the assistant is not live yet.
          </p>
        </section>
      )}

      {questions.length > 0 && (
        <section className="admin-card hp-section">
          <p className="admin-page-intro">
            Kept for thirty days, then removed. Only questions that found no
            answer are recorded — never a successful one.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">What they asked</th>
                <th scope="col">Language</th>
                <th scope="col">Times</th>
                <th scope="col">Last asked</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={`${q.locale}:${q.text}`}>
                  <td>{q.text}</td>
                  <td>{q.locale ? (LOCALE_LABELS[q.locale] ?? q.locale) : "—"}</td>
                  <td>{q.count}</td>
                  <td>{new Date(q.latest).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
