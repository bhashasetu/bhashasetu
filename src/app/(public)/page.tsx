import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MediaSlotImage } from "@/components/public/MediaSlotImage";
import { MobileHome } from "@/components/public/MobileHome";
import { renderAccented } from "@/lib/content/accent";
import "./homepage.css";

/**
 * Navigation targets and the labels shown while a media slot is still empty.
 * The editorial copy itself lives in the CMS; these entries only bind each
 * card to its slot and destination.
 */
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
          aspect_ratio
        )
      )
    `
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

  const sections = homepage.page_sections || [];

  // Helper functions
  const getSection = (key: string) =>
    sections.find((s: any) => s.section_key === key);
  const getContent = (section: any, field: string) =>
    section?.page_content?.find((c: any) => c.field_key === field)?.content;
  const getSlot = (section: any, key: string) =>
    section?.media_slots?.find((s: any) => s.slot_key === key);

  const heroSection = getSection("hero");
  const wroSection = getSection("wro_project");
  const learnSection = getSection("learn_explore");
  const voicesSection = getSection("voices_inspire");
  const chatSection = getSection("my_bhasha_setu");

  return (
    <>
      {/* MOBILE-05 is a distinct composition, not a reflow of the desktop
          page, so the two surfaces are separate trees switched by breakpoint. */}
      <MobileHome sections={sections} />

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
              {getSlot(heroSection, "hero_image") && (
                <MediaSlotImage
                  slotId={getSlot(heroSection, "hero_image").id}
                  altText="The Bhasha Setu WRO project vehicle"
                  aspectRatio="4:3"
                  label="WRO vehicle photograph"
                />
              )}
            </div>

            {wroSection && (
              <aside className="wro-panel">
                <h2 className="wro-title">{getContent(wroSection, "title")}</h2>
                <div className="wro-video">
                  {getSlot(wroSection, "wro_video") && (
                    <MediaSlotImage
                      slotId={getSlot(wroSection, "wro_video").id}
                      altText="Bhasha Setu WRO Future Innovators video"
                      aspectRatio="16:9"
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
                        <MediaSlotImage
                          slotId={slot.id}
                          altText={card.altText}
                          aspectRatio="1:1"
                          label={card.placeholderLabel}
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
                            <MediaSlotImage
                              slotId={slot.id}
                              altText={`Portrait of ${person.name}`}
                              aspectRatio="1:1"
                              label="Portrait"
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
              <div className="chat-panel">
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
                  {getSlot(chatSection, "robot_image") && (
                    <MediaSlotImage
                      slotId={getSlot(chatSection, "robot_image").id}
                      altText="The Bhasha Setu robot, your learning companion"
                      aspectRatio="1:1"
                      label="Robot"
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
