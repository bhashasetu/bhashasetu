import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EntryFilters } from "@/components/admin/EntryFilters";
import {
  EntryDetailPanel,
  isEntryTab,
  type EntryTab,
} from "@/components/admin/EntryDetailPanel";
import { EntryRowActions } from "@/components/admin/EntryRowActions";
import { AdminIcon } from "@/components/admin/AdminShell";
import {
  getEntries,
  getEntryCounts,
  parseEntryFilters,
  relativeTime,
  STATUS_LABELS,
  PAGE_SIZES,
} from "@/lib/entries/queries";
import { getEntryDetail, getActorNames } from "@/lib/entries/detail";

export const dynamic = "force-dynamic";

/**
 * Words & Phrases (ADMIN-02) — the operational list for verified Warli and
 * Katkari vocabulary.
 *
 * Everything on this screen is derived from the database. The approved
 * reference shows sample entries and growth figures; those demonstrate layout,
 * not content, so none of them are seeded (brief sections 12 and 20). With no
 * entries yet the counts read zero and the table shows an empty state, which
 * is the honest picture rather than a broken one.
 */
export default async function WordsAndPhrasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: languages }, { data: categories }] = await Promise.all([
    supabase
      .from("languages")
      .select("id, name")
      .eq("status", "published")
      .order("created_at"),
    supabase
      .from("categories")
      .select("id, name, language_id")
      .neq("status", "archived")
      .order("display_order")
      .order("name"),
  ]);

  const filters = parseEntryFilters(params, {
    languageIds: (languages ?? []).map((l) => l.id),
    categoryIds: (categories ?? []).map((c) => c.id),
  });

  const [counts, page] = await Promise.all([
    getEntryCounts(supabase),
    getEntries(supabase, filters),
  ]);

  const actors = await getActorNames(
    supabase,
    page.rows.map((r) => r.updated_by ?? r.created_by)
  );

  // The panel is URL-driven, so its data arrives with the page rather than
  // through a client fetch, and a given entry is a shareable address.
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const selectedId = one("entry");
  const tab: EntryTab = isEntryTab(one("tab")) ? (one("tab") as EntryTab) : "details";
  const detail = selectedId ? await getEntryDetail(supabase, selectedId) : null;

  /**
   * The current filters as a query string, with overrides applied. Returns
   * "" or "?a=b" — callers prepend their own path, so the same helper serves
   * both in-page links and the export endpoint.
   */
  const queryString = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const value = Array.isArray(v) ? v[0] : v;
      if (value) next.set(k, value);
    }
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `?${qs}` : "";
  };

  const LIST_PATH = "/admin/learning-entries";
  const listHref = (changes: Record<string, string | null>) =>
    `${LIST_PATH}${queryString(changes)}`;

  const totalPages = Math.max(1, Math.ceil(page.total / filters.pageSize));
  const firstShown = page.total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const lastShown = Math.min(filters.page * filters.pageSize, page.total);
  const noCategories = (categories ?? []).length === 0;

  return (
    <div className={`wp-page${detail ? " wp-page--with-panel" : ""}`}>
      <div className="wp-main">
        <div className="hp-bar hp-bar--static">
          <div className="hp-bar__text">
            <h2 className="hp-bar__title">Words &amp; Phrases</h2>
            <p className="hp-bar__sub">
              Manage vocabulary and phrases across Warli and Katkari.
            </p>
          </div>
          <div className="hp-bar__actions">
            <Link
              href="/admin/learning-entries/new"
              className="admin-btn admin-btn--primary"
            >
              + Add New Entry
            </Link>
          </div>
        </div>

        {noCategories && (
          <p className="hp-msg hp-msg--error">
            No categories exist yet, and every entry must be filed under one.{" "}
            <Link href="/admin/categories">Create a category</Link> before adding
            words.
          </p>
        )}

        <div className="wp-stats">
          <StatCard
            label="Total Words"
            value={counts.words}
            tone="words"
            icon="tag"
          />
          <StatCard
            label="Total Phrases"
            value={counts.phrases}
            tone="phrases"
            icon="chat"
          />
          <StatCard
            label="Missing Audio"
            value={counts.missingAudio}
            tone="audio"
            icon="mic"
            note={
              counts.missingAudio > 0
                ? "Verified entries with no recording"
                : undefined
            }
          />
          <StatCard
            label="Draft Items"
            value={counts.drafts}
            tone="draft"
            icon="home"
            note={counts.drafts > 0 ? "Needs review" : undefined}
          />
        </div>

        <EntryFilters
          languages={languages ?? []}
          categories={categories ?? []}
          current={{
            q: filters.q,
            languageId: filters.languageId,
            categoryId: filters.categoryId,
            status: filters.status,
            entryType: filters.entryType,
            audio: filters.audio,
          }}
        />

        <section className="admin-card wp-tablecard">
          <div className="wp-tablecard__top">
            <span className="wp-muted">
              {page.total} {page.total === 1 ? "entry" : "entries"}
            </span>
            <div className="wp-tablecard__actions">
              {/* Rendered in its approved position but inert: no bulk
                  operation in this slice is safe enough to offer, and a
                  control that verifies or removes many rows at once needs
                  care this module does not yet have (brief section 17). */}
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled
                title="Bulk actions are not enabled yet. Entries are changed one at a time so each change is audited."
              >
                Bulk Actions
              </button>
              <a
                className="admin-btn admin-btn--ghost"
                href={`/api/admin/learning-entries/export${queryString({
                  entry: null,
                  tab: null,
                  page: null,
                })}`}
              >
                Export
              </a>
            </div>
          </div>

          {page.rows.length === 0 ? (
            <p className="wp-empty wp-empty--table">
              {page.total === 0 && !filters.q && !filters.status
                ? "No words or phrases yet. Add the first entry to see it here."
                : "No entries match these filters."}
            </p>
          ) : (
            <div className="wp-tablewrap">
              <table className="admin-table wp-table">
                <thead>
                  <tr>
                    <th scope="col">Word / Phrase</th>
                    <th scope="col">Language</th>
                    <th scope="col">Category</th>
                    <th scope="col">English Meaning</th>
                    <th scope="col">Hindi Meaning</th>
                    <th scope="col">Audio</th>
                    <th scope="col">Verified</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.rows.map((entry) => {
                    const hasAudio = page.withAudio.has(entry.id);
                    const actor = actors[entry.updated_by ?? entry.created_by ?? ""];
                    return (
                      <tr key={entry.id}>
                        <td>
                          <Link
                            href={listHref({ entry: entry.id, tab: null })}
                            className="wp-native"
                          >
                            {entry.native_text}
                          </Link>
                          {entry.transliteration && (
                            <div className="wp-muted">({entry.transliteration})</div>
                          )}
                        </td>
                        <td>
                          {entry.language && (
                            <span className="wp-lang">{entry.language.name}</span>
                          )}
                        </td>
                        <td>{entry.category?.name ?? "—"}</td>
                        <td>{entry.english_meaning}</td>
                        <td>{entry.hindi_meaning ?? "—"}</td>
                        <td>
                          {hasAudio ? (
                            <span className="wp-audio-dot" title="Recording attached">
                              ▶
                            </span>
                          ) : (
                            <span
                              className="wp-audio-dot wp-audio-dot--missing"
                              title="No published recording"
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`admin-pill admin-pill--${entry.status}`}>
                            {STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                          {/* Missing audio is orthogonal to the workflow
                              state, so it is a separate indicator rather
                              than a sixth status (brief section 10). */}
                          {!hasAudio &&
                            ["verified", "published"].includes(entry.status) && (
                              <span className="wp-flag">Missing audio</span>
                            )}
                        </td>
                        <td>
                          {relativeTime(entry.updated_at)}
                          {actor && <div className="wp-muted">by {actor}</div>}
                        </td>
                        <td>
                          <EntryRowActions
                            entryId={entry.id}
                            nativeText={entry.native_text}
                            status={entry.status}
                            viewHref={listHref({ entry: entry.id, tab: null })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {page.total > 0 && (
            <div className="wp-pager">
              <span className="wp-muted">
                Showing {firstShown} to {lastShown} of {page.total} entries
              </span>
              <div className="wp-pager__pages">
                {filters.page > 1 && (
                  <Link href={listHref({ page: String(filters.page - 1) })}>
                    ‹ Previous
                  </Link>
                )}
                <span className="wp-muted">
                  Page {filters.page} of {totalPages}
                </span>
                {filters.page < totalPages && (
                  <Link href={listHref({ page: String(filters.page + 1) })}>
                    Next ›
                  </Link>
                )}
              </div>
              <div className="wp-pager__size">
                Rows per page:
                {PAGE_SIZES.map((size) => (
                  <Link
                    key={size}
                    href={listHref({ size: String(size), page: null })}
                    className={size === filters.pageSize ? "is-active" : ""}
                  >
                    {size}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {detail && (
        <EntryDetailPanel
          detail={detail}
          tab={tab}
          closeHref={listHref({ entry: null, tab: null })}
          tabHref={(t) => listHref({ entry: selectedId ?? null, tab: t })}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
  note,
}: {
  label: string;
  value: number;
  tone: string;
  icon: string;
  note?: string;
}) {
  return (
    <div className={`wp-stat wp-stat--${tone}`}>
      <span className="wp-stat__icon" aria-hidden="true">
        <AdminIcon name={icon} size={20} />
      </span>
      <span className="wp-stat__label">{label}</span>
      <span className="wp-stat__value">{value.toLocaleString()}</span>
      {/* The reference shows a growth line such as "+8.2% this month".
          Nothing records historical snapshots, so a real note appears here
          or nothing does — never an invented percentage. */}
      {note && <span className="wp-stat__note">{note}</span>}
    </div>
  );
}
