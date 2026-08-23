import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { validateMediaUpload } from "@/lib/media/validate-upload";
import { bucketForMediaType, buildStoragePath } from "@/lib/media/storage-paths";

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
  const storagePath = buildStoragePath(mediaType, file.name);

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await check.supabase.storage
    .from(bucket)
    .upload(storagePath, arrayBuffer, { contentType: file.type });

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
      mime_type: file.type,
      file_size: file.size,
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

  return NextResponse.json({ data: mediaAsset }, { status: 201 });
}
