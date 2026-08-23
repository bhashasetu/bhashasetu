import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AudioPlayer } from "@/components/public/AudioPlayer";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch homepage content and media from CMS
  const { data: homepage } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        media_slots(
          *,
          slot_media_assignments(
            *,
            media_asset:media_assets(*)
          )
        ),
        page_content(*)
      )
      `
    )
    .eq("slug", "homepage")
    .eq("status", "published")
    .single();

  if (!homepage) {
    // Fallback to minimal homepage if not in CMS
    return (
      <main>
        <h1>Bhasha Setu</h1>
        <p>Bridging Voices. Preserving Heritage.</p>
        <p>
          <Link href="/learn">Start Learning</Link>
        </p>
      </main>
    );
  }

  // Extract sections by key for easier access
  const heroSection = homepage.page_sections?.find(
    (s) => s.section_key === "hero"
  );
  const learnSection = homepage.page_sections?.find(
    (s) => s.section_key === "learn_explore"
  );
  const voicesSection = homepage.page_sections?.find(
    (s) => s.section_key === "voices_inspire"
  );
  const chatSection = homepage.page_sections?.find(
    (s) => s.section_key === "my_bhasha_setu"
  );
  const wroSection = homepage.page_sections?.find(
    (s) => s.section_key === "wro_project"
  );

  // Helper to get content field
  const getContent = (
    section: any,
    fieldKey: string
  ): string | undefined => {
    return section?.page_content?.find((c) => c.field_key === fieldKey)
      ?.content;
  };

  // Helper to get first media asset from slot
  const getSlotMedia = (section: any, slotKey: string) => {
    const slot = section?.media_slots?.find((s) => s.slot_key === slotKey);
    return slot?.slot_media_assignments?.[0]?.media_asset;
  };

  return (
    <main>
      {/* Hero Section */}
      {heroSection && (
        <section>
          <h1>{getContent(heroSection, "heading") || "Bhasha Setu"}</h1>
          <p>
            {getContent(heroSection, "description") ||
              "Bridging Voices. Preserving Heritage."}
          </p>

          {/* Hero media slot */}
          {getSlotMedia(heroSection, "hero_image") && (
            <img
              src={getSlotMedia(heroSection, "hero_image")?.title}
              alt={
                getSlotMedia(heroSection, "hero_image")?.alt_text ||
                "Bhasha Setu robot"
              }
            />
          )}

          <p>
            <Link href="/learn">Start Learning</Link>
          </p>
        </section>
      )}

      {/* WRO Project Section */}
      {wroSection && (
        <section>
          <h2>{getContent(wroSection, "title") || "Our WRO Project"}</h2>

          {/* WRO video slot */}
          {getSlotMedia(wroSection, "video") && (
            <video controls>
              <source
                src={getSlotMedia(wroSection, "video")?.title}
                type="video/mp4"
              />
            </video>
          )}

          <p>{getContent(wroSection, "description")}</p>
        </section>
      )}

      {/* Learn. Explore. Celebrate Section */}
      {learnSection && (
        <section>
          <h2>{getContent(learnSection, "heading")}</h2>

          {/* Language cards with images */}
          <div>
            {learnSection.media_slots
              ?.filter((s) => s.slot_key === "warli_image")
              .flatMap((s) => s.slot_media_assignments)
              .map((assign) => (
                <div key={assign.id}>
                  <h3>Warli Language</h3>
                  {assign.media_asset && (
                    <img
                      src={assign.media_asset.title}
                      alt={assign.media_asset.alt_text || "Warli illustration"}
                    />
                  )}
                  <p>Explore words, phrases, songs and stories from the Warli community.</p>
                  <Link href="/learn/warli">Explore Warli</Link>
                </div>
              ))}
          </div>

          <div>
            {learnSection.media_slots
              ?.filter((s) => s.slot_key === "katkari_image")
              .flatMap((s) => s.slot_media_assignments)
              .map((assign) => (
                <div key={assign.id}>
                  <h3>Katkari Language</h3>
                  {assign.media_asset && (
                    <img
                      src={assign.media_asset.title}
                      alt={assign.media_asset.alt_text || "Katkari illustration"}
                    />
                  )}
                  <p>Discover the rich oral traditions and everyday expressions of Katkari.</p>
                  <Link href="/learn/katkari">Explore Katkari</Link>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Voices That Inspire Section */}
      {voicesSection && (
        <section>
          <h2>{getContent(voicesSection, "heading")}</h2>
          <p>{getContent(voicesSection, "description")}</p>

          {/* Interview/testimonial cards */}
          {voicesSection.media_slots
            ?.filter((s) => s.slot_key?.startsWith("interview_"))
            .flatMap((s) => s.slot_media_assignments)
            .map((assign) => (
              <article key={assign.id}>
                {assign.media_asset && (
                  <img
                    src={assign.media_asset.title}
                    alt={assign.media_asset.alt_text || "Interview participant"}
                  />
                )}
                <p>
                  <em>"{assign.media_asset?.description}"</em>
                </p>
              </article>
            ))}
        </section>
      )}

      {/* My BhashaSetu Section */}
      {chatSection && (
        <section>
          <h2>{getContent(chatSection, "title")}</h2>
          <p>{getContent(chatSection, "description")}</p>

          {/* Robot image slot */}
          {getSlotMedia(chatSection, "robot_image") && (
            <img
              src={getSlotMedia(chatSection, "robot_image")?.title}
              alt="My BhashaSetu chat assistant robot"
            />
          )}

          <ul>
            <li>Ask questions</li>
            <li>Explore stories</li>
            <li>Record your voice</li>
          </ul>

          <button>Chat Now</button>
        </section>
      )}

      {/* Navigation */}
      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
