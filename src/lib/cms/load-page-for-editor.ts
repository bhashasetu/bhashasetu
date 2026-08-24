import { createClient } from "@/lib/supabase/server";
import type { Section } from "@/components/admin/PageContentEditor";

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

export type EditablePage = {
  id: string;
  title: string;
  slug: string;
  status: string;
  sections: Section[];
};

/**
 * Load one CMS page with everything the Back Office editor needs.
 *
 * This query lived inline in the Homepage Content screen with the slug
 * hardcoded. Lifted out, /admin/homepage and /admin/stories/content differ
 * only by the slug they pass.
 */
export async function loadPageForEditor(
  slug: string
): Promise<EditablePage | null> {
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
            created_at,
            media_asset:media_assets(id, filename, title)
          ),
          generation_prompts(provider, model_name)
        )
      )
      `
    )
    .eq("slug", slug)
    .single();

  if (error || !page) return null;

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    sections: (page.page_sections ?? []).map((s) => ({
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
          created_at: a.created_at,
          media_asset: firstOrSelf(a.media_asset),
        })),
        generation_prompts: m.generation_prompts ?? [],
      })),
    })),
  };
}
