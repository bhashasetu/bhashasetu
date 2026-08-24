import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { findContent, findSection } from "@/lib/cms/page-content";

export default async function HeritagePage() {
  const supabase = await createClient();

  const { data: heritagePage } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        page_content(*)
      )
      `
    )
    .eq("slug", "heritage")
    .eq("status", "published")
    .single();

  if (!heritagePage) {
    return (
      <main>
        <h1>Our Heritage</h1>
        <p>Explore the rich cultural heritage of Warli and Katkari communities.</p>
        <Link href="/">← Home</Link>
      </main>
    );
  }

  const getSection = (sectionKey: string) =>
    findSection(heritagePage.page_sections, sectionKey);
  const getContent = findContent;

  const warliSection = getSection("warli_heritage");
  const katkariSection = getSection("katkari_heritage");

  return (
    <main>
      <h1>{heritagePage.title || "Our Heritage"}</h1>
      <p>{heritagePage.description}</p>

      {/* Warli Heritage */}
      {warliSection && (
        <section>
          <h2>{getContent(warliSection, "title") || "Warli Culture & Heritage"}</h2>

          {getContent(warliSection, "overview") && (
            <p>{getContent(warliSection, "overview")}</p>
          )}

          {getContent(warliSection, "geography") && (
            <section>
              <h3>Geography</h3>
              <p>{getContent(warliSection, "geography")}</p>
            </section>
          )}

          {getContent(warliSection, "traditions") && (
            <section>
              <h3>Traditions & Customs</h3>
              <p>{getContent(warliSection, "traditions")}</p>
            </section>
          )}

          {getContent(warliSection, "language_notes") && (
            <section>
              <h3>About the Language</h3>
              <p>{getContent(warliSection, "language_notes")}</p>
            </section>
          )}
        </section>
      )}

      {/* Katkari Heritage */}
      {katkariSection && (
        <section>
          <h2>{getContent(katkariSection, "title") || "Katkari Culture & Heritage"}</h2>

          {getContent(katkariSection, "overview") && (
            <p>{getContent(katkariSection, "overview")}</p>
          )}

          {getContent(katkariSection, "geography") && (
            <section>
              <h3>Geography</h3>
              <p>{getContent(katkariSection, "geography")}</p>
            </section>
          )}

          {getContent(katkariSection, "traditions") && (
            <section>
              <h3>Traditions & Customs</h3>
              <p>{getContent(katkariSection, "traditions")}</p>
            </section>
          )}

          {getContent(katkariSection, "language_notes") && (
            <section>
              <h3>About the Language</h3>
              <p>{getContent(katkariSection, "language_notes")}</p>
            </section>
          )}
        </section>
      )}

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
