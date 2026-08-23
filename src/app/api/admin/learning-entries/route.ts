import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { learningEntryInputSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const languageId = url.searchParams.get("language_id");
  const categoryId = url.searchParams.get("category_id");
  const status = url.searchParams.get("status");

  let query = check.supabase
    .from("learning_entries")
    .select("*")
    .order("display_order");

  if (languageId) query = query.eq("language_id", languageId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = learningEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid learning entry input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("learning_entries")
    .insert({ ...parsed.data, created_by: check.user.id, status: "draft" })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data }, { status: 201 });
}
