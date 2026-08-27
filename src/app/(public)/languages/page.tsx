import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlotMedia } from "@/components/public/SlotMedia";
import { ExplorerCard } from "@/components/public/ExplorerCard";
import { ExplorerFilters, ExplorerSort } from "@/components/public/ExplorerFilters";
import { SuggestWord } from "@/components/public/SuggestWord";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { WordAudioButton } from "@/components/public/WordAudioButton";
import {
  findContent,
  findSection,
  findSlot,
  type PageSection,
} from "@/lib/cms/page-content";
import { resolveSlotUrls } from "@/lib/media/resolve-slot-urls";
import { renderAccented } from "@/lib/content/accent";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo/page-metadata";
import { pronunciationAudioIds } from "@/lib/entries/search";
import {
  discoverWords,
  getExplorerFacets,
  logSearch,
  parseExplorerFilters,
  relatedWords,
  searchExplorer,
} from "@/lib/explorer/queries";
import { languageCardArt } from "@/lib/explorer/card-art";
import "./explorer.css";

const PAGE_SLUG = "language-explorer";

export async function generateMetadata() {
  return buildPageMetadata({
    slug: PAGE_SLUG,
    fallback: {
      title: "Language Explorer",
      description:
        "Search Warli and Katkari words and phrases, with recordings by community speakers.",
    },
  });
}

/**
 * The Language Explorer (WEB-04 desktop, MOBILE-01 mobile).
 *
 * A server component, and deliberately so: the filters, the search term and the
 * sort all live in the URL, which means every state of this page is a real
 * address a visitor can share and a crawler can index, and the whole thing
 * works with JavaScript switched off. Only the four controls that must react to
 * a click are client components.
 *
 * No model is reachable from this page. A visitor asking what a word is gets
 * the collection's answer or an honest miss (CLAUDE.md sections 16 and 25).
 */
