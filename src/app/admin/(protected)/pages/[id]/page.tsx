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
          <div>
            {page.page_sections.map((section: any) => (
              <div key={section.id} style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ccc" }}>
                <h3>{section.title || section.section_key}</h3>
                <p>Type: {section.section_type} | Status: {section.status}</p>

                {/* Media Slots */}
                {section.media_slots && section.media_slots.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <h4>Media Slots ({section.media_slots.length})</h4>
                    {section.media_slots.map((slot: any) => (
                      <div
                        key={slot.id}
                        style={{
                          marginBottom: "15px",
                          padding: "10px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                        }}
                      >
                        <strong>{slot.slot_key}</strong>
                        <p>
                          Type: {slot.media_type} | Aspect: {slot.aspect_ratio || "not specified"}
                        </p>

                        {/* Current Media Assignment */}
                        {slot.slot_media_assignments && slot.slot_media_assignments.length > 0 && (
                          <div style={{ marginTop: "10px" }}>
                            <em>Assigned Media:</em>
                            <ul>
                              {slot.slot_media_assignments.map((assign: any) => (
                                <li key={assign.id}>
                                  {assign.media_asset?.title || assign.media_asset?.filename}
                                  <br />
                                  <small>Status: {assign.media_asset?.status}</small>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!slot.slot_media_assignments || slot.slot_media_assignments.length === 0 && (
                          <p style={{ color: "#999", fontSize: "14px" }}>No media assigned yet</p>
                        )}

                        {/* Generation Prompts */}
                        {slot.generation_prompts && slot.generation_prompts.length > 0 && (
                          <div style={{ marginTop: "10px" }}>
                            <em>Generation Prompts:</em>
                            <ul>
                              {slot.generation_prompts.map((prompt: any) => (
                                <li key={prompt.id}>
                                  <strong>{prompt.provider}</strong>
                                  {prompt.model_name && ` (${prompt.model_name})`}
                                  <br />
                                  <small>{prompt.prompt_text.substring(0, 80)}...</small>
                                </li>
                              ))}
                            </ul>
                            <p style={{ fontSize: "12px", color: "#666" }}>
                              ℹ️ Use Back Office Media Slot Manager to generate images
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Page Content Fields */}
                {section.page_content && section.page_content.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <h4>Content Fields ({section.page_content.length})</h4>
                    <ul>
                      {section.page_content.map((content: any) => (
                        <li key={content.id}>
                          <strong>{content.field_key}</strong>
                          <br />
                          <small>Type: {content.field_type}</small>
                          {content.content && (
                            <p style={{ fontSize: "13px", marginTop: "5px" }}>
                              {content.content.substring(0, 100)}
                              {content.content.length > 100 ? "..." : ""}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
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
