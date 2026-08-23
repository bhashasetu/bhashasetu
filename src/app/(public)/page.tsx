import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MediaSlotImage } from "@/components/public/MediaSlotImage";

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
          id,
          slot_key,
          media_type,
          aspect_ratio
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
    (s: any) => s.section_key === "hero"
  );
  const learnSection = homepage.page_sections?.find(
    (s: any) => s.section_key === "learn_explore"
  );
  const voicesSection = homepage.page_sections?.find(
    (s: any) => s.section_key === "voices_inspire"
  );
  const chatSection = homepage.page_sections?.find(
    (s: any) => s.section_key === "my_bhasha_setu"
  );
  const wroSection = homepage.page_sections?.find(
    (s: any) => s.section_key === "wro_project"
  );

  // Helper to get content field
  const getContent = (
    section: any,
    fieldKey: string
  ): string | undefined => {
    return section?.page_content?.find((c: any) => c.field_key === fieldKey)
      ?.content;
  };

  // Helper to get slot by key
  const getSlot = (section: any, slotKey: string) => {
    return section?.media_slots?.find((s: any) => s.slot_key === slotKey);
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
          {getSlot(heroSection, "hero_image") && (
            <MediaSlotImage
              slotId={getSlot(heroSection, "hero_image").id}
              altText="Bhasha Setu hero illustration"
              aspectRatio={getSlot(heroSection, "hero_image").aspect_ratio}
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

          {/* WRO video slot - uses same media endpoint */}
          {getSlot(wroSection, "video") && (
            <video controls style={{ width: "100%", maxWidth: "100%" }}>
              <source
                src={`/api/public/media-slot?slot_id=${getSlot(wroSection, "video").id}`}
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          )}

          <p>{getContent(wroSection, "description")}</p>
        </section>
      )}

      {/* Learn. Explore. Celebrate Section */}
      {learnSection && (
        <section>
          <h2>{getContent(learnSection, "heading") || "Learn. Explore. Celebrate."}</h2>

          {/* Language cards with images */}
          <div>
            {getSlot(learnSection, "warli_image") && (
              <div>
                <h3>Warli Language</h3>
                <MediaSlotImage
                  slotId={getSlot(learnSection, "warli_image").id}
                  altText="Warli tribal art illustration"
                  aspectRatio="1:1"
                />
                <p>Explore words, phrases, songs and stories from the Warli community.</p>
                <Link href="/learn/warli">Explore Warli</Link>
              </div>
            )}
          </div>

          <div>
            {getSlot(learnSection, "katkari_image") && (
              <div>
                <h3>Katkari Language</h3>
                <MediaSlotImage
                  slotId={getSlot(learnSection, "katkari_image").id}
                  altText="Katkari cultural illustration"
                  aspectRatio="1:1"
                />
                <p>Discover the rich oral traditions and everyday expressions of Katkari.</p>
                <Link href="/learn/katkari">Explore Katkari</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Voices That Inspire Section */}
      {voicesSection && (
        <section>
          <h2>{getContent(voicesSection, "heading") || "Voices That Inspire"}</h2>
          <p>{getContent(voicesSection, "description")}</p>

          {/* Interview/testimonial slots */}
          {voicesSection.media_slots
            ?.filter((s: any) => s.slot_key?.startsWith("interview_"))
            .map((slot: any) => (
              <article key={slot.id}>
                <MediaSlotImage
                  slotId={slot.id}
                  altText="Interview participant"
                  aspectRatio="1:1"
                />
              </article>
            ))}
        </section>
      )}

      {/* My BhashaSetu Section */}
      {chatSection && (
        <section>
          <h2>{getContent(chatSection, "title") || "Meet My BhashaSetu"}</h2>
          <p>{getContent(chatSection, "description")}</p>

          {/* Robot image slot */}
          {getSlot(chatSection, "robot_image") && (
            <MediaSlotImage
              slotId={getSlot(chatSection, "robot_image").id}
              altText="My BhashaSetu chat assistant robot"
              aspectRatio="1:1"
            />
          )}

          <ul>
            <li>Ask questions</li>
            <li>Explore stories</li>
            <li>Record your voice</li>
          </ul>

          <Link href="/chat">Chat Now</Link>
        </section>
      )}

      {/* Navigation */}
      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
