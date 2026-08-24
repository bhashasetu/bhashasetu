import { createClient } from "@/lib/supabase/server";
import { HomepageContentEditor } from "@/components/admin/HomepageContentEditor";

export const dynamic = "force-dynamic";

/**
 * Homepage Content module (CLAUDE.md section 13).
 * One screen manages the editorial copy and media slots for both the desktop
 * homepage and the mobile home screen, which share a single `homepage` record.
 */
export default async function HomepageContentPage() {
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("pages")
    .select(
      `
      id, title, slug, status,
      page_sections(
        id, section_key, title, section_type, display_order, status,
        page_content(id, field_key, content, field_type, status),
        media_slots(
          id, slot_key, media_type, aspect_ratio, status,
          slot_media_assignments(status),
          generation_prompts(provider, model_name)
        )
      )
      `
    )
    .eq("slug", "homepage")
    .single();

  if (error || !page) {
    return (
      <div className="admin-card">
        <h2>Homepage not found</h2>
        <p className="admin-page-intro">
          No page with slug <code>homepage</code> exists yet. Run the homepage
          migrations, then reload this screen.
        </p>
      </div>
    );
  }

  return (
    <HomepageContentEditor
      pageId={page.id}
      pageTitle={page.title}
      pageStatus={page.status}
      sections={page.page_sections ?? []}
    />
  );
}
