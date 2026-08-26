import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";

/**
 * Set an asset's framing: the point that must stay in shot, and whether the
 * image fills its frame or is shown whole.
 *
 * Separate from the metadata PUT beside it because this is a different kind of
 * edit — one click on a preview, saved immediately, with no form around it —
 * and because it is the one media edit that changes how a published page looks
 * without changing a single byte of the file.
 *
 * It is deliberately narrow: three fields, all bounded, and nothing here can
 * touch storage paths, status or ownership.
 */
const framingSchema = z.object({
  focal_x: z.number().min(0).max(1),
  focal_y: z.number().min(0).max(1),
  fit: z.enum(["cover", "contain"]).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = framingSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid framing input", parsed.error.flatten());
  }

  const { data: before, error: readError } = await check.supabase
    .from("media_assets")
    .select("id, media_type, focal_x, focal_y, fit")
    .eq("id", id)
    .single();

  if (readError || !before) return notFound("Media asset not found");

  // Framing is meaningless for a recording: there is no frame to crop.
  if (before.media_type !== "image") {
    return badRequest("Only images have a focal point.");
  }

  const { data, error } = await check.supabase
    .from("media_assets")
    .update({
      focal_x: parsed.data.focal_x,
      focal_y: parsed.data.focal_y,
      ...(parsed.data.fit ? { fit: parsed.data.fit } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, focal_x, focal_y, fit")
    .single();

  if (error) return serverError(error.message);

  return NextResponse.json({ data });
}
