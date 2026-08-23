import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { mediaLinkInputSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = mediaLinkInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid media link input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("media_links")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const linkId = url.searchParams.get("id");
  if (!linkId) return badRequest("Missing id query parameter");

  const { error } = await check.supabase.from("media_links").delete().eq("id", linkId);
  if (error) return serverError(error.message);
  return new NextResponse(null, { status: 204 });
}
