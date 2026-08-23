import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MediaSlotImage } from "@/components/public/MediaSlotImage";
import "./homepage.css";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch homepage with all sections and media
  // The migration (0008_homepage_complete.sql) should have seeded this data
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
    .eq("status", "draft")
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
    <div className="homepage">
      {/* HERO SECTION */}
      {heroSection && (
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-content">
              <div className="verified-badge">
                <span>✓</span> Verified Learning Content
              </div>
              <h1 className="hero-heading">
                {getContent(heroSection, "heading")}
              </h1>
              <p className="hero-description">
                {getContent(heroSection, "description")}
              </p>
              <div className="hero-tagline">
                <span className="tagline-icon">👥</span>
                Built by students. Rooted in community. Driven by purpose.
              </div>
              <div className="hero-buttons">
                <Link href="/learn" className="btn btn-primary">
                  Start Learning <span>→</span>
                </Link>
                <Link href="/languages" className="btn btn-secondary">
                  Explore Languages
                </Link>
              </div>
            </div>

            <div className="hero-media">
              {getSlot(heroSection, "hero_image") && (
                <MediaSlotImage
                  slotId={getSlot(heroSection, "hero_image").id}
                  altText="Bhasha Setu learning platform"
                  aspectRatio="16:9"
                />
              )}
            </div>
          </div>

          {/* WRO PROJECT (integrated into hero area) */}
          {wroSection && (
            <div className="wro-section">
              <div className="wro-container">
                <div className="wro-title">
                  {getContent(wroSection, "title")}
                </div>
                <div className="wro-content">
                  <div className="wro-video">
                    {getSlot(wroSection, "wro_video") && (
                      <div className="video-placeholder">
                        <div className="play-button">▶</div>
                        {getSlot(wroSection, "wro_video") && (
                          <MediaSlotImage
                            slotId={getSlot(wroSection, "wro_video").id}
                            altText="WRO Project video"
                            aspectRatio="16:9"
                          />
                        )}
                      </div>
                    )}
                    <div className="video-time">0:00 / 1:30</div>
                  </div>
                  <div className="wro-text">
                    <p>{getContent(wroSection, "description")}</p>
                    <Link href="https://youtube.com" className="wro-link">
                      {getContent(wroSection, "cta_text")} →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              {/* Warli Card */}
              <div className="learn-card">
                <div className="card-icon">
                  {getSlot(learnSection, "card_warli_image") && (
                    <MediaSlotImage
                      slotId={getSlot(learnSection, "card_warli_image").id}
                      altText="Warli language"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <h3>Warli Language</h3>
                <p>Explore words, phrases, songs and stories from the Warli community.</p>
                <Link href="/learn/warli" className="card-link">
                  Explore Warli →
                </Link>
              </div>

              {/* Katkari Card */}
              <div className="learn-card">
                <div className="card-icon">
                  {getSlot(learnSection, "card_katkari_image") && (
                    <MediaSlotImage
                      slotId={getSlot(learnSection, "card_katkari_image").id}
                      altText="Katkari language"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <h3>Katkari Language</h3>
                <p>Discover the rich oral traditions and everyday expressions of Katkari.</p>
                <Link href="/learn/katkari" className="card-link">
                  Explore Katkari →
                </Link>
              </div>

              {/* Play & Learn Card */}
              <div className="learn-card">
                <div className="card-icon">
                  {getSlot(learnSection, "card_play_image") && (
                    <MediaSlotImage
                      slotId={getSlot(learnSection, "card_play_image").id}
                      altText="Play and learn"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <h3>Play & Learn</h3>
                <p>Games, quizzes and activities that make learning joyful.</p>
                <Link href="/play" className="card-link">
                  Start Playing →
                </Link>
              </div>

              {/* Stories & Voices Card */}
              <div className="learn-card">
                <div className="card-icon">
                  {getSlot(learnSection, "card_stories_image") && (
                    <MediaSlotImage
                      slotId={getSlot(learnSection, "card_stories_image").id}
                      altText="Stories and voices"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <h3>Stories & Voices</h3>
                <p>Real stories. Real people. Voices from our communities.</p>
                <Link href="/stories" className="card-link">
                  Listen Now →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VOICES THAT INSPIRE SECTION */}
      {voicesSection && (
        <section className="voices-section">
          <div className="voices-container">
            <h2 className="section-title">
              {getContent(voicesSection, "heading")}
            </h2>
            <div className="testimonials-grid">
              {/* Testimonial 1 */}
              <div className="testimonial">
                <div className="testimonial-image">
                  {getSlot(voicesSection, "testimonial_1_image") && (
                    <MediaSlotImage
                      slotId={getSlot(voicesSection, "testimonial_1_image").id}
                      altText="Bhagwan Kharvi"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <p className="testimonial-quote">
                  "Our language carries our memories, our values and our way of life."
                </p>
                <p className="testimonial-author">Bhagwan Kharvi</p>
                <p className="testimonial-role">Warli Community Elder</p>
              </div>

              {/* Testimonial 2 */}
              <div className="testimonial">
                <div className="testimonial-image">
                  {getSlot(voicesSection, "testimonial_2_image") && (
                    <MediaSlotImage
                      slotId={getSlot(voicesSection, "testimonial_2_image").id}
                      altText="Sushila Bhoye"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <p className="testimonial-quote">
                  "When our children learn our language, our culture lives on."
                </p>
                <p className="testimonial-author">Sushila Bhoye</p>
                <p className="testimonial-role">Katkari Community Member</p>
              </div>

              {/* Testimonial 3 */}
              <div className="testimonial">
                <div className="testimonial-image">
                  {getSlot(voicesSection, "testimonial_3_image") && (
                    <MediaSlotImage
                      slotId={getSlot(voicesSection, "testimonial_3_image").id}
                      altText="Team Bhasha Setu"
                      aspectRatio="1:1"
                    />
                  )}
                </div>
                <p className="testimonial-quote">
                  "We built Bhasha Setu to give back to the communities that inspire us."
                </p>
                <p className="testimonial-author">Team Bhasha Setu</p>
                <p className="testimonial-role">Student Innovators</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MEET MY BHASHASETU SECTION */}
      {chatSection && (
        <section className="chat-section">
          <div className="chat-container">
            <div className="chat-content">
              <div className="companion-badge">Your Learning Companion</div>
              <h2>{getContent(chatSection, "title")}</h2>
              <p className="chat-description">
                {getContent(chatSection, "description")}
              </p>
              <ul className="chat-features">
                <li>✓ Ask questions</li>
                <li>✓ Explore stories</li>
                <li>✓ Record your voice</li>
              </ul>
              <Link href="/chat" className="btn btn-primary">
                Chat Now
              </Link>
            </div>
            <div className="chat-robot">
              {getSlot(chatSection, "robot_image") && (
                <MediaSlotImage
                  slotId={getSlot(chatSection, "robot_image").id}
                  altText="My BhashaSetu chat assistant"
                  aspectRatio="1:1"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* VALUE PROPOSITIONS SECTION */}
      <section className="values-section">
        <div className="values-container">
          <div className="value-box">
            <div className="value-icon">👥</div>
            <h4>Student-Built</h4>
            <p>Designed and developed by young innovators.</p>
          </div>
          <div className="value-box">
            <div className="value-icon">🤝</div>
            <h4>Community-Driven</h4>
            <p>Created with elders, educators and community members.</p>
          </div>
          <div className="value-box">
            <div className="value-icon">✓</div>
            <h4>Verified Content</h4>
            <p>All learning content is reviewed and community-verified.</p>
          </div>
          <div className="value-box">
            <div className="value-icon">🌱</div>
            <h4>Preserving Heritage</h4>
            <p>Documenting today for generations to come.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
