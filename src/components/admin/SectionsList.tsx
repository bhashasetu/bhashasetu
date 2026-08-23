import Link from "next/link";

type Section = {
  id: string;
  section_key: string;
  title: string | null;
  section_type: string;
  status: string;
  media_slots?: Array<{
    id: string;
    slot_key: string;
    media_type: string;
    aspect_ratio?: string;
    generation_prompts?: Array<{
      id: string;
      provider: string;
      model_name?: string;
      prompt_text: string;
    }>;
    slot_media_assignments?: Array<{
      id: string;
      media_asset: {
        id: string;
        filename: string;
        title?: string;
        status: string;
      };
    }>;
  }>;
  page_content?: Array<{
    id: string;
    field_key: string;
    field_type: string;
    content?: string;
  }>;
};

export function SectionsList({
  pageId,
  sections,
}: {
  pageId: string;
  sections: Section[];
}) {
  return (
    <section style={{ marginBottom: "30px" }}>
      <h2>Page Sections</h2>

      {sections.length > 0 ? (
        <div>
          {sections.map((section) => (
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

              {/* Media Slots */}
              {section.media_slots && section.media_slots.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <h4>Media Slots ({section.media_slots.length})</h4>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {section.media_slots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      >
                        <div style={{ marginBottom: "8px" }}>
                          <strong>{slot.slot_key}</strong>
                          <span style={{ color: "#666", marginLeft: "10px" }}>
                            {slot.media_type}
                            {slot.aspect_ratio && ` • ${slot.aspect_ratio}`}
                          </span>
                        </div>

                        {/* Current Assignment */}
                        {slot.slot_media_assignments && slot.slot_media_assignments.length > 0 && (
                          <div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                            <em>Assigned:</em> {slot.slot_media_assignments[0].media_asset?.title || slot.slot_media_assignments[0].media_asset?.filename}
                            <br />
                            <span style={{ color: "#888" }}>Status: {slot.slot_media_assignments[0].media_asset?.status}</span>
                          </div>
                        )}
                        {(!slot.slot_media_assignments || slot.slot_media_assignments.length === 0) && (
                          <div style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>
                            <em>No media assigned</em>
                          </div>
                        )}

                        {/* Generation Prompts */}
                        {slot.generation_prompts && slot.generation_prompts.length > 0 && (
                          <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                            <em>Providers:</em> {slot.generation_prompts.map((p) => p.provider).join(", ")}
                          </div>
                        )}

                        <Link
                          href={`/admin/pages/${pageId}/slots/${slot.id}`}
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
                    ))}
                  </div>
                </div>
              )}

              {/* Content Fields */}
              {section.page_content && section.page_content.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <h4>Content Fields ({section.page_content.length})</h4>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {section.page_content.map((content) => (
                      <div
                        key={content.id}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f0f8ff",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      >
                        <div style={{ marginBottom: "6px" }}>
                          <strong>{content.field_key}</strong>
                          <span style={{ color: "#666", marginLeft: "10px", fontSize: "12px" }}>
                            {content.field_type}
                          </span>
                        </div>
                        {content.content && (
                          <p style={{ marginTop: "5px", fontSize: "13px", color: "#555", margin: "5px 0" }}>
                            {content.content.substring(0, 100)}
                            {content.content.length > 100 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No sections defined yet.</p>
      )}
    </section>
  );
}
