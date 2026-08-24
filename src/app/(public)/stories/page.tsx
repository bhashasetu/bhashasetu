import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MediaSlotImage } from "@/components/public/MediaSlotImage";
import { findContent, findSection, findSlot } from "@/lib/cms/page-content";

export default async function StoriesPage() {
  const supabase = await createClient();

  const { data: storiesPage } = await supabase
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
    .eq("slug", "stories-voices")
    .eq("status", "published")
    .single();

  if (!storiesPage) {
    return (
      <main>
        <h1>Stories & Voices</h1>
        <p>Inspiring stories from the Warli and Katkari communities.</p>
        <Link href="/">← Home</Link>
      </main>
    );
  }

  const getSection = (sectionKey: string) =>
    findSection(storiesPage.page_sections, sectionKey);
  const getContent = findContent;
  const getSlot = findSlot;

  const featuredSection = getSection("featured_interview");
  // Bound once: guarding on getSlot(...) then calling it again to read .id
  // means the guard never narrows the second call.
  const featuredThumbnail = getSlot(featuredSection, "interview_thumbnail");
  const gridSection = getSection("interview_grid");

  return (
    <main>
      <h1>{storiesPage.title || "Stories & Voices"}</h1>
      <p>{storiesPage.description}</p>

      {/* Featured Interview */}
      {featuredSection && (
        <section>
          <h2>{getContent(featuredSection, "heading") || "Featured Voice"}</h2>

          {featuredThumbnail && (
            <MediaSlotImage
              slotId={featuredThumbnail.id}
              altText="Featured interview"
              aspectRatio="16:9"
            />
          )}

          <p>{getContent(featuredSection, "description")}</p>
          <Link href="#interviews">View all interviews</Link>
        </section>
      )}

      {/* Interview Grid */}
      {gridSection && (
        <section id="interviews">
          <h2>{getContent(gridSection, "heading") || "All Interviews"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
            {gridSection.media_slots
              ?.filter((s) => s.slot_key?.startsWith("interview_"))
              .sort((a, b) => {
                const aNum = parseInt(a.slot_key.replace("interview_", "")) || 0;
                const bNum = parseInt(b.slot_key.replace("interview_", "")) || 0;
                return aNum - bNum;
              })
              .map((slot) => (
                <article key={slot.id}>
                  <MediaSlotImage
                    slotId={slot.id}
                    altText="Interview participant"
                    aspectRatio="1:1"
                  />
                </article>
              ))}
          </div>
        </section>
      )}

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
