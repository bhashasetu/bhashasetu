import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { validateMediaUpload } from "@/lib/media/validate-upload";
import { bucketForMediaType, buildStoragePath } from "@/lib/media/storage-paths";

/**
 * Mints a one-object upload token so the browser can send a recording
 * straight to Supabase Storage.
 *
 * Audio and video cannot go through /api/admin/media/upload: a Vercel
 * serverless function rejects any request body over 4.5 MB before the handler
 * runs, so every realistic mp4 failed with an opaque 413. The bytes now skip
 * the function entirely.
 *
 * The token is minted through the admin's own Supabase client, so the
 * existing admin_upload_video / admin_upload_audio storage policies still
 * decide whether it is issued, and it authorises exactly one path. No
 * service-role key goes near the browser.
 */
const bodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().max(255),
  file_size: z.number().int().min(1),
});

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Invalid upload request", parsed.error.flatten());
  }

  const { filename, mime_type, file_size } = parsed.data;

  const validation = validateMediaUpload(filename, mime_type, file_size);
  if (!validation.valid) return badRequest(validation.error);

  // Images keep the server route: they are conformed to their slot's aspect
  // ratio by sharp, which needs the bytes.
  if (validation.mediaType === "image") {
    return badRequest("Images are uploaded through /api/admin/media/upload.");
  }

  const bucket = bucketForMediaType(validation.mediaType);
  const path = buildStoragePath(validation.mediaType, filename);

  const { data, error } = await check.supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return serverError(error?.message ?? "Could not create an upload URL.");
  }

  return NextResponse.json({
    data: {
      bucket,
      path,
      token: data.token,
      mediaType: validation.mediaType,
      // The type to send as Content-Type and to record on the asset; may be
      // the extension's canonical type when the browser gave none.
      mimeType: validation.mimeType,
    },
  });
}
