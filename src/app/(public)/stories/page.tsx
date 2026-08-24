import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlotMedia } from "@/components/public/SlotMedia";
import { StoryCard } from "@/components/public/StoryCard";
import { AudioStoryCard } from "@/components/public/AudioStoryCard";
import { StoryFilters } from "@/components/public/StoryFilters";
import { renderAccented } from "@/lib/content/accent";
import {
  findContent,
  findSection,
  findSlot,
  type PageSection,
} from "@/lib/cms/page-content";
import { resolveSlotUrls } from "@/lib/media/resolve-slot-urls";
import {
  buildPageMetadata,
  absoluteUrl,
  routeForSlug,
} from "@/lib/seo/page-metadata";
import {
  getStories,
  getStoryFacets,
  getFeaturedStory,
  getStoryCounts,
  parseStoryFilters,
  resolveStoryAssetUrls,
  formatDuration,
} from "@/lib/stories/queries";
import "./stories.css";

const PAGE_SLUG = "stories-voices";

/** How many cards each rail shows before the "view all" link takes over. */
const INTERVIEW_LIMIT = 5;
const AUDIO_LIMIT = 4;

export async function generateMetadata() {
  return buildPageMetadata({
    slug: PAGE_SLUG,
    fallback: {
      title: "Stories & Voices",
      description:
        "Listen, watch and learn from the people who carry Warli and Katkari heritage in their hearts.",
    },
  });
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: page } = await supabase
    .from("pages")
    .select(
      `
      id, title, description, page_summary,
      page_sections(
        id, section_key, display_order,
        page_content(id, field_key, content),
        media_slots(id, slot_key, media_type, aspect_ratio)
      )
      `
    )
    .eq("slug", PAGE_SLUG)
    .eq("status", "published")
    .single();

  if (!page) {
    return (
      <div className="stories-error">
        <h1>Stories &amp; Voices</h1>
        <p>This page is not yet configured in the CMS.</p>
        <Link href="/">← Home</Link>
      </div>
    );
  }

  const sections: PageSection[] = page.page_sections ?? [];
  const heroSection = findSection(sections, "hero");
  const interviewsSection = findSection(sections, "community_interviews");
  const audioSection = findSection(sections, "voices_audio");
  const featuredSection = findSection(sections, "featured_story");
  const teamSection = findSection(sections, "student_team");
  const closingSection = findSection(sections, "footer_strip");

  // Bound once each: calling findSlot() twice — to guard, then to read .id —
  // means the guard never narrows the second call.
  const heroSlot = findSlot(heroSection, "hero_image");
  const studentSlots = [1, 2, 3, 4].map((n) =>
    findSlot(teamSection, `student_photo_${n}`)
  );

  const facets = await getStoryFacets(supabase);
  const filters = parseStoryFilters(params, {
    languageCodes: facets.languages.map((l) => l.code),
    themes: facets.themes,
    ageGroups: facets.ageGroups,
  });

  // A chosen format narrows both rails; with none chosen each rail shows its
  // own kind, as the approved design does.
  const showInterviews = !filters.format || filters.format === "interview";
  const showAudio = !filters.format || filters.format !== "interview";

  const [interviews, audioClips, featured, counts, slotUrls] = await Promise.all([
    showInterviews
      ? getStories(supabase, { format: "interview", filters, limit: INTERVIEW_LIMIT })
      : Promise.resolve([]),
    showAudio
      ? getStories(supabase, {
          format: filters.format === "song" ? ["song"] : ["audio", "song"],
          filters,
          limit: AUDIO_LIMIT,
        })
      : Promise.resolve([]),
    getFeaturedStory(supabase),
    getStoryCounts(supabase),
    resolveSlotUrls(
      supabase,
      [heroSlot, ...studentSlots].flatMap((s) => (s ? [s.id] : []))
    ),
  ]);

  const assetUrls = await resolveStoryAssetUrls(supabase, [
    ...interviews.map((s) => s.thumbnail_asset_id),
    ...audioClips.flatMap((s) => [s.thumbnail_asset_id, s.media_asset_id]),
    featured?.thumbnail_asset_id ?? null,
  ]);

  const slotUrl = (slot?: { id: string }) =>
    slot ? slotUrls.get(slot.id) ?? null : null;
  const assetUrl = (id: string | null) => (id ? assetUrls.get(id) ?? null : null);

  // Two of the four hero figures are counts we can derive and therefore
  // guarantee; the other two are editorial. Anything blank or zero is
  // omitted rather than shown as a placeholder (CLAUDE.md section 25).
  const stats = [
    { value: counts.interviews || null, label: findContent(heroSection, "stat_1_label") },
    { value: counts.audioClips || null, label: findContent(heroSection, "stat_2_label") },
    { value: findContent(heroSection, "stat_3_value"), label: findContent(heroSection, "stat_3_label") },
    { value: findContent(heroSection, "stat_4_value"), label: findContent(heroSection, "stat_4_label") },
  ]
    .map((s) => ({ value: s.value ? String(s.value) : "", label: s.label ?? "" }))
    .filter((s) => s.value && s.label);

  const quoteText = findContent(heroSection, "quote_text");
  const quoteAttribution = findContent(heroSection, "quote_attribution");
  const closingQuote = findContent(closingSection, "quote");
  const noStoriesAtAll =
    interviews.length === 0 && audioClips.length === 0 && !featured;
  const filtersActive = Boolean(
    filters.lang || filters.format || filters.theme || filters.age
  );

  // Only real, published records are described; nothing is asserted about
  // content that does not exist.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    description: page.page_summary || page.description || undefined,
    url: absoluteUrl(routeForSlug(PAGE_SLUG)),
    isPartOf: { "@type": "WebSite", name: "Bhasha Setu", url: absoluteUrl("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: interviews.length + audioClips.length,
      itemListElement: [...interviews, ...audioClips].map((story, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: story.title,
        ...(story.summary ? { description: story.summary } : {}),
      })),
    },
  };

  return (
    <div className="stories-page">
      <script
        type="application/ld+json"
        // Serialised server-side from database rows only.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ===== HERO ===== */}
      {heroSection && (
        <section className="sv-hero">
          <div className="sv-hero__media">
            <SlotMedia
              url={slotUrl(heroSlot)}
              altText="Warli and Katkari community members"
              aspectRatio={heroSlot?.aspect_ratio ?? "2:1"}
              label="Community photograph"
              priority
              className="sv-hero__image"
            />
          </div>

          <div className="sv-hero__inner">
            <div className="sv-hero__copy">
              <h1 className="sv-hero__title">
                {renderAccented(findContent(heroSection, "heading"))}
              </h1>
              <p className="sv-hero__tagline">
                {findContent(heroSection, "tagline")}
              </p>
              <p className="sv-hero__description">
                {findContent(heroSection, "description")}
              </p>

              {stats.length > 0 && (
                <dl className="sv-stats">
                  {stats.map((stat) => (
                    <div className="sv-stat" key={stat.label}>
                      <span className="sv-stat__icon" aria-hidden="true">
                        ●
                      </span>
                      <div className="sv-stat__text">
                        <dd className="sv-stat__value">{stat.value}</dd>
                        <dt className="sv-stat__label">{stat.label}</dt>
                      </div>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {quoteText && (
              <figure className="sv-quote">
                <span className="sv-quote__mark" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote>{quoteText}</blockquote>
                {quoteAttribution && (
                  <figcaption>&ndash; {quoteAttribution}</figcaption>
                )}
              </figure>
            )}
          </div>
        </section>
      )}

      {/* ===== FILTERS ===== */}
      <StoryFilters
        languages={facets.languages}
        themes={facets.themes}
        ageGroups={facets.ageGroups}
        current={filters}
      />

      {/* ===== COMMUNITY INTERVIEWS ===== */}
      {interviewsSection && showInterviews && (
        <section className="sv-section" aria-labelledby="sec-interviews">
          <header className="sv-section__head">
            <h2 id="sec-interviews" className="sv-section__title">
              <span className="sv-section__icon" aria-hidden="true">
                🎬
              </span>
              {findContent(interviewsSection, "heading")}
            </h2>
            <p className="sv-section__subtitle">
              {findContent(interviewsSection, "subtitle")}
            </p>
            <Link href="/stories?format=interview" className="sv-section__link">
              {findContent(interviewsSection, "cta_text")}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </header>

          {interviews.length > 0 ? (
            <div className="story-rail story-rail--interviews">
              {interviews.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  thumbnailUrl={assetUrl(story.thumbnail_asset_id)}
                />
              ))}
            </div>
          ) : (
            <p className="sv-empty">
              {filtersActive
                ? "No interviews match these filters yet."
                : "No interviews have been published yet."}
            </p>
          )}
        </section>
      )}

      {/* ===== VOICES IN AUDIO + FEATURED STORY ===== */}
      {(audioSection || featuredSection) && (
        <section className="sv-band">
          {audioSection && showAudio && (
            <div className="sv-audio">
              <header className="sv-section__head">
                <h2 className="sv-section__title">
                  <span className="sv-section__icon" aria-hidden="true">
                    🎧
                  </span>
                  {findContent(audioSection, "heading")}
                </h2>
                <p className="sv-section__subtitle">
                  {findContent(audioSection, "subtitle")}
                </p>
                <Link href="/stories?format=audio" className="sv-section__link">
                  {findContent(audioSection, "cta_text")}{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              </header>

              {audioClips.length > 0 ? (
                <div className="story-rail story-rail--audio">
                  {audioClips.map((story) => (
                    <AudioStoryCard
                      key={story.id}
                      story={story}
                      thumbnailUrl={assetUrl(story.thumbnail_asset_id)}
                      audioUrl={assetUrl(story.media_asset_id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="sv-empty">
                  {filtersActive
                    ? "No audio clips match these filters yet."
                    : "No audio clips have been published yet."}
                </p>
              )}
            </div>
          )}

          {featuredSection && featured && (
            <aside className="sv-featured">
              <SlotMedia
                url={assetUrl(featured.thumbnail_asset_id)}
                altText={featured.title}
                aspectRatio="3:4"
                label="Featured story"
                className="sv-featured__image"
              />
              <div className="sv-featured__content">
                <span className="sv-featured__badge">
                  <span aria-hidden="true">★</span>{" "}
                  {findContent(featuredSection, "label")}
                </span>
                <h2 className="sv-featured__title">{featured.title}</h2>
                {featured.summary && (
                  <p className="sv-featured__text">{featured.summary}</p>
                )}
                <Link
                  href={`/stories?story=${featured.slug}`}
                  className="sv-featured__cta"
                >
                  {findContent(featuredSection, "cta_text")}{" "}
                  <span aria-hidden="true">›</span>
                </Link>
              </div>
              {formatDuration(featured.duration_seconds) && (
                <span className="sv-featured__duration">
                  {formatDuration(featured.duration_seconds)}
                </span>
              )}
            </aside>
          )}
        </section>
      )}

      {noStoriesAtAll && (
        <p className="sv-archive-empty">
          The archive is being prepared. Recorded stories will appear here once
          they have been verified and the speakers have given their consent.
        </p>
      )}

      {/* ===== RECORDED BY THE STUDENT TEAM ===== */}
      {teamSection && (
        <section className="sv-team" aria-labelledby="sec-team">
          <div className="sv-team__copy">
            <h2 id="sec-team" className="sv-team__title">
              <span className="sv-section__icon" aria-hidden="true">
                👥
              </span>
              <span className="sv-team__title-desktop">
                {findContent(teamSection, "heading")}
              </span>
              <span className="sv-team__title-mobile">
                {findContent(teamSection, "mobile_heading")}
              </span>
            </h2>
            <p className="sv-team__text sv-team__text--desktop">
              {findContent(teamSection, "description")}
            </p>
            <p className="sv-team__text sv-team__text--mobile">
              {findContent(teamSection, "mobile_subtitle")}
            </p>
          </div>

          <div className="sv-team__photos">
            {studentSlots.map((slot, i) => (
              <figure className="sv-team__photo" key={slot?.id ?? i}>
                <SlotMedia
                  url={slotUrl(slot)}
                  altText={findContent(teamSection, `photo_${i + 1}_caption`) ?? ""}
                  aspectRatio={slot?.aspect_ratio ?? "4:3"}
                  label="Field photograph"
                />
                <figcaption>
                  {findContent(teamSection, `photo_${i + 1}_caption`)}
                </figcaption>
              </figure>
            ))}
          </div>

          <aside className="sv-ethics">
            <h3 className="sv-ethics__title">
              <span aria-hidden="true">🛡</span>{" "}
              {findContent(teamSection, "ethics_heading")}
            </h3>
            <p>{findContent(teamSection, "ethics_description")}</p>
            <Link href="/about" className="sv-ethics__link">
              {findContent(teamSection, "ethics_cta_text")}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </section>
      )}

      {/* ===== CLOSING QUOTE ===== */}
      {closingQuote && (
        <section className="sv-closing">
          <span className="sv-closing__leaf" aria-hidden="true">
            ❧
          </span>
          <p>{closingQuote}</p>
          <span className="sv-closing__leaf" aria-hidden="true">
            ❧
          </span>
        </section>
      )}
    </div>
  );
}
