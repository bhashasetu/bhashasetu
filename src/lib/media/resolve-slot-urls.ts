import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 60 minutes

/**
 * Resolve many media slots to signed URLs in one pass.
 *
 * getSignedSlotMediaUrl() (slot-url-generator.ts) makes five sequential
 * round-trips per slot, and it is called from a client component, so a page
 * with a dozen slots pays a dozen serial waterfalls *after* hydration and
 * ships no image URL in its HTML at all. This resolver is the server-side
 * counterpart: a fixed number of queries regardless of slot count, so the
 * page can render real <img src> values (see SlotMedia).
 *
 * The per-slot helper re-verifies that the slot's page is published on every
 * call. That check is redundant here because callers have already selected
 * the page with status = 'published' and are resolving slots belonging to it,
 * and the RLS policies enforce the same rule independently.
 */
export type ResolvedSlotMedia = {
  /** Signed URL for a stored object, null for a hosted video. */
  url: string | null;
  /** Address of a hosted video (YouTube/Vimeo), null for a stored object. */
  sourceUrl: string | null;
  /** How the asset fills its frame; see media_assets.fit. */
  fit: "cover" | "contain";
  /** CSS object-position built from the asset's focal point. */
  objectPosition: string;
};

/**
 * Turn an asset's stored framing into the two CSS values that apply it.
 *
 * The focal point is the pixel that must stay in shot. Expressed as an
 * object-position percentage, the browser crops around it at whatever size and
 * ratio the frame happens to be — so one stored file frames correctly in every
 * slot and at every viewport, which a crop baked in at upload never could.
 */
function framingOf(asset: {
  fit?: string | null;
  focal_x?: number | string | null;
  focal_y?: number | string | null;
}): { fit: "cover" | "contain"; objectPosition: string } {
  const pct = (value: number | string | null | undefined) => {
    const n = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, (n as number) * 100)) : 50;
  };
  return {
    fit: asset.fit === "contain" ? "contain" : "cover",
    objectPosition: `${pct(asset.focal_x)}% ${pct(asset.focal_y)}%`,
  };
}

export async function resolveSlotUrls(
  supabase: SupabaseClient,
  slotIds: string[]
): Promise<Map<string, ResolvedSlotMedia>> {
  const resolved = new Map<string, ResolvedSlotMedia>();
  const ids = [...new Set(slotIds.filter(Boolean))];
  if (ids.length === 0) return resolved;

  const { data: assignments } = await supabase
    .from("slot_media_assignments")
    .select("slot_id, media_asset_id, created_at")
    .in("slot_id", ids)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (!assignments || assignments.length === 0) return resolved;

  // Newest published assignment wins, matching the single-slot resolver and
  // the Back Office preview. Rows arrive newest-first, so the first one seen
  // for a slot is the one to keep.
  const assetIdBySlot = new Map<string, string>();
  for (const row of assignments) {
    if (!assetIdBySlot.has(row.slot_id)) {
      assetIdBySlot.set(row.slot_id, row.media_asset_id);
    }
  }

  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, status, source_type, source_url, fit, focal_x, focal_y")
    .in("id", [...new Set(assetIdBySlot.values())])
    .eq("status", "published");

  if (!assets || assets.length === 0) return resolved;

  const assetById = new Map(assets.map((a) => [a.id, a]));

  // createSignedUrls is per-bucket, so group the paths before signing. A
  // hosted video has no object to sign and is skipped here.
  const pathsByBucket = new Map<string, string[]>();
  for (const asset of assets) {
    if (!asset.storage_bucket || !asset.storage_path) continue;
    const paths = pathsByBucket.get(asset.storage_bucket) ?? [];
    paths.push(asset.storage_path);
    pathsByBucket.set(asset.storage_bucket, paths);
  }

  const signedByBucketPath = new Map<string, string>();
  await Promise.all(
    [...pathsByBucket.entries()].map(async ([bucket, paths]) => {
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS);
      for (const entry of signed ?? []) {
        if (entry.signedUrl && entry.path) {
          signedByBucketPath.set(`${bucket}:${entry.path}`, entry.signedUrl);
        }
      }
    })
  );

  for (const [slotId, assetId] of assetIdBySlot) {
    const asset = assetById.get(assetId);
    if (!asset) continue;

    const framing = framingOf(asset);

    if (asset.source_type === "external" && asset.source_url) {
      resolved.set(slotId, { url: null, sourceUrl: asset.source_url, ...framing });
      continue;
    }

    const url = signedByBucketPath.get(
      `${asset.storage_bucket}:${asset.storage_path}`
    );
    if (url) resolved.set(slotId, { url, sourceUrl: null, ...framing });
  }

  return resolved;
}
