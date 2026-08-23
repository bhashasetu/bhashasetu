import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/media/url-generator";

/**
 * Returns a short-lived signed URL for a published, eligible media asset.
 * See src/lib/media/url-generator.ts for the full eligibility chain
 * (active media_links relationship, publication, consent/permission).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mediaAssetId = url.searchParams.get("media_asset_id");
  const linkedEntryType = url.searchParams.get("linked_entry_type");
  const linkedEntryId = url.searchParams.get("linked_entry_id");

  if (!mediaAssetId || !linkedEntryType || !linkedEntryId) {
    return NextResponse.json(
      { error: "media_asset_id, linked_entry_type, and linked_entry_id are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const signedUrl = await getSignedMediaUrl(
    supabase,
    mediaAssetId,
    linkedEntryType,
    linkedEntryId
  );

  if (!signedUrl) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  return NextResponse.json({ data: { url: signedUrl, expiresInSeconds: 3600 } });
}
