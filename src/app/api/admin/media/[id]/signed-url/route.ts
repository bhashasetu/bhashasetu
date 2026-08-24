import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Signed URL for one media asset, for Back Office previews.
 *
 * Unlike the public /api/public/media-slot endpoint, this does not require
 * the asset (or its page) to be published — an editor previewing a draft
 * upload or an AI-generated variant pending approval needs to see it before
 * it goes live.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { data: asset, error } = await check.supabase
    .from("media_assets")
    .select("storage_bucket, storage_path, media_type, status")
    .eq("id", id)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await check.supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, 900);

  if (signError || !signed) {
    return NextResponse.json(
      { error: signError?.message ?? "Could not sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      url: signed.signedUrl,
      mediaType: asset.media_type,
      status: asset.status,
    },
  });
}
