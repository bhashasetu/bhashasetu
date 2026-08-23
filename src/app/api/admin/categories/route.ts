import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { categoryInputSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const languageId = new URL(request.url).searchParams.get("language_id");
  let query = check.supabase.from("categories").select("*").order("display_order");
  if (languageId) query = query.eq("language_id", languageId);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid category input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("categories")
    .insert({ ...parsed.data, created_by: check.user.id, status: "draft" })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data }, { status: 201 });
}
