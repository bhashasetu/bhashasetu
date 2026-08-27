import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";

/**
 * Move a suggestion through review.
 *
 * Only the status changes. The term, the meaning and the note are what a
 * visitor wrote and are never edited here — if they are wrong, the suggestion
 * is declined rather than rewritten into something they did not say.
 */
const schema = z.object({
  status: z.enum(["new", "reviewed", "added", "declined"]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Unknown status");

  const { error } = await check.supabase
    .from("word_suggestions")
    .update({
      status: parsed.data.status,
      reviewed_by: check.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return serverError(error.message);
  return NextResponse.json({ data: { status: parsed.data.status } });
}
