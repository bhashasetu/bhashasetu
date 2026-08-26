import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { faqAliasInputSchema } from "@/lib/validation/schemas";

/**
 * Alternative phrasings for one question.
 *
 * These are what let the assistant answer without a language model: "is it
 * free" and "how much does it cost" are one question, and adding the second
 * phrasing is a two-second job rather than a model call on every message. An
 * editor who watches the unanswered list adds them as real people type them.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const { data, error } = await check.supabase
    .from("chat_faq_aliases")
    .select("id, locale, alias")
    .eq("faq_id", id)
    .order("locale", { ascending: true })
    .order("alias", { ascending: true });

  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = faqAliasInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid alias input", parsed.error.flatten());
  }

  const { data, error } = await check.supabase
    .from("chat_faq_aliases")
    .insert({
      faq_id: id,
      locale: parsed.data.locale,
      alias: parsed.data.alias,
    })
    .select("id, locale, alias")
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("That phrasing is already listed for this question.");
    }
    return serverError(error.message);
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Aliases are deleted outright rather than archived: unlike an answer, a
 * phrasing was never shown to anyone, so there is no record to preserve.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);
  const { id } = await params;

  const aliasId = new URL(request.url).searchParams.get("alias_id");
  if (!aliasId) return badRequest("Missing alias_id");

  const { error } = await check.supabase
    .from("chat_faq_aliases")
    .delete()
    .eq("id", aliasId)
    .eq("faq_id", id);

  if (error) return serverError(error.message);
  return NextResponse.json({ data: { id: aliasId } });
}
