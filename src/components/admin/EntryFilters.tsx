"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ENTRY_STATUSES, STATUS_LABELS } from "@/lib/entries/queries";

type Option = { id: string; name: string };

/**
 * Search and filter controls for the Words & Phrases list.
 *
 * Filter state lives in the URL rather than component state, so a filtered
 * view is a real address an editor can bookmark or send to a colleague, and
 * the server does the filtering. This mirrors the Stories list rather than
 * introducing a second pattern.
 */
export function EntryFilters({
  languages,
  categories,
  current,
}: {
  languages: Option[];
  /** All categories; narrowed to the chosen language as the user picks. */
  categories: (Option & { language_id: string })[];
  current: {
    q: string;
    languageId?: string;
    categoryId?: string;
    status?: string;
    entryType?: string;
    audio?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [term, setTerm] = useState(current.q);
  const [moreOpen, setMoreOpen] = useState(
    Boolean(current.entryType || current.audio)
  );

  function urlWith(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change invalidates the current page number.
    next.delete("page");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const go = (changes: Record<string, string | null>) =>
    router.push(urlWith(changes));

  const onSelect =
    (key: string) => (e: ChangeEvent<HTMLSelectElement>) =>
      go({ [key]: e.target.value || null });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    go({ q: term || null });
  }

  // Categories are language-scoped, so offering all of them while a language
  // is chosen would list options that can never match.
  const visibleCategories = current.languageId
    ? categories.filter((c) => c.language_id === current.languageId)
    : categories;

  const anyActive = Boolean(
    current.q ||
      current.languageId ||
      current.categoryId ||
      current.status ||
      current.entryType ||
      current.audio
  );

  return (
    <div className="wp-filters">
      <form className="wp-filters__search" onSubmit={onSearch} role="search">
        <label htmlFor="wp-q" className="visually-hidden">
          Search words or phrases
        </label>
        <input
          id="wp-q"
          type="search"
          placeholder="Search words or phrases..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="submit" className="admin-btn admin-btn--ghost">
          Search
        </button>
      </form>

      <div className="wp-filters__field">
        <label htmlFor="wp-language">Language</label>
        <select
          id="wp-language"
          value={current.languageId ?? ""}
          // Changing language can strand a category from the previous one.
          onChange={(e) => go({ language: e.target.value || null, category: null })}
        >
          <option value="">All Languages</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="wp-filters__field">
        <label htmlFor="wp-category">Category</label>
        <select
          id="wp-category"
          value={current.categoryId ?? ""}
          onChange={onSelect("category")}
          disabled={visibleCategories.length === 0}
        >
          <option value="">All Categories</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="wp-filters__field">
        <label htmlFor="wp-status">Verification Status</label>
        <select
          id="wp-status"
          value={current.status ?? ""}
          onChange={onSelect("status")}
        >
          <option value="">All Statuses</option>
          {ENTRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="admin-btn admin-btn--ghost wp-filters__more"
        onClick={() => setMoreOpen((o) => !o)}
        aria-expanded={moreOpen}
      >
        More Filters
      </button>

      {anyActive && (
        <a href={pathname} className="wp-filters__reset">
          Reset
        </a>
      )}

      {moreOpen && (
        <div className="wp-filters__extra">
          <div className="wp-filters__field">
            <label htmlFor="wp-type">Entry type</label>
            <select
              id="wp-type"
              value={current.entryType ?? ""}
              onChange={onSelect("type")}
            >
              <option value="">Words and phrases</option>
              <option value="word">Words only</option>
              <option value="phrase">Phrases only</option>
            </select>
          </div>

          <div className="wp-filters__field">
            <label htmlFor="wp-audio">Pronunciation audio</label>
            <select
              id="wp-audio"
              value={current.audio ?? ""}
              onChange={onSelect("audio")}
            >
              <option value="">Any</option>
              <option value="with">Has audio</option>
              <option value="without">Missing audio</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
