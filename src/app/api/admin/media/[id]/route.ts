import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";
import {
  audioMetadataInputSchema,
  mediaMetadataInputSchema,
  mediaStatusValues,
} from "@/lib/validation/schemas";
import { z } from "zod";

const updateSchema = mediaMetadataInputSchema.partial().extend({
  status: z.enum(mediaStatusValues).optional(),
  audio: audioMetadataInputSchema.partial().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid media input", parsed.error.flatten());
  }
  const { audio, ...assetFields } = parsed.data;

  let updatedAsset = null;
  if (Object.keys(assetFields).length > 0) {
    const { data, error } = await check.supabase
      .from("media_assets")
      .update(assetFields)
      .eq("id", id)
      .select()
      .single();
    if (error) return serverError(error.message);
    if (!data) return notFound("Media asset not found");
    updatedAsset = data;
  }

  if (audio && Object.keys(audio).length > 0) {
    const { error: audioError } = await check.supabase
      .from("audio_metadata")
      .update(audio)
      .eq("media_asset_id", id);
    if (audioError) return serverError(audioError.message);
  }

  if (!updatedAsset) {
    const { data } = await check.supabase
      .from("media_assets")
      .select("*")
      .eq("id", id)
      .single();
    updatedAsset = data;
  }

  if (!updatedAsset) return notFound("Media asset not found");
  return NextResponse.json({ data: updatedAsset });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const { count, error: linkError } = await check.supabase
    .from("media_links")
    .select("id", { count: "exact", head: true })
    .eq("media_asset_id", id);

  if (linkError) return serverError(linkError.message);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete: this media asset is linked to active content. Unlink it or archive it first.",
        activeLinks: count,
      },
      { status: 409 }
    );
  }

  const { data: asset } = await check.supabase
    .from("media_assets")
    .select("storage_bucket, storage_path")
    .eq("id", id)
    .single();

  const { error: deleteError } = await check.supabase
    .from("media_assets")
    .delete()
    .eq("id", id);

  if (deleteError) return serverError(deleteError.message);

  if (asset) {
    await check.supabase.storage.from(asset.storage_bucket).remove([asset.storage_path]);
  }

  return new NextResponse(null, { status: 204 });
}
