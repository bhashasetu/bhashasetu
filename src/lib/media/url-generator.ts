import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 60 minutes
const ALLOWED_LINKED_ENTRY_TYPES = ["learning_entry"] as const;

/**
 * Generates a short-lived signed URL for a media asset, but only when
 * every eligibility rule holds. Mirrors the approved Point 11 design:
 *
 *  1. An active media_links row must connect this media_asset_id to the
 *     supplied linked_entry_type + linked_entry_id (a published entry
 *     and a published asset are NOT sufficient on their own).
 *  2. linked_entry_type must be in the approved allowlist.
 *  3. The linked entry must be published.
 *  4. The media asset must be published.
 *  5. For audio: consent_status must be obtained/not_applicable AND
 *     playback_permission must be 'public'. Images/video never query
 *     audio_metadata.
 *
 * Uses the caller-supplied Supabase client so RLS applies exactly as it
 * would for that user — no service-role bypass.
 */
export async function getSignedMediaUrl(
  supabase: SupabaseClient,
  mediaAssetId: string,
  linkedEntryType: string,
  linkedEntryId: string
): Promise<string | null> {
  if (!ALLOWED_LINKED_ENTRY_TYPES.includes(linkedEntryType as never)) {
    return null;
  }

  const { data: link } = await supabase
    .from("media_links")
    .select("id")
    .eq("media_asset_id", mediaAssetId)
    .eq("linked_entry_type", linkedEntryType)
    .eq("linked_entry_id", linkedEntryId)
    .maybeSingle();

  if (!link) return null;

  const { data: media } = await supabase
    .from("media_assets")
    .select("status, media_type, storage_bucket, storage_path")
    .eq("id", mediaAssetId)
    .maybeSingle();

  if (!media || media.status !== "published") return null;

  if (linkedEntryType === "learning_entry") {
    const { data: entry } = await supabase
      .from("learning_entries")
      .select("status")
      .eq("id", linkedEntryId)
      .maybeSingle();
    if (!entry || entry.status !== "published") return null;
  }

  if (media.media_type === "audio") {
    const { data: audioMeta } = await supabase
      .from("audio_metadata")
      .select("consent_status, playback_permission")
      .eq("media_asset_id", mediaAssetId)
      .maybeSingle();

    if (
      !audioMeta ||
      !["obtained", "not_applicable"].includes(audioMeta.consent_status ?? "") ||
      audioMeta.playback_permission !== "public"
    ) {
      return null;
    }
  }
  // Image and video: no audio_metadata dependency.

  const { data: signed, error } = await supabase.storage
    .from(media.storage_bucket)
    .createSignedUrl(media.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !signed) return null;
  return signed.signedUrl;
}
