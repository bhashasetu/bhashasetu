import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlotMedia } from "@/components/public/SlotMedia";
import { MobileHome, type MobileStory } from "@/components/public/MobileHome";
import { renderAccented } from "@/lib/content/accent";
import { resolveSlotUrls } from "@/lib/media/resolve-slot-urls";
import { framing } from "@/lib/media/framing";
import {
  STORY_FORMATS,
  formatDuration,
  getStories,
  resolveStoryAssetUrls,
} from "@/lib/stories/queries";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import {
  findContent,
  findSection,
  findSlot,
  type PageSection,
} from "@/lib/cms/page-content";
import "./homepage.css";

/**
 * Navigation targets and the labels shown while a media slot is still empty.
 * The editorial copy itself lives in the CMS; these entries only bind each
 * card to its slot and destination.
 */
/** Cards in the mobile Stories & Voices row; the approved design shows four. */
const MOBILE_STORY_LIMIT = 4;

const LEARN_CARDS = [
  {
    slotKey: "card_warli_image",
    title: "Warli Language",
    body: "Explore words, phrases, songs and stories from the Warli community.",
    cta: "Explore Warli",
    href: "/learn/warli",
    altText: "Warli language",
    placeholderLabel: "Warli",
  },
  {
    slotKey: "card_katkari_image",
    title: "Katkari Language",
    body: "Discover the rich oral traditions and everyday expressions of Katkari.",
    cta: "Explore Katkari",
    href: "/learn/katkari",
    altText: "Katkari language",
    placeholderLabel: "Katkari",
  },
  {
    slotKey: "card_play_image",
    title: "Play & Learn",
    body: "Games, quizzes and activities that make learning joyful.",
    cta: "Start Playing",
    href: "/play",
    altText: "Play and learn",
    placeholderLabel: "Play",
  },
  {
    slotKey: "card_stories_image",
    title: "Stories & Voices",
    body: "Real stories. Real people. Voices from our communities.",
    cta: "Listen Now",
    href: "/stories",
    altText: "Stories and voices",
    placeholderLabel: "Stories",
  },
] as const;

const TESTIMONIALS = [
  {
    slotKey: "testimonial_1_image",
    name: "Bhagwan Kharvi",
    role: "Warli Community Elder",
    quote: "Our language carries our memories, our songs, our way of life.",
  },
  {
    slotKey: "testimonial_2_image",
    name: "Sushila Bhoye",
    role: "Katkari Community Member",
    quote: "When our children learn our language, our culture lives on.",
  },
  {
    slotKey: "testimonial_3_image",
    name: "Team Bhasha Setu",
    role: "Student Innovators",
    quote:
      "We built Bhasha Setu to give back to the communities that inspire us.",
  },
] as const;

/**
 * Title, description, canonical and Open Graph tags come from the same CMS
 * record the page body reads, so an editor changes them in the Back Office
 * rather than in code (CLAUDE.md section 15).
 */
