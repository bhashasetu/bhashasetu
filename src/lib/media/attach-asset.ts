import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Everything that happens after a media file exists in storage.
 *
 * This ran inline in the upload route. Video and audio now reach storage by a
 * different road — the browser uploads straight to Supabase, because a
 * serverless request body cannot carry a video file — so two routes need
 * identical behaviour here. Keeping one copy is the point: the Back Office and
 * the public page previously disagreed about which asset a slot held, and that
 * was exactly this logic drifting.
 */

export type AttachInput = {
  filename: string;
  mimeType: string | null;
  fileSize: number | null;
  mediaType: string;
  storageBucket: string | null;
  storagePath: string | null;
  /** Set for a hosted video (YouTube/Vimeo) rather than a stored file. */
  sourceUrl?: string | null;
  sourceType?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  title?: string | null;
  description?: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
};

export type AttachOptions = {
  /** Attach to this media slot, superseding whatever it held. */
  slotId?: string | null;
  /**
   * Publish the asset even without a slot. Both public_read_published_media
   * and the storage read policy gate on status, so an asset a caller links
   * itself (a story recording) is invisible until this runs.
   */
  publish?: boolean;
  /** Recorded consent for audio; anything else leaves the clip unplayable. */
  consentStatus?: string | null;
};

export type AttachResult =
  | { ok: true; asset: { id: string; [key: string]: unknown } }
  | { ok: false; error: string };

const CONSENT_VALUES = ["obtained", "not_applicable", "pending", "refused"];

export async function createAndAttachAsset(
  supabase: SupabaseClient,
  userId: string,
  input: AttachInput,
  options: AttachOptions = {}
): Promise<AttachResult> {
  const { data: asset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      filename: input.filename,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      source_url: input.sourceUrl ?? null,
      source_type: input.sourceType ?? null,
      media_type: input.mediaType,
      title: input.title || null,
      description: input.description || null,
      alt_text: input.altText || null,
      caption: input.caption || null,
      credit: input.credit || null,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) return { ok: false, error: insertError.message };

  if (input.mediaType === "audio") {
    // getSignedMediaUrl serves audio only when consent_status is 'obtained'
    // or 'not_applicable'. Leaving it NULL made every uploaded clip silent.
    const consent =
      options.consentStatus && CONSENT_VALUES.includes(options.consentStatus)
        ? options.consentStatus
        : "pending";

    const { error: audioError } = await supabase.from("audio_metadata").insert({
      media_asset_id: asset.id,
      playback_permission: "public",
      consent_status: consent,
    });

    if (audioError) {
      return {
        ok: false,
        error: `Media stored but audio_metadata creation failed: ${audioError.message}`,
      };
    }
  }

  if (options.slotId) {
    // A slot holds one asset. Leaving the previous assignment published let a
    // slot accumulate several, and the Back Office (first match) could then
    // show a different image than the public page (newest match).
    const { error: supersedeError } = await supabase
      .from("slot_media_assignments")
      .update({ status: "archived", updated_by: userId })
      .eq("slot_id", options.slotId)
      .eq("status", "published");

    if (supersedeError) {
      return {
        ok: false,
        error: `Could not replace the slot's existing media: ${supersedeError.message}`,
      };
    }

    const { error: assignError } = await supabase
      .from("slot_media_assignments")
      .insert({
        slot_id: options.slotId,
        media_asset_id: asset.id,
        status: "published",
        created_by: userId,
      });

    if (assignError) {
      return {
        ok: false,
        error: `Media stored but could not be attached to the slot: ${assignError.message}`,
      };
    }
  }

  if (options.slotId || options.publish) {
    const { error: publishError } = await supabase
      .from("media_assets")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", asset.id);

    if (publishError) {
      return {
        ok: false,
        error: `Media attached but could not be published: ${publishError.message}`,
      };
    }
    asset.status = "published";
  }

  return { ok: true, asset };
}
