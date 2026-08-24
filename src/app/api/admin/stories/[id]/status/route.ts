import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { storyStatusTransitionSchema } from "@/lib/validation/schemas";

/**
 * Move a story between draft, published and archived.
 *
 * Publishing is refused unless consent has been recorded and a primary
 * recording is attached. The consent rule is also a CHECK on the table; it is
 * repeated here to return a sentence an editor can act on rather than a
 * constraint-violation message.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = storyStatusTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid status change", parsed.error.flatten());
  }

  const { status, consent_confirmed } = parsed.data;

  const { data: story, error: readError } = await check.supabase
    .from("stories")
    .select("consent_confirmed, media_asset_id, title")
    .eq("id", id)
    .single();

  if (readError || !story) return badRequest("Unknown story");

  const consent = consent_confirmed ?? story.consent_confirmed;

  if (status === "published") {
    if (!consent) {
      return badRequest(
        "This story cannot be published until the speaker's consent has been recorded."
      );
    }
    if (!story.media_asset_id) {
      return badRequest(
        "Attach the recording before publishing, so the published story is not an empty player."
      );
    }
  }

  const { data, error } = await check.supabase
    .from("stories")
    .update({
      status,
      consent_confirmed: consent,
      published_at: status === "published" ? new Date().toISOString() : null,
      updated_by: check.user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}
