import { createClient } from "@/lib/supabase/server";
import {
  HomepageContentEditor,
  type Section,
} from "@/components/admin/HomepageContentEditor";

export const dynamic = "force-dynamic";

/**
 * Without generated Supabase types, a to-one embed (slot_media_assignments
 * -> media_assets, a many-to-one via media_asset_id) is typed as an array
 * regardless of its actual single-row shape at runtime. Normalize it once
 * here so the editor components can work with a plain object.
 */
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

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
          slot_media_assignments(
            status,
            media_asset:media_assets(id, filename, title)
          ),
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

  const sections: Section[] = (page.page_sections ?? []).map((s) => ({
    id: s.id,
    section_key: s.section_key,
    title: s.title,
    section_type: s.section_type,
    display_order: s.display_order,
    status: s.status,
    page_content: s.page_content ?? [],
    media_slots: (s.media_slots ?? []).map((m) => ({
      id: m.id,
      slot_key: m.slot_key,
      media_type: m.media_type,
      aspect_ratio: m.aspect_ratio,
      status: m.status,
      slot_media_assignments: (m.slot_media_assignments ?? []).map((a) => ({
        status: a.status,
        media_asset: firstOrSelf(a.media_asset),
      })),
      generation_prompts: m.generation_prompts ?? [],
    })),
  }));

  return (
    <HomepageContentEditor
      pageId={page.id}
      pageTitle={page.title}
      pageStatus={page.status}
      sections={sections}
    />
  );
}
