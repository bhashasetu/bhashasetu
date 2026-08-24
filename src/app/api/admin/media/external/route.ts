import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { parseVideoUrl } from "@/lib/media/video-embed";
import { createAndAttachAsset } from "@/lib/media/attach-asset";

/**
 * Records a hosted video (YouTube/Vimeo) as a media asset.
 *
 * Storage is capped at 50 MB per object on this plan and egress is metered,
 * so a full-length interview is linked rather than uploaded. It still becomes
 * a media_assets row, so slots, stories and the Media Library treat it like
 * anything else.
 */
const bodySchema = z.object({
  url: z.string().trim().min(1).max(1000),
  slot_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().max(500).optional().nullable(),
  duration_seconds: z.number().int().min(0).max(86400).optional().nullable(),
});

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Invalid video link", parsed.error.flatten());
  }

  // Only recognised providers, so an arbitrary address cannot be framed on a
  // public page.
  const video = parseVideoUrl(parsed.data.url);
  if (!video) {
    return badRequest(
      "That does not look like a YouTube or Vimeo link. Paste the address from the video's page."
    );
  }

  if (parsed.data.slot_id) {
    const { data: slot } = await check.supabase
      .from("media_slots")
      .select("id, media_type")
      .eq("id", parsed.data.slot_id)
      .single();

    if (!slot) return badRequest("Unknown media slot");
    if (slot.media_type !== "video") {
      return badRequest(`This slot expects ${slot.media_type}, not a video link.`);
    }
  }

  const result = await createAndAttachAsset(
    check.supabase,
    check.user.id,
    {
      filename: `${video.provider}-${video.id}`,
      mimeType: null,
      fileSize: null,
      mediaType: "video",
      storageBucket: null,
      storagePath: null,
      sourceType: "external",
      sourceUrl: video.watchUrl,
      durationSeconds: parsed.data.duration_seconds ?? null,
      title: parsed.data.title ?? null,
    },
    { slotId: parsed.data.slot_id ?? null, publish: true }
  );

  if (!result.ok) return serverError(result.error);
  return NextResponse.json({ data: result.asset }, { status: 201 });
}
