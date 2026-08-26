import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { storyInputSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const { data, error } = await check.supabase
    .from("stories")
    .select("*, language:languages(id, code, name)")
    .eq("id", id)
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = storyInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid story input", parsed.error.flatten());
  }

  const { data: existing } = await check.supabase
    .from("stories")
    .select("thumbnail_asset_id, media_asset_id")
    .eq("id", id)
    .single();

  const { data, error } = await check.supabase
    .from("stories")
    .update({ ...parsed.data, updated_by: check.user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("A story with that web address already exists.");
    }
    return serverError(error.message);
  }

  // Replacing an attachment leaves the old asset orphaned but still
  // published, i.e. still publicly fetchable by anyone holding its URL.
  // Archive it, mirroring what the slot upload path does when it supersedes
  // a slot's previous assignment.
  if (existing) {
    const superseded = (
      [
        [existing.thumbnail_asset_id, data.thumbnail_asset_id],
        [existing.media_asset_id, data.media_asset_id],
      ] as const
    )
      .filter(([before, after]) => before && before !== after)
      .map(([before]) => before as string);

    if (superseded.length > 0) {
      await check.supabase
        .from("media_assets")
        .update({ status: "archived" })
        .in("id", superseded);
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  // Archive rather than delete, so an accidental click cannot destroy a
  // recording session that cannot be repeated (CLAUDE.md section 8).
  const { error } = await check.supabase
    .from("stories")
    .update({ status: "archived", updated_by: check.user.id })
    .eq("id", id);

  if (error) return serverError(error.message);
  return NextResponse.json({ data: { id, status: "archived" } });
}