export default async function LanguageExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: page } = await supabase
    .from("pages")
    .select(
      "id, title, description, page_sections(id, section_key, status, page_content(field_key, content, status), media_slots(id, slot_key, aspect_ratio, alt_text_template, status))"
    )
    .eq("slug", PAGE_SLUG)
    .eq("status", "published")
    .maybeSingle();

  const sections = (page?.page_sections ?? []) as unknown as PageSection[];
  const hero = findSection(sections, "hero");
  const search = findSection(sections, "search");
  const discover = findSection(sections, "discover");
  const suggest = findSection(sections, "suggest");
  const trust = findSection(sections, "trust");

  const bandSlot = findSlot(hero, "hero_band");
  const cardSlot = findSlot(hero, "hero_card");
  const robotSlot = findSlot(trust, "robot");

  const { languages, categories } = await getExplorerFacets(supabase);

  const filters = parseExplorerFilters(params, {
    languageCodes: languages.map((l) => l.code),
    categoryIds: categories.map((c) => c.id),
  });

  const { entries, audioByEntryId } = await searchExplorer(
    supabase,
    filters,
    languages
  );

  const [related, discovered, cardArt, slotUrls] = await Promise.all([
    relatedWords(supabase, entries),
    discoverWords(supabase),
    languageCardArt(supabase, languages),
    resolveSlotUrls(
      supabase,
      [bandSlot?.id, cardSlot?.id, robotSlot?.id].filter(Boolean) as string[]
    ),
  ]);

  // Recorded after the search, never before: what matters is the term and
  // whether the collection had it. Failures are swallowed inside logSearch.
  if (filters.q) {
    const languageId = filters.lang
      ? (languages.find((l) => l.code === filters.lang)?.id ?? null)
      : null;
    await logSearch(supabase, filters.q, languageId, entries.length);
  }

  /**
   * Recordings for the words in the rail.
   *
   * Their own lookup, not the results map: a featured word is rarely among the
   * results, so reading the results map made every speaker in the rail render
   * as "no recording yet" — a false statement about the collection, on every
   * page load.
   */
  const discoverAudio = await pronunciationAudioIds(supabase, discovered.words);

  const languageById = new Map(languages.map((l) => [l.id, l]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const examples = (findContent(search, "examples") ?? "")
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
  const featuredSearches = (findContent(discover, "featured_searches") ?? "")
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  const heading = findContent(hero, "heading") ?? "Language Explorer";
  const tagline = findContent(hero, "tagline");

  return (
    <main className="ex-page">
      <script
        type="application/ld+json"
        // A search page, described as one: the SearchAction tells an assistant
        // how to query this collection directly rather than guessing at a URL.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: absoluteUrl("/languages?q={search_term_string}"),
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      <header className="ex-hero">
        <div className="ex-hero__art ex-hero__art--band" aria-hidden="true">
          <SlotMedia
            url={slotUrls.get(bandSlot?.id ?? "")?.url ?? null}
            altText=""
            aspectRatio={bandSlot?.aspect_ratio}
            className="ex-hero__band"
            priority
            fit={slotUrls.get(bandSlot?.id ?? "")?.fit}
            objectPosition={slotUrls.get(bandSlot?.id ?? "")?.objectPosition}
          />
        </div>

        <div className="ex-hero__inner">
          <div className="ex-hero__copy">
            <h1 className="ex-hero__title">{renderAccented(heading)}</h1>
            {tagline && <p className="ex-hero__tagline">{tagline}</p>}
            <span className="ex-hero__rule" aria-hidden="true" />
          </div>
          {/* MOBILE-01 sets the artwork beside the title rather than behind it. */}
          <div className="ex-hero__art ex-hero__art--card" aria-hidden="true">
            <SlotMedia
              url={slotUrls.get(cardSlot?.id ?? "")?.url ?? null}
              altText=""
              aspectRatio={cardSlot?.aspect_ratio}
              className="ex-hero__card"
              fit={slotUrls.get(cardSlot?.id ?? "")?.fit}
              objectPosition={slotUrls.get(cardSlot?.id ?? "")?.objectPosition}
            />
          </div>
        </div>

        <form className="ex-search" method="get" action="/languages" role="search">
          <span className="ex-search__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <label className="visually-hidden" htmlFor="ex-q">
            Search Warli and Katkari words
          </label>
          <input
            id="ex-q"
            name="q"
            type="search"
            className="ex-search__input"
            defaultValue={filters.q}
            placeholder={findContent(search, "placeholder") ?? "Search for a word"}
            autoComplete="off"
            maxLength={200}
          />
          {filters.q && (
            <Link className="ex-search__clear" href="/languages" aria-label="Clear search">
              ✕
            </Link>
          )}
          <button type="submit" className="ex-search__submit">
            Search
          </button>
        </form>

        {examples.length > 0 && (
          <p className="ex-search__hint">
            {findContent(search, "hint")}{" "}
            <span className="ex-search__examples">
              उदाहरण:{" "}
              {examples.map((term, i) => (
                <span key={term}>
                  {i > 0 && ", "}
                  <Link href={`/languages?q=${encodeURIComponent(term)}`}>{term}</Link>
                </span>
              ))}
            </span>
          </p>
        )}
      </header>

      <div className="ex-layout">
        <ExplorerFilters
          variant="rail"
          languages={languages}
          categories={categories}
          current={filters}
        />

        <div className="ex-results">
          <ExplorerFilters
            variant="bar"
            languages={languages}
            categories={categories}
            current={filters}
          />

          <div className="ex-results__head">
            <p className="ex-results__count" aria-live="polite">
              Showing <strong>{entries.length}</strong>{" "}
              {entries.length === 1 ? "result" : "results"}
              {filters.q && (
                <>
                  {" "}
                  for <span className="ex-results__term">&ldquo;{filters.q}&rdquo;</span>
                </>
              )}
            </p>
            <ExplorerSort value={filters.sort} />
          </div>

          {entries.length > 0 ? (
            <div className="ex-cards">
              {entries.map((entry) => (
                <ExplorerCard
                  key={entry.id}
                  entry={entry}
                  language={entry.language_id ? (languageById.get(entry.language_id) ?? null) : null}
                  category={entry.category_id ? (categoryById.get(entry.category_id) ?? null) : null}
                  audioAssetId={audioByEntryId[entry.id] ?? null}
                  related={related[entry.id] ?? { words: [], more: 0 }}
                  cardArtUrl={entry.language_id ? (cardArt.get(entry.language_id) ?? null) : null}
                />
              ))}
            </div>
          ) : (
            <p className="ex-empty">
              {filters.q ? (
                <>
                  We have not collected{" "}
                  <strong>&ldquo;{filters.q}&rdquo;</strong> yet. Every word here has
                  been recorded and checked with Warli and Katkari speakers, so this
                  means it is not in the library — not that it does not exist.
                </>
              ) : (
                <>No words match these filters yet.</>
              )}
            </p>
          )}

          {/* Below the results, as WEB-04 has it — not only when a search
              found nothing. A visitor who found two words may still know a
              third we are missing. The term travels with it either way, so the
              form arrives already filled in. */}
          {suggest && (
            <SuggestWord
              term={filters.q}
              languages={languages}
              heading={findContent(suggest, "heading") ?? "Looking for a word we don't have?"}
              body={findContent(suggest, "body") ?? null}
              note={findContent(suggest, "note") ?? null}
              ctaText={findContent(suggest, "cta_text") ?? "Suggest a word"}
            />
          )}
        </div>

        <aside className="ex-discover" aria-labelledby="ex-discover-title">
          <h2 className="ex-discover__title" id="ex-discover-title">
            <span className="ex-discover__spark" aria-hidden="true">
              ✦
            </span>
            {findContent(discover, "heading") ?? "Explore & Discover"}
          </h2>

          {featuredSearches.length > 0 && (
            <section className="ex-discover__block">
              <h3 className="ex-discover__heading">
                {findContent(discover, "searches_heading") ?? "Featured Searches"}
              </h3>
              <ul className="ex-searches">
                {featuredSearches.map((term) => (
                  <li key={term}>
                    <Link className="ex-search-pill" href={`/languages?q=${encodeURIComponent(term)}`}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                      </svg>
                      {term}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {discovered.words.length > 0 && (
            <section className="ex-discover__block">
              {/*
                The heading follows the source. The reference says "Trending
                Words"; a list an editor chose is featured, not trending, and
                saying otherwise would be a claim about behaviour nobody has
                measured. Once enough real searches exist, this says Trending.
              */}
              <h3 className="ex-discover__heading">
                <span className="ex-discover__trend" aria-hidden="true">
                  ↗
                </span>
                {discovered.measured ? "Trending Words" : "Featured Words"}
              </h3>
              <ol className="ex-trending">
                {discovered.words.map((word, i) => (
                  <li key={word.id}>
                    <span className="ex-trending__rank">{i + 1}</span>
                    <Link className="ex-trending__word" href={`/languages?q=${encodeURIComponent(word.native_text)}`}>
                      {word.native_text}
                    </Link>
                    {word.gloss && <span className="ex-trending__gloss">({word.gloss})</span>}
                    <WordAudioButton
                      assetId={discoverAudio[word.id] ?? null}
                      entryId={word.id}
                      label={word.native_text}
                    />
                  </li>
                ))}
              </ol>
            </section>
          )}

          {categories.length > 0 && (
            <Link className="ex-categories" href="/languages">
              <span className="ex-categories__icon" aria-hidden="true">
                <CategoryIcon name="tag" size={20} />
              </span>
              <span>
                <strong>{findContent(discover, "categories_heading") ?? "Explore categories"}</strong>
                <span className="ex-categories__blurb">
                  {findContent(discover, "categories_blurb")}
                </span>
              </span>
              <span className="ex-categories__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          )}
        </aside>
      </div>

      {/*
        MOBILE-01 makes the same promise differently: a card with the Bhasha
        Setu robot saying that a word we do not have will not be invented.
        Both are rendered and CSS shows one — the copy differs, so this is two
        pieces of content rather than one restyled.
      */}
      {trust && (
        <section className="ex-trust-card">
          <div className="ex-trust-card__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--color-primary)">
              <path d="M12 2l8 3.2V12c0 4.7-3.3 8.9-8 10-4.7-1.1-8-5.3-8-10V5.2L12 2z" />
              <path fill="#fff" d="M10.9 15.6l-3-3L9.3 11l1.6 1.6L15 8.5l1.4 1.4z" />
            </svg>
          </div>
          <div className="ex-trust-card__copy">
            <p className="ex-trust-card__heading">{findContent(trust, "mobile_heading")}</p>
            <p className="ex-trust-card__body">{findContent(trust, "mobile_body")}</p>
          </div>
          {robotSlot && (
            <div className="ex-trust-card__robot" aria-hidden="true">
              <SlotMedia
                url={slotUrls.get(robotSlot.id)?.url ?? null}
                altText=""
                aspectRatio={robotSlot.aspect_ratio}
                fit="contain"
              />
            </div>
          )}
        </section>
      )}

      {trust && (
        <section className="ex-trust">
          <div className="ex-trust__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3l8 3.2V12c0 4.7-3.3 8.9-8 10-4.7-1.1-8-5.3-8-10V6.2L12 3z" />
              <path d="M8.5 12.2l2.4 2.4 4.6-4.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="ex-trust__copy">
            <p className="ex-trust__heading">{findContent(trust, "heading")}</p>
            <p className="ex-trust__body">{findContent(trust, "body")}</p>
          </div>
          {findContent(trust, "cta_href") && (
            <Link className="ex-trust__cta" href={findContent(trust, "cta_href") ?? "/about"}>
              {findContent(trust, "cta_text")} <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
