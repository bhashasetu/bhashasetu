"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import type { ExplorerCategory, ExplorerLanguage } from "@/lib/explorer/queries";

/**
 * Refine your search (WEB-04 rail, MOBILE-01 pills).
 *
 * Filter state lives in the URL exactly as it does on Stories & Voices, so every
 * combination is a real address a visitor can share and a crawler can follow,
 * and the server does the filtering. The controls submit on change when
 * JavaScript is available and through the Apply button when it is not.
 *
 * One component serves both viewports. The rail and the pills are the same
 * controls in different clothes, and keeping them as one component means a
 * filter added later cannot appear on one and be forgotten on the other.
 */
export function ExplorerFilters({
  languages,
  categories,
  current,
  variant,
}: {
  languages: ExplorerLanguage[];
  categories: ExplorerCategory[];
  current: {
    q: string;
    lang?: string;
    categoryId?: string;
    audioOnly: boolean;
  };
  /** "rail" is the desktop sidebar; "bar" is the mobile pill row. */
  variant: "rail" | "bar";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  function hrefWith(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const go = (changes: Record<string, string | null>) =>
    router.push(hrefWith(changes));

  const onCategory = (e: ChangeEvent<HTMLSelectElement>) =>
    go({ category: e.target.value || null });

  // Categories belong to a language, so the list narrows with the choice —
  // otherwise a visitor filtering Warli is offered Katkari's categories.
  const languageId = languages.find((l) => l.code === current.lang)?.id;
  const shown = languageId
    ? categories.filter((c) => c.language_id === languageId)
    : categories;

  const hasFilters = Boolean(current.lang || current.categoryId || current.audioOnly);

  const controls = (
    <>
      <fieldset className="ex-filter">
        <legend className="ex-filter__legend">Language</legend>
        <label className="ex-check">
          <input
            type="radio"
            name="lang"
            checked={!current.lang}
            onChange={() => go({ lang: null, category: null })}
          />
          <span>All Languages</span>
        </label>
        {languages.map((language) => (
          <label className="ex-check" key={language.id}>
            <input
              type="radio"
              name="lang"
              checked={current.lang === language.code}
              onChange={() => go({ lang: language.code, category: null })}
            />
            <span>{language.name}</span>
          </label>
        ))}
      </fieldset>

      <div className="ex-filter">
        <label className="ex-filter__legend" htmlFor="ex-category">
          Category
        </label>
        <select
          id="ex-category"
          name="category"
          className="ex-select"
          value={current.categoryId ?? ""}
          onChange={onCategory}
        >
          <option value="">All Categories</option>
          {shown.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="ex-filter">
        <legend className="ex-filter__legend">Audio</legend>
        <label className="ex-check">
          <input
            type="checkbox"
            name="audio"
            value="1"
            checked={current.audioOnly}
            onChange={(e) => go({ audio: e.target.checked ? "1" : null })}
          />
          <span>Audio available only</span>
        </label>
      </fieldset>

      {/*
        Shown, on, and locked — the approved design has this control and taking
        it away would hide something true. It cannot be switched off because a
        database CHECK requires every published entry to be verified, so there
        is nothing for it to filter out. The note says so plainly rather than
        leaving a visitor to wonder why the box will not move.
      */}
      <fieldset className="ex-filter">
        <legend className="ex-filter__legend">Verified</legend>
        <label className="ex-check ex-check--locked">
          <input type="checkbox" checked readOnly disabled />
          <span>Verified words only</span>
        </label>
        <p className="ex-filter__note">
          Every published word is community-verified, so this is always on.
        </p>
      </fieldset>

      {hasFilters && (
        <a className="ex-clear" href={hrefWith({ lang: null, category: null, audio: null })}>
          Clear all filters
        </a>
      )}
    </>
  );

  if (variant === "rail") {
    return (
      <form
        className="ex-rail"
        method="get"
        action={pathname}
        aria-labelledby="ex-rail-title"
      >
        {/* Carried through so refining a search does not silently drop it. */}
        {current.q && <input type="hidden" name="q" value={current.q} />}
        <div className="ex-rail__head">
          <h2 className="ex-rail__title" id="ex-rail-title">
            Refine your search
          </h2>
          <a className="ex-rail__reset" href={hrefWith({ lang: null, category: null, audio: null })}>
            Reset
          </a>
        </div>
        {controls}
        {/* Without JavaScript the controls above cannot navigate on change, so
            this submits the same form. It is hidden from pointer users, who
            have already navigated by the time they could press it. */}
        <noscript>
          <button type="submit" className="ex-apply">
            Apply filters
          </button>
        </noscript>
      </form>
    );
  }

  return (
    <div className="ex-bar">
      <select
        className="ex-pill ex-pill--select"
        aria-label="Language"
        value={current.lang ?? ""}
        onChange={(e) => go({ lang: e.target.value || null, category: null })}
      >
        <option value="">All Languages</option>
        {languages.map((language) => (
          <option key={language.id} value={language.code}>
            {language.name}
          </option>
        ))}
      </select>

      <span className="ex-pill ex-pill--verified" title="Every published word is community-verified">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <path d="M12 2l7 3v6c0 4.4-3 8.4-7 9.5C8 19.4 5 15.4 5 11V5l7-3zm-1 13l5-5-1.4-1.4L11 12.2l-1.6-1.6L8 12l3 3z" />
        </svg>
        Verified only
      </span>

      <button
        type="button"
        className={`ex-pill ex-pill--more${hasFilters ? " is-set" : ""}`}
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen((open) => !open)}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" fill="currentColor" stroke="none" />
          <circle cx="10" cy="17" r="2" fill="currentColor" stroke="none" />
        </svg>
        Filters
      </button>

      {sheetOpen && (
        <div className="ex-sheet">
          <div className="ex-sheet__head">
            <h2 className="ex-rail__title">Refine your search</h2>
            <button
              type="button"
              className="ex-sheet__close"
              onClick={() => setSheetOpen(false)}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
          {controls}
        </div>
      )}
    </div>
  );
}

/**
 * Sort by (WEB-04 results header, MOBILE-01 above the cards).
 *
 * Same file as the filters because it is the same idea — state that belongs in
 * the URL — and keeping them together stops one of them growing a private way
 * of writing the query string.
 */
export function ExplorerSort({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="ex-sort">
      <span className="ex-sort__label">Sort by</span>
      <select
        className="ex-select ex-select--sort"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "relevance") next.delete("sort");
          else next.set("sort", e.target.value);
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
      >
        <option value="relevance">Relevance</option>
        <option value="az">A–Z</option>
        <option value="newest">Newest</option>
      </select>
    </label>
  );
}
