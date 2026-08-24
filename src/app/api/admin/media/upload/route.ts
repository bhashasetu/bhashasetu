import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { validateMediaUpload } from "@/lib/media/validate-upload";
import { bucketForMediaType, buildStoragePath } from "@/lib/media/storage-paths";
import { conformImageToSlot } from "@/lib/media/conform-image";

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const formData = await request.formData().catch(() => null);
  if (!formData) return badRequest("Expected multipart/form-data");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return badRequest("Missing file field");
  }

  const validation = validateMediaUpload(file.name, file.type, file.size);
  if (!validation.valid) {
    return badRequest(validation.error);
  }

  const { mediaType } = validation;
  const bucket = bucketForMediaType(mediaType);

  // When the upload targets a media slot, look the slot up first so the image
  // can be fitted to the ratio that slot expects.
  const slotIdRaw = formData.get("slot_id");
  const slotId = typeof slotIdRaw === "string" && slotIdRaw ? slotIdRaw : null;

  let slot: { id: string; aspect_ratio: string | null; media_type: string } | null =
    null;

  if (slotId) {
    const { data, error } = await check.supabase
      .from("media_slots")
      .select("id, aspect_ratio, media_type")
      .eq("id", slotId)
      .single();

    if (error || !data) return badRequest("Unknown media slot");
    slot = data;

    // 'thumbnail' and 'hero_image' slots hold images; everything else must
    // match the uploaded kind.
    const expected =
      slot.media_type === "thumbnail" || slot.media_type === "hero_image"
        ? "image"
        : slot.media_type;

    if (expected !== mediaType) {
      return badRequest(
        `This slot expects ${expected}, but the file is ${mediaType}.`
      );
    }
  }

  let body: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;
  let width: number | null = null;
  let height: number | null = null;
  let adjusted = false;

  // Fit the image to the slot rather than making an editor prepare it by hand.
  if (mediaType === "image") {
    try {
      const conformed = await conformImageToSlot(
        body,
        slot?.aspect_ratio ?? null,
        file.type
      );
      body = conformed.buffer;
      contentType = conformed.mimeType;
      width = conformed.width || null;
      height = conformed.height || null;
      adjusted = conformed.adjusted;
    } catch {
      // A source we cannot decode is still worth storing as-is; the editor
      // can replace it. Better than rejecting the upload outright.
    }
  }

  const extension = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : null;
  const storagePath = buildStoragePath(
    mediaType,
    extension ? file.name.replace(/\.[^.]+$/, `.${extension}`) : file.name
  );

  const { error: uploadError } = await check.supabase.storage
    .from(bucket)
    .upload(storagePath, body, { contentType });

  if (uploadError) {
    return serverError(`Storage upload failed: ${uploadError.message}`);
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const altText = formData.get("alt_text");
  const caption = formData.get("caption");
  const credit = formData.get("credit");

  const { data: mediaAsset, error: dbError } = await check.supabase
    .from("media_assets")
    .insert({
      filename: file.name,
      mime_type: contentType,
      file_size: body.byteLength,
      width,
      height,
      storage_bucket: bucket,
      storage_path: storagePath,
      media_type: mediaType,
      title: typeof title === "string" && title ? title : null,
      description: typeof description === "string" && description ? description : null,
      alt_text: typeof altText === "string" && altText ? altText : null,
      caption: typeof caption === "string" && caption ? caption : null,
      credit: typeof credit === "string" && credit ? credit : null,
      status: "draft",
      created_by: check.user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Roll back the uploaded object if the DB insert failed.
    await check.supabase.storage.from(bucket).remove([storagePath]);
    return serverError(dbError.message);
  }

  if (mediaType === "audio") {
    const { error: audioError } = await check.supabase.from("audio_metadata").insert({
      media_asset_id: mediaAsset.id,
      playback_permission: "public",
    });
    if (audioError) {
      return serverError(`Media uploaded but audio_metadata creation failed: ${audioError.message}`);
    }
  }

  // Attach the asset to its slot. Without this the upload succeeds but the
  // slot stays empty, which is what made "upload" look broken.
  if (slot) {
    // A slot holds one asset. Uploading a replacement previously left the
    // old assignment published too, so the slot ended up with several — and
    // the Back Office (first match) could then disagree with the public page
    // (newest match) about which image the slot actually shows.
    const { error: supersedeError } = await check.supabase
      .from("slot_media_assignments")
      .update({ status: "archived", updated_by: check.user.id })
      .eq("slot_id", slot.id)
      .eq("status", "published");

    if (supersedeError) {
      return serverError(
        `Could not replace the slot's existing media: ${supersedeError.message}`
      );
    }

    const { error: assignError } = await check.supabase
      .from("slot_media_assignments")
      .insert({
        slot_id: slot.id,
        media_asset_id: mediaAsset.id,
        status: "published",
        created_by: check.user.id,
      });

    if (assignError) {
      return serverError(
        `Media uploaded but could not be attached to the slot: ${assignError.message}`
      );
    }

    // A slot asset must be published for the public page to read it
    // (public_read_published_media gates on status).
    const { error: publishError } = await check.supabase
      .from("media_assets")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", mediaAsset.id);

    if (publishError) {
      return serverError(
        `Media attached but could not be published: ${publishError.message}`
      );
    }
  }

  return NextResponse.json(
    { data: { ...mediaAsset, width, height }, adjusted },
    { status: 201 }
  );
}
