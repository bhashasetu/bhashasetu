import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";
import { faqInputSchema, faqStatusTransitionSchema } from "@/lib/validation/schemas";
import { FAQ_COLUMNS } from "@/lib/faq/queries";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);

  // A status change and a content edit arrive on the same route because they
  // are the same kind of act on the same row; the two shapes are told apart by
  // what the body carries.
  const asStatus = faqStatusTransitionSchema.safeParse(body);
  if (asStatus.success && Object.keys(body ?? {}).length === 1) {
    const { data, error } = await check.supabase
      .from("chat_faqs")
      .update({
        status: asStatus.data.status,
        updated_by: check.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(FAQ_COLUMNS)
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("FAQ not found");
    return NextResponse.json({ data });
  }

  const parsed = faqInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid FAQ input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("chat_faqs")
    .update({
      ...parsed.data,
      updated_by: check.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(FAQ_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("A question with that slug already exists.");
    }
    return serverError(error.message);
  }
  if (!data) return notFound("FAQ not found");

  return NextResponse.json({ data });
}

/**
 * Archive, never delete.
 *
 * An answer that has been live is part of the record of what the site told
 * people, and an editor who archives one by mistake should be able to put it
 * back. Archived rows are invisible to the public reader and to the assistant.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const { data, error } = await check.supabase
    .from("chat_faqs")
    .update({
      status: "archived",
      updated_by: check.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) return serverError(error.message);
  if (!data) return notFound("FAQ not found");

  return NextResponse.json({ data });
}
