import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EditPagePage({
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

  const statusOptions = ["draft", "published", "archived"];
  const pageTypeOptions = ["homepage", "stories", "heritage", "chat", "landing"];

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <h1>Edit Page: {page.title}</h1>

      {/* Page Metadata Section */}
      <section style={{ marginBottom: "30px", padding: "20px", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
        <h2>Page Settings</h2>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Title:</strong>
            <br />
            <input
              type="text"
              defaultValue={page.title}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              placeholder="Page title"
            />
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Slug:</strong>
            <br />
            <input
              type="text"
              defaultValue={page.slug}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              placeholder="URL slug"
              readOnly
            />
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Description:</strong>
            <br />
            <textarea
              defaultValue={page.description || ""}
              style={{ width: "100%", padding: "8px", marginTop: "5px", minHeight: "80px" }}
              placeholder="Page description for SEO"
            />
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Page Type:</strong>
            <br />
            <select
              defaultValue={page.page_type}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            >
              {pageTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>Status:</strong>
            <br />
            <select
              defaultValue={page.status}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Save Changes
        </button>
      </section>

      {/* Sections Management */}
      <section style={{ marginBottom: "30px" }}>
        <h2>Page Sections</h2>

        {page.page_sections && page.page_sections.length > 0 ? (
          <div>
            {page.page_sections.map((section: any) => (
              <div
                key={section.id}
                style={{
                  marginBottom: "20px",
                  padding: "20px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  backgroundColor: "#fafafa",
                }}
              >
                <h3>{section.title || section.section_key}</h3>

                <div style={{ marginBottom: "10px", fontSize: "14px", color: "#666" }}>
                  <p>
                    <strong>Key:</strong> {section.section_key}
                  </p>
                  <p>
                    <strong>Type:</strong> {section.section_type}
                  </p>
                  <p>
                    <strong>Status:</strong> {section.status}
                  </p>
                </div>

                {/* Media Slots for this Section */}
                {section.media_slots && section.media_slots.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <h4>Media Slots ({section.media_slots.length})</h4>
                    {section.media_slots.map((slot: any) => (
                      <div
                        key={slot.id}
                        style={{
                          marginBottom: "10px",
                          padding: "10px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      >
                        <strong>{slot.slot_key}</strong> ({slot.media_type})
                        {slot.aspect_ratio && <span> - {slot.aspect_ratio}</span>}

                        {/* Current Assignment */}
                        {slot.slot_media_assignments && slot.slot_media_assignments.length > 0 && (
                          <div style={{ marginTop: "8px", fontSize: "13px", color: "#555" }}>
                            <em>Assigned:</em> {slot.slot_media_assignments[0].media_asset?.title || slot.slot_media_assignments[0].media_asset?.filename}
                            <br />
                            Status: {slot.slot_media_assignments[0].media_asset?.status}
                          </div>
                        )}

                        {/* Available Generation Prompts */}
                        {slot.generation_prompts && slot.generation_prompts.length > 0 && (
                          <div style={{ marginTop: "8px", fontSize: "13px" }}>
                            <em>Generation Prompts:</em>
                            <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                              {slot.generation_prompts.map((prompt: any) => (
                                <li key={prompt.id}>
                                  <strong>{prompt.provider}</strong>
                                  {prompt.model_name && ` (${prompt.model_name})`}
                                  <br />
                                  <small style={{ color: "#888" }}>
                                    {prompt.prompt_text.substring(0, 60)}...
                                  </small>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div style={{ marginTop: "8px" }}>
                          <Link
                            href={`/admin/pages/${id}/slots/${slot.id}`}
                            style={{
                              display: "inline-block",
                              padding: "6px 12px",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              textDecoration: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                            }}
                          >
                            Manage Media
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Page Content Fields */}
                {section.page_content && section.page_content.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <h4>Content Fields ({section.page_content.length})</h4>
                    {section.page_content.map((content: any) => (
                      <div
                        key={content.id}
                        style={{
                          marginBottom: "10px",
                          padding: "10px",
                          backgroundColor: "#f0f8ff",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      >
                        <strong>{content.field_key}</strong> ({content.field_type})
                        {content.content && (
                          <p style={{ marginTop: "5px", fontSize: "13px", color: "#555" }}>
                            {content.content.substring(0, 80)}
                            {content.content.length > 80 ? "..." : ""}
                          </p>
                        )}
                        <Link
                          href={`/admin/pages/${id}/content/${content.id}`}
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            backgroundColor: "#10b981",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "3px",
                            fontSize: "12px",
                            marginTop: "5px",
                          }}
                        >
                          Edit
                        </Link>
                      </div>
                    ))}
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
        <Link href={`/admin/pages/${id}`}>← Back to page detail</Link>
      </p>
    </main>
  );
}
