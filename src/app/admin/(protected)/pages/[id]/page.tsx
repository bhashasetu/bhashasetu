import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select(
      `
      *,
      page_sections(
        *,
        media_slots(
          *,
          generation_prompts(*),
          slot_media_assignments(
            *,
            media_asset:media_assets(*)
          )
        ),
        page_content(*)
      )
      `
    )
    .eq("id", id)
    .single();

  if (pageError || !page) notFound();

  return (
    <main>
      <h1>{page.title}</h1>
      <p>Slug: {page.slug}</p>
      <p>Type: {page.page_type}</p>
      <p>Status: {page.status}</p>

      <section>
        <h2>Sections</h2>
        {page.page_sections && page.page_sections.length > 0 ? (
          <ul>
            {page.page_sections.map((section: any) => (
              <li key={section.id}>
                <strong>{section.title || section.section_key}</strong>
                <p>Type: {section.section_type}</p>

                {section.media_slots && section.media_slots.length > 0 && (
                  <div style={{ marginLeft: "20px" }}>
                    <h3>Media Slots</h3>
                    <ul>
                      {section.media_slots.map((slot: any) => (
                        <li key={slot.id}>
                          <strong>{slot.slot_key}</strong>
                          <p>Type: {slot.media_type}</p>
                          <p>Aspect Ratio: {slot.aspect_ratio}</p>

                          {slot.generation_prompts &&
                            slot.generation_prompts.length > 0 && (
                              <div style={{ marginLeft: "20px" }}>
                                <h4>Generation Prompts</h4>
                                <ul>
                                  {slot.generation_prompts.map(
                                    (prompt: any) => (
                                      <li key={prompt.id}>
                                        Provider: {prompt.provider}
                                        <br />
                                        <small>{prompt.prompt_text}</small>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {slot.slot_media_assignments &&
                            slot.slot_media_assignments.length > 0 && (
                              <div style={{ marginLeft: "20px" }}>
                                <h4>Assigned Media</h4>
                                <ul>
                                  {slot.slot_media_assignments.map(
                                    (assignment: any) => (
                                      <li key={assignment.id}>
                                        {assignment.media_asset?.title ||
                                          assignment.media_asset?.filename}
                                        <br />
                                        <small>
                                          Status: {assignment.status}
                                        </small>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.page_content && section.page_content.length > 0 && (
                  <div style={{ marginLeft: "20px" }}>
                    <h3>Content</h3>
                    <ul>
                      {section.page_content.map((content: any) => (
                        <li key={content.id}>
                          <strong>{content.field_key}</strong>
                          <p>Type: {content.field_type}</p>
                          {content.content && (
                            <p>
                              <small>{content.content.substring(0, 100)}</small>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No sections defined yet.</p>
        )}
      </section>

      <p>
        <Link href="/admin/pages">← Back to pages</Link>
      </p>
    </main>
  );
}