export async function generateMetadata() {
  return buildPageMetadata({
    slug: "homepage",
    fallback: {
      title: "Bhasha Setu — Learn Warli and Katkari",
      description:
        "A student-built learning platform for the Warli and Katkari languages, made with the communities who speak them.",
    },
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch the published homepage with all sections and media.
  // The public RLS policies only expose rows with status = 'published', so a
  // visitor never sees draft editorial content.
  const { data: homepage } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        page_content(*),
        media_slots(
          id,
          slot_key,
          media_type,
          aspect_ratio,
          status
        )
      )
    `,
    )
    .eq("slug", "homepage")
    .eq("status", "published")
    .single();

  if (!homepage) {
    return (
      <div className="homepage-error">
        <h1>Homepage not found</h1>
        <p>Homepage is not yet configured in the CMS.</p>
      </div>
    );
  }

  // A retired slot stays in the database as a record of what the page used to
  // carry (CLAUDE.md section 8, archive rather than delete). It is dropped
  // here so the page neither renders it nor pays to sign media behind it.
  const sections: PageSection[] = (homepage.page_sections || []).map(
    (section: PageSection) => ({
      ...section,
      media_slots: (section.media_slots ?? []).filter(
        (slot) => slot.status !== "archived",
      ),
    }),
  );

  /**
   * Every slot on the page resolved server-side, in one pass.
   *
   * These were rendered by MediaSlotImage, which fetches its URL from an API
   * route inside useEffect. Nothing could start loading until the JS bundle
   * had downloaded and hydrated, and only then did each slot make its own
   * round trip to be signed — so the WRO video was at the end of a four-stage
   * chain (HTML, bundle, hydrate, sign) before the browser had a src to
   * request a single byte from. The desktop and mobile trees also both render
   * the WRO slot, which meant signing and fetching that video twice.
   *
   * resolveSlotUrls takes a fixed number of queries whatever the slot count,
   * and puts real src values in the initial HTML.
   */
  const slotMedia = await resolveSlotUrls(
    supabase,
    sections.flatMap((s) => (s.media_slots ?? []).map((m) => m.id)),
  );
  const media = (slot?: { id: string }) =>
    slot ? (slotMedia.get(slot.id) ?? null) : null;

  /**
   * The mobile Stories & Voices row.
   *
   * These four cards used to be four thumbnail slots plus twelve text fields
   * on the homepage, filled in by hand — so publishing an interview meant
   * uploading its thumbnail a second time and retyping its title, language and
   * duration. They are the same published records the /stories page shows, so
   * the row now reads those directly, ordered exactly as that page orders them
   * (display_order first, so pinning a story in the Back Office pins it here
   * too, then newest published).
   */
  const mobileStories = await getStories(supabase, {
    format: [...STORY_FORMATS],
    filters: { sort: "latest" },
    limit: MOBILE_STORY_LIMIT,
  });
  const storyAssets = await resolveStoryAssetUrls(
    supabase,
    mobileStories.flatMap((s) => [s.thumbnail_asset_id, s.media_asset_id]),
  );
  const storyAsset = (id: string | null) =>
    id ? (storyAssets.get(id) ?? null) : null;

  const mobileStoryCards: MobileStory[] = mobileStories.map((story) => ({
    id: story.id,
    title: story.title,
    languageName: story.language?.name ?? null,
    duration: formatDuration(story.duration_seconds),
    thumbnailUrl: storyAsset(story.thumbnail_asset_id)?.url ?? null,
    thumbnailFit: storyAsset(story.thumbnail_asset_id)?.fit,
    thumbnailPosition: storyAsset(story.thumbnail_asset_id)?.objectPosition,
    mediaUrl: storyAsset(story.media_asset_id)?.url ?? null,
    mediaSourceUrl: storyAsset(story.media_asset_id)?.sourceUrl ?? null,
  }));

  const getSection = (key: string) => findSection(sections, key);
  const getContent = findContent;
  const getSlot = findSlot;

  const heroSection = getSection("hero");
  const wroSection = getSection("wro_project");
  const learnSection = getSection("learn_explore");
  const voicesSection = getSection("voices_inspire");
  const chatSection = getSection("my_bhasha_setu");

  // Bound once each: calling getSlot() twice (to guard, then to read .id)
  // means the guard never narrows the second call.
  const heroImageSlot = getSlot(heroSection, "hero_image");
  const wroVideoSlot = getSlot(wroSection, "wro_video");
  const robotSlot = getSlot(chatSection, "robot_image");

  return (
    <>
      {/* MOBILE-05 is a distinct composition, not a reflow of the desktop
          page, so the two surfaces are separate trees switched by breakpoint. */}
      <MobileHome
        sections={sections}
        slotMedia={slotMedia}
        stories={mobileStoryCards}
      />

      <div className="homepage surface-desktop">
        {/* HERO SECTION */}
        {heroSection && (
          <section className="hero-section">
            {/* The reference composes hero copy, the WRO vehicle photo and the
              WRO video panel as one band, not as stacked sections. */}
            <div className="hero-container">
              <div className="hero-content">
                <div className="verified-badge">
                  <span aria-hidden="true">✓</span> Verified Learning Content
                </div>
                <h1 className="hero-heading">
                  {renderAccented(getContent(heroSection, "heading"))}
                </h1>
                <p className="hero-description">
                  {getContent(heroSection, "description")}
                </p>
                <div className="hero-buttons">
                  <Link href="/learn" className="btn btn-primary">
                    Start Learning <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/languages" className="btn btn-secondary">
                    Explore Languages
                  </Link>
                </div>
                <div className="hero-tagline">
                  <span className="tagline-icon" aria-hidden="true">
                    👥
                  </span>
                  Built by students. Rooted in community. Driven by purpose.
                </div>
              </div>

              <div className="hero-media">
                {heroImageSlot && (
                  <SlotMedia
                    url={media(heroImageSlot)?.url ?? null}
                    sourceUrl={media(heroImageSlot)?.sourceUrl ?? null}
                    altText="The Bhasha Setu WRO project vehicle"
                    aspectRatio={heroImageSlot.aspect_ratio}
                    label="WRO vehicle photograph"
                    {...framing(media(heroImageSlot))}
                  />
                )}
              </div>

              {wroSection && (
                <aside className="wro-panel">
                  <h2 className="wro-title">
                    {getContent(wroSection, "title")}
                  </h2>
                  <div className="wro-video">
                    {wroVideoSlot && (
                      <SlotMedia
                        url={media(wroVideoSlot)?.url ?? null}
                        sourceUrl={media(wroVideoSlot)?.sourceUrl ?? null}
                        altText="Bhasha Setu WRO Future Innovators video"
                        aspectRatio={wroVideoSlot.aspect_ratio}
                        label="WRO project video"
                        mediaType="video"
                      />
                    )}
                    <div className="play-button" aria-hidden="true">
                      ▶
                    </div>
                  </div>
                  <p className="wro-text">
                    {getContent(wroSection, "description")}
                  </p>
                  <Link href="https://youtube.com" className="wro-link">
                    {getContent(wroSection, "cta_text")}{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </aside>
              )}
            </div>
          </section>
        )}

        {/* LEARN. EXPLORE. CELEBRATE SECTION */}
        {learnSection && (
          <section className="learn-section">
            <div className="learn-container">
              <h2 className="section-title">
                {getContent(learnSection, "heading")}
              </h2>
              <div className="cards-grid">
                {LEARN_CARDS.map((card) => {
                  const slot = getSlot(learnSection, card.slotKey);
                  return (
                    <div className="learn-card" key={card.slotKey}>
                      <div className="card-icon">
                        {slot && (
                          <SlotMedia
                            url={media(slot)?.url ?? null}
                            sourceUrl={media(slot)?.sourceUrl ?? null}
                            altText={card.altText}
                            aspectRatio={slot.aspect_ratio}
                            label={card.placeholderLabel}
                            {...framing(media(slot))}
                          />
                        )}
                      </div>
                      <div className="learn-card__body">
                        <h3>{card.title}</h3>
                        <p>{card.body}</p>
                        <Link href={card.href} className="card-link">
                          {card.cta} <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* VOICES THAT INSPIRE + MEET MY BHASHASETU
          The reference places the testimonials and the chat panel side by side
          in a single band, not as two stacked sections. */}
        {(voicesSection || chatSection) && (
          <section className="community-band">
            <div className="community-container">
              {voicesSection && (
                <div className="voices-column">
                  <h2 className="section-title">
                    {getContent(voicesSection, "heading")}
                  </h2>
                  <div className="testimonials-grid">
                    {TESTIMONIALS.map((person) => {
                      const slot = getSlot(voicesSection, person.slotKey);
                      return (
                        <figure className="testimonial" key={person.slotKey}>
                          <div className="testimonial-image">
                            {slot && (
                              <SlotMedia
                                url={media(slot)?.url ?? null}
                                sourceUrl={media(slot)?.sourceUrl ?? null}
                                altText={`Portrait of ${person.name}`}
                                aspectRatio={slot.aspect_ratio}
                                label="Portrait"
                                {...framing(media(slot))}
                              />
                            )}
                          </div>
                          <div className="testimonial-body">
                            <blockquote className="testimonial-quote">
                              &ldquo;{person.quote}&rdquo;
                            </blockquote>
                            <figcaption>
                              <span className="testimonial-author">
                                &ndash; {person.name}
                              </span>
                              <span className="testimonial-role">
                                {person.role}
                              </span>
                            </figcaption>
                          </div>
                        </figure>
                      );
                    })}
                  </div>
                </div>
              )}

              {chatSection && (
                <div className="home-chat-panel">
                  <div className="chat-content">
                    <div className="chat-heading">
                      <h2>{getContent(chatSection, "title")}</h2>
                      <span className="companion-badge">
                        Your Learning Companion
                      </span>
                    </div>
                    <p className="chat-description">
                      {getContent(chatSection, "description")}
                    </p>
                    <ul className="chat-features">
                      <li>Ask questions</li>
                      <li>Practice words</li>
                      <li>Explore stories</li>
                      <li>Record your voice</li>
                    </ul>
                    <Link href="/chat" className="btn btn-chat">
                      Chat Now
                    </Link>
                  </div>
                  <div className="chat-robot">
                    {robotSlot && (
                      <SlotMedia
                        url={media(robotSlot)?.url ?? null}
                        sourceUrl={media(robotSlot)?.sourceUrl ?? null}
                        altText="The Bhasha Setu robot, your learning companion"
                        aspectRatio={robotSlot.aspect_ratio}
                        label="Robot"
                        {...framing(media(robotSlot))}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* VALUE PROPOSITIONS SECTION */}
        <section className="values-section">
          <div className="values-container">
            <div className="value-box">
              <div className="value-icon">👥</div>
              <div className="value-box__body">
                <h4>Student-Built</h4>
                <p>Designed and developed by young innovators.</p>
              </div>
            </div>
            <div className="value-box">
              <div className="value-icon">🤝</div>
              <div className="value-box__body">
                <h4>Community-Driven</h4>
                <p>Created with elders, educators and community members.</p>
              </div>
            </div>
            <div className="value-box">
              <div className="value-icon">✓</div>
              <div className="value-box__body">
                <h4>Verified Content</h4>
                <p>All learning content is reviewed and community-verified.</p>
              </div>
            </div>
            <div className="value-box">
              <div className="value-icon">🌱</div>
              <div className="value-box__body">
                <h4>Preserving Heritage</h4>
                <p>Documenting today for generations to come.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
