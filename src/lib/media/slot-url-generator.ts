import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 60 minutes

export async function getSignedSlotMediaUrl(
  supabase: SupabaseClient,
  slotId: string
): Promise<string | null> {
  // Get the media assignment for this slot (first one)
  const { data: assignment } = await supabase
    .from("slot_media_assignments")
    .select("media_asset_id")
    .eq("slot_id", slotId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!assignment) return null;

  // Get the media asset
  const { data: media } = await supabase
    .from("media_assets")
    .select("status, storage_bucket, storage_path")
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

  // Generate signed URL
  const { data: signed, error } = await supabase.storage
    .from(media.storage_bucket)
    .createSignedUrl(media.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !signed) return null;
  return signed.signedUrl;
}
