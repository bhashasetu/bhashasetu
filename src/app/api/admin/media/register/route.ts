import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { validateMediaUpload } from "@/lib/media/validate-upload";
import { bucketForMediaType } from "@/lib/media/storage-paths";
import { createAndAttachAsset } from "@/lib/media/attach-asset";

/**
 * Records a media asset for a file the browser uploaded directly.
 *
 * Called after uploadToSignedUrl succeeds. Everything past this point — the
 * media_assets row, audio_metadata with consent, superseding a slot's
 * previous assignment, publishing — is the shared createAndAttachAsset()
 * helper, the same code the server upload route runs, so the two roads cannot
 * drift apart.
 */
const bodySchema = z.object({
  bucket: z.string().trim().min(1).max(64),
  path: z.string().trim().min(1).max(512),
  filename: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().max(255),
  file_size: z.number().int().min(1),
  duration_seconds: z.number().int().min(0).max(86400).optional().nullable(),
  slot_id: z.string().uuid().optional().nullable(),
  publish: z.boolean().optional(),
  consent_status: z.string().trim().max(40).optional().nullable(),
  title: z.string().trim().max(500).optional().nullable(),
  alt_text: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Invalid registration request", parsed.error.flatten());
  }

  const body = parsed.data;

  // Re-validate rather than trusting the client's word about what it just
  // uploaded: this call arrives separately from the one that issued the
  // token, so the size and kind claims are fresh input.
  const validation = validateMediaUpload(body.filename, body.mime_type, body.file_size);
  if (!validation.valid) return badRequest(validation.error);
  if (validation.mediaType === "image") {
    return badRequest("Images are uploaded through /api/admin/media/upload.");
  }
  if (body.bucket !== bucketForMediaType(validation.mediaType)) {
    return badRequest("That bucket does not match the file's media type.");
  }

  // Confirm the object is really there. A failed or abandoned upload would
  // otherwise leave a media_assets row pointing at nothing, which shows in
  // the Back Office as an attachment that will never load.
  const { data: signed } = await check.supabase.storage
    .from(body.bucket)
    .createSignedUrl(body.path, 60);

  if (!signed?.signedUrl) {
    return badRequest(
      "That file is not in storage. The upload may have been interrupted — please try again."
    );
  }

  if (body.slot_id) {
    const { data: slot } = await check.supabase
      .from("media_slots")
      .select("id, media_type")
      .eq("id", body.slot_id)
      .single();

    if (!slot) return badRequest("Unknown media slot");

    const expected =
      slot.media_type === "thumbnail" || slot.media_type === "hero_image"
        ? "image"
        : slot.media_type;

    if (expected !== validation.mediaType) {
      return badRequest(
        `This slot expects ${expected}, but the file is ${validation.mediaType}.`
      );
    }
  }

  const result = await createAndAttachAsset(
    check.supabase,
    check.user.id,
    {
      filename: body.filename,
      mimeType: validation.mimeType,
      fileSize: body.file_size,
      mediaType: validation.mediaType,
      storageBucket: body.bucket,
      storagePath: body.path,
      sourceType: "upload",
      durationSeconds: body.duration_seconds ?? null,
      title: body.title ?? null,
      altText: body.alt_text ?? null,
    },
    {
      slotId: body.slot_id ?? null,
      publish: body.publish ?? false,
      consentStatus: body.consent_status ?? null,
    }
  );

  if (!result.ok) return serverError(result.error);
  return NextResponse.json({ data: result.asset }, { status: 201 });
}
