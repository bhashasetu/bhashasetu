import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { languageInputSchema } from "@/lib/validation/schemas";

export async function GET() {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const { data, error } = await check.supabase
    .from("languages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = languageInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid language input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("languages")
    .insert({ ...parsed.data, created_by: check.user.id, status: "draft" })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data }, { status: 201 });
}
