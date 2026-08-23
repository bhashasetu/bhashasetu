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

  // Fallback data structure for homepage (matches 0008_homepage_complete.sql)
  const fallbackHomepage = {
    id: "fallback",
    slug: "homepage",
    title: "Bhasha Setu - Learn & Celebrate Indigenous Languages",
    description: "Bridge to our languages. Bridge to our future. Learn Warli and Katkari through student-built, community-driven platform.",
    status: "draft",
    page_type: "landing",
    page_sections: [
      {
        id: "hero",
        section_key: "hero",
        title: "Hero Section",
        section_type: "hero",
        status: "draft",
        page_content: [
          { field_key: "heading", content: "Bridge to Our Languages. Bridge to Our Future.", content_type: "text" },
          { field_key: "description", content: "Bhasha Setu is a student-built platform to help the world learn and celebrate the languages of the Warli and Katkari communities.", content_type: "text" },
        ],
        media_slots: [
          { id: "hero_image", slot_key: "hero_image", media_type: "image", aspect_ratio: "16:9" },
        ],
      },
      {
        id: "wro_project",
        section_key: "wro_project",
        title: "WRO Project Section",
        section_type: "hero",
        status: "draft",
        page_content: [
          { field_key: "title", content: "Our WRO Project (90 sec)", content_type: "text" },
          { field_key: "description", content: "See how we built Bhasha Setu to document, learn, and celebrate the languages of Warli and Katkari.", content_type: "text" },
          { field_key: "cta_text", content: "Watch on YouTube", content_type: "text" },
        ],
        media_slots: [
          { id: "wro_video", slot_key: "wro_video", media_type: "video", aspect_ratio: "16:9" },
        ],
      },
      {
        id: "learn_explore",
        section_key: "learn_explore",
        title: "Learn. Explore. Celebrate.",
        section_type: "media_grid",
        status: "draft",
        page_content: [
          { field_key: "heading", content: "Learn. Explore. Celebrate.", content_type: "text" },
        ],
        media_slots: [
          { id: "card_warli", slot_key: "card_warli_image", media_type: "image", aspect_ratio: "1:1" },
          { id: "card_katkari", slot_key: "card_katkari_image", media_type: "image", aspect_ratio: "1:1" },
          { id: "card_play", slot_key: "card_play_image", media_type: "image", aspect_ratio: "1:1" },
          { id: "card_stories", slot_key: "card_stories_image", media_type: "image", aspect_ratio: "1:1" },
        ],
      },
      {
        id: "voices_inspire",
        section_key: "voices_inspire",
        title: "Voices That Inspire",
        section_type: "media_grid",
        status: "draft",
        page_content: [
          { field_key: "heading", content: "Voices That Inspire", content_type: "text" },
        ],
        media_slots: [
          { id: "test_1", slot_key: "testimonial_1_image", media_type: "image", aspect_ratio: "1:1" },
          { id: "test_2", slot_key: "testimonial_2_image", media_type: "image", aspect_ratio: "1:1" },
          { id: "test_3", slot_key: "testimonial_3_image", media_type: "image", aspect_ratio: "1:1" },
        ],
      },
      {
        id: "my_bhasha_setu",
        section_key: "my_bhasha_setu",
        title: "Meet My BhashaSetu",
        section_type: "hero",
        status: "draft",
        page_content: [
          { field_key: "title", content: "Meet My BhashaSetu", content_type: "text" },
          { field_key: "description", content: "Chat with our AI assistant in simple English or your language. Ask questions • Explore stories • Record your voice", content_type: "text" },
        ],
        media_slots: [
          { id: "robot", slot_key: "robot_image", media_type: "image", aspect_ratio: "1:1" },
        ],
      },
    ],
  };

  const pageData = homepage || fallbackHomepage;
  const sections = pageData.page_sections || [];

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
