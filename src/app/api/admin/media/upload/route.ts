import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { validateMediaUpload } from "@/lib/media/validate-upload";
import { bucketForMediaType, buildStoragePath } from "@/lib/media/storage-paths";
import { conformImageToSlot } from "@/lib/media/conform-image";
import { createAndAttachAsset } from "@/lib/media/attach-asset";

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

  // Audio and video no longer come this way. A Vercel serverless function
  // caps request bodies at 4.5 MB, so a recording posted here was rejected by
  // the platform before this handler ran; the browser uploads those straight
  // to storage instead (see /api/admin/media/upload-url).
  if (mediaType !== "image") {
    return badRequest(
      "Recordings are uploaded directly to storage. Reload the Back Office and try again."
    );
  }

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

  // A slotless upload (a story thumbnail, say) still wants the same fitting
  // treatment, so it names the ratio it needs directly.
  const ratioRaw = formData.get("aspect_ratio");
  const requestedRatio =
    typeof ratioRaw === "string" && /^\d{1,2}:\d{1,2}$/.test(ratioRaw)
      ? ratioRaw
      : null;

  let body: Buffer = Buffer.from(await file.arrayBuffer());
  // The validator's type, not the browser's: a browser that reported no type
  // at all still gets the extension's canonical one.
  let contentType = validation.mimeType;
  let width: number | null = null;
  let height: number | null = null;
  let adjusted = false;

  // Fit the image to the slot rather than making an editor prepare it by hand.
  if (mediaType === "image") {
    try {
      const conformed = await conformImageToSlot(
        body,
        slot?.aspect_ratio ?? requestedRatio,
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
  const slotIdForAttach = slot?.id ?? null;
  const shouldPublish = !slot && formData.get("publish") === "1";

  const attached = await createAndAttachAsset(
    check.supabase,
    check.user.id,
    {
      filename: file.name,
      mimeType: contentType,
      fileSize: body.byteLength,
      mediaType,
      storageBucket: bucket,
      storagePath: storagePath,
      sourceType: "upload",
      width,
      height,
      title: typeof title === "string" ? title : null,
      description: typeof description === "string" ? description : null,
      altText: typeof altText === "string" ? altText : null,
      caption: typeof caption === "string" ? caption : null,
      credit: typeof credit === "string" ? credit : null,
    },
    { slotId: slotIdForAttach, publish: shouldPublish }
  );

  if (!attached.ok) {
    // Roll back the uploaded object so a failed insert does not orphan it.
    await check.supabase.storage.from(bucket).remove([storagePath]);
    return serverError(attached.error);
  }

  return NextResponse.json(
    { data: { ...attached.asset, width, height }, adjusted },
    { status: 201 }
  );
}
