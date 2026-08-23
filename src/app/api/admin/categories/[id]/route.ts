import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminCheckFailureResponse,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api/respond";
import { categoryInputSchema, categoryStatusValues } from "@/lib/validation/schemas";
import { z } from "zod";

const updateSchema = categoryInputSchema.partial().extend({
  status: z.enum(categoryStatusValues).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid category input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return serverError(error.message);
  if (!data) return notFound("Category not found");
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const { error } = await check.supabase.from("categories").delete().eq("id", id);
  if (error) return serverError(error.message);
  return new NextResponse(null, { status: 204 });
}
