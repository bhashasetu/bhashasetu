import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 60 minutes

export type SlotMediaUrl = {
  /** Signed URL for a stored object, null for a hosted video. */
  url: string | null;
  /** Address of a hosted video (YouTube/Vimeo), null for a stored object. */
  sourceUrl: string | null;
};

export async function getSignedSlotMediaUrl(
  supabase: SupabaseClient,
  slotId: string
): Promise<string | null> {
  return (await resolveSlotMedia(supabase, slotId))?.url ?? null;
}

/**
 * Full resolution for one slot: a signed URL for a stored file, or the
 * address of a hosted video. Storage caps a file at 50 MB on this plan, so a
 * long interview is linked rather than uploaded and has no object to sign.
 */
export async function resolveSlotMedia(
  supabase: SupabaseClient,
  slotId: string
): Promise<SlotMediaUrl | null> {
  // Get the media assignment for this slot (first one)
  // 'published' is the status the upload path writes and the RLS policy
  // gates on. This previously looked for 'active', which nothing ever set,
  // so no slot could ever resolve to an asset.
  const { data: assignment } = await supabase
    .from("slot_media_assignments")
    .select("media_asset_id")
    .eq("slot_id", slotId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) return null;

  // Get the media asset
  const { data: media } = await supabase
    .from("media_assets")
    .select("status, storage_bucket, storage_path, source_type, source_url")
    .eq("id", assignment.media_asset_id)
    .maybeSingle();

  if (!media || media.status !== "published") return null;

  // Verify the slot belongs to a published page
  const { data: slot } = await supabase
    .from("media_slots")
    .select("section_id")
    .eq("id", slotId)
    .maybeSingle();

  if (!slot) return null;

  const { data: section } = await supabase
    .from("page_sections")
    .select("page_id")
    .eq("id", slot.section_id)
    .maybeSingle();

  if (!section) return null;

  const { data: page } = await supabase
    .from("pages")
    .select("status")
    .eq("id", section.page_id)
    .maybeSingle();

  if (!page || page.status !== "published") return null;

  if (media.source_type === "external" && media.source_url) {
    return { url: null, sourceUrl: media.source_url };
  }

  if (!media.storage_bucket || !media.storage_path) return null;

  // Generate signed URL
  const { data: signed, error } = await supabase.storage
    .from(media.storage_bucket)
    .createSignedUrl(media.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !signed) return null;
  return { url: signed.signedUrl, sourceUrl: null };
}
