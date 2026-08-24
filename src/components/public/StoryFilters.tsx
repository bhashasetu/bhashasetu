"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ChangeEvent } from "react";

/**
 * The language tabs, filter selects and mobile format chips.
 *
 * Filter state lives in the URL, not in component state, so every
 * combination is a real address a visitor can share and a crawler can
 * follow. This component only rewrites the query string; the server does the
 * filtering.
 *
 * It is a form first and JavaScript second: the selects submit on change
 * when JS is available, and the Apply button makes the same controls work
 * without it.
 */
export function StoryFilters({
  languages,
  themes,
  ageGroups,
  current,
}: {
  languages: { code: string; name: string }[];
  themes: string[];
  ageGroups: string[];
  current: {
    lang?: string;
    format?: string;
    theme?: string;
    age?: string;
    sort: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefWith(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function onSelect(key: string) {
    return (e: ChangeEvent<HTMLSelectElement>) => {
      router.push(hrefWith(key, e.target.value || null));
    };
  }

  const FORMAT_CHIPS = [
    { value: "", label: "All" },
    { value: "interview", label: "Interviews" },
    { value: "audio", label: "Audio Stories" },
    { value: "song", label: "Songs" },
  ];

  return (
    <div className="story-filters">
      {languages.length > 0 && (
        <div className="lang-tabs" role="tablist" aria-label="Language">
          {languages.map((language) => {
            const active = current.lang === language.code;
            return (
              <a
                key={language.code}
                role="tab"
                aria-selected={active}
                className={`lang-tab${active ? " is-active" : ""}`}
                href={hrefWith("lang", active ? null : language.code)}
              >
                {language.name}
              </a>
            );
          })}
        </div>
      )}

      {/* Desktop: four selects on one bar. */}
      <form className="filter-bar" method="GET" action={pathname}>
        {current.lang && <input type="hidden" name="lang" value={current.lang} />}

        <label className="filter-bar__field">
          <span className="visually-hidden">Theme</span>
          <select
            name="theme"
            defaultValue={current.theme ?? ""}
            onChange={onSelect("theme")}
            disabled={themes.length === 0}
          >
            <option value="">All Themes</option>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-bar__field">
          <span className="visually-hidden">Format</span>
          <select
            name="format"
            defaultValue={current.format ?? ""}
            onChange={onSelect("format")}
          >
            <option value="">All Formats</option>
            <option value="interview">Interviews</option>
            <option value="audio">Audio Stories</option>
            <option value="song">Songs</option>
          </select>
        </label>

        <label className="filter-bar__field">
          <span className="visually-hidden">Age group</span>
          <select
            name="age"
            defaultValue={current.age ?? ""}
            onChange={onSelect("age")}
            disabled={ageGroups.length === 0}
          >
            <option value="">All Ages</option>
            {ageGroups.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-bar__field">
          <span className="visually-hidden">Sort by</span>
          <select
            name="sort"
            defaultValue={current.sort}
            onChange={onSelect("sort")}
          >
            <option value="latest">Sort by: Latest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="duration">Sort by: Shortest</option>
            <option value="az">Sort by: A–Z</option>
          </select>
        </label>

        {/* Without JavaScript the selects cannot navigate on change, so the
            same form still submits the old-fashioned way. */}
        <noscript>
          <button type="submit" className="filter-bar__apply">
            Apply
          </button>
        </noscript>
      </form>

      {/* Mobile: the same format filter as a chip row (MOBILE-03). */}
      <div className="format-chips">
        {FORMAT_CHIPS.map((chip) => {
          const active = (current.format ?? "") === chip.value;
          return (
            <a
              key={chip.value || "all"}
              className={`format-chip${active ? " is-active" : ""}`}
              href={hrefWith("format", chip.value || null)}
            >
              {active && (
                <span className="format-chip__tick" aria-hidden="true">
                  ✓
                </span>
              )}
              {chip.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
