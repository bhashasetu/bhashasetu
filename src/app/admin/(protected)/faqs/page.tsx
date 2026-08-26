import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  FAQ_COLUMNS,
  type FaqRow,
} from "@/lib/faq/queries";

export const dynamic = "force-dynamic";

/**
 * Chat help content (CLAUDE.md section 13, module 17 — the chatbot's approved
 * knowledge).
 *
 * These answers serve two surfaces at once: the public FAQ page, and My
 * BhashaSetu's platform-help route. Nothing here is generated — an answer
 * reaches a visitor only because someone wrote it and published it.
 */
export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const category = one("category");
  const status = one("status");

  let query = supabase
    .from("chat_faqs")
    .select(FAQ_COLUMNS)
    .order("display_order", { ascending: true });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);

  const [{ data, error }, { count: unanswered }] = await Promise.all([
    query,
    supabase
      .from("chat_unanswered")
      .select("id", { count: "exact", head: true }),
  ]);

  const faqs = (data ?? []) as unknown as FaqRow[];

  // Counts an editor can act on, all derived — nothing typed in.
  const published = faqs.filter((f) => f.status === "published").length;
  const drafts = faqs.filter((f) => f.status === "draft").length;
  const missingHindi = faqs.filter((f) => !f.answer_hi?.trim()).length;
  const missingMarathi = faqs.filter((f) => !f.answer_mr?.trim()).length;

  const filterHref = (key: string, value: string | null) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, status })) {
      if (v) next.set(k, v);
    }
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return qs ? `/admin/faqs?${qs}` : "/admin/faqs";
  };

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">Help &amp; FAQ</h2>
          <p className="hp-bar__sub">
            The answers My BhashaSetu gives and the FAQ page shows. One record,
            both surfaces.
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/faqs/new" className="admin-btn admin-btn--primary">
            + New question
          </Link>
        </div>
      </div>

      <div className="wp-stats">
        <div className="wp-stat">
          <span className="wp-stat__value">{published}</span>
          <span className="wp-stat__label">Published</span>
        </div>
        <div className="wp-stat">
          <span className="wp-stat__value">{drafts}</span>
          <span className="wp-stat__label">Drafts</span>
        </div>
        <div className="wp-stat">
          <span className="wp-stat__value">{missingHindi}</span>
          <span className="wp-stat__label">No Hindi answer</span>
        </div>
        <div className="wp-stat">
          <span className="wp-stat__value">{missingMarathi}</span>
          <span className="wp-stat__label">No Marathi answer</span>
        </div>
        <div className="wp-stat">
          <span className="wp-stat__value">{unanswered ?? 0}</span>
          <span className="wp-stat__label">
            <Link href="/admin/faqs/unanswered">Unanswered questions</Link>
          </span>
        </div>
      </div>

      <nav className="hp-jump" aria-label="Filter">
        <a href={filterHref("category", null)}>All groups</a>
        {CATEGORY_ORDER.map((c) => (
          <a key={c} href={filterHref("category", c)}>
            {CATEGORY_LABELS[c]}
          </a>
        ))}
        <a href={filterHref("status", "draft")}>Drafts</a>
        <a href={filterHref("status", "published")}>Published</a>
      </nav>

      {error && (
        <p role="alert" className="hp-msg hp-msg--error">
          Could not load help content: {error.message}
        </p>
      )}

      {!error && faqs.length === 0 && (
        <section className="admin-card hp-section">
          <p className="admin-page-intro">
            No questions here yet. Add one, and it will appear on the FAQ page
            and become an answer the assistant can give.
          </p>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="admin-card hp-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Group</th>
                <th scope="col">हिन्दी</th>
                <th scope="col">मराठी</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((faq) => (
                <tr key={faq.id}>
                  <td>
                    <Link href={`/admin/faqs/${faq.id}`}>{faq.question_en}</Link>
                    <span className="admin-table__sub">{faq.slug}</span>
                  </td>
                  <td>{CATEGORY_LABELS[faq.category] ?? faq.category}</td>
                  <td>
                    {faq.answer_hi?.trim() ? (
                      <span className="admin-pill admin-pill--published">Written</span>
                    ) : (
                      <span className="admin-pill admin-pill--draft">Missing</span>
                    )}
                  </td>
                  <td>
                    {faq.answer_mr?.trim() ? (
                      <span className="admin-pill admin-pill--published">Written</span>
                    ) : (
                      <span className="admin-pill admin-pill--draft">Missing</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        faq.status === "published"
                          ? "admin-pill admin-pill--published"
                          : "admin-pill admin-pill--draft"
                      }
                    >
                      {faq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
