import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { faqInputSchema } from "@/lib/validation/schemas";
import { FAQ_COLUMNS } from "@/lib/faq/queries";

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q");

  let query = check.supabase
    .from("chat_faqs")
    .select(FAQ_COLUMNS + ", updated_at")
    .order("display_order", { ascending: true });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (search) {
    // Strip the PostgREST pattern separators so a comma or bracket typed into
    // the search box cannot break out of the or() expression.
    const safe = search.replace(/[(),*]/g, " ").trim();
    if (safe) {
      query = query.or(
        `question_en.ilike.%${safe}%,answer_en.ilike.%${safe}%,slug.ilike.%${safe}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const body = await request.json().catch(() => null);
  const parsed = faqInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid FAQ input", parsed.error.flatten());
  }

  // New questions start as drafts, like every other content type here: an
  // answer reaches visitors only when someone has read it.
  const { data, error } = await check.supabase
    .from("chat_faqs")
    .insert({
      ...parsed.data,
      status: "draft",
      created_by: check.user.id,
      updated_by: check.user.id,
    })
    .select(FAQ_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("A question with that slug already exists.");
    }
    return serverError(error.message);
  }

  return NextResponse.json({ data }, { status: 201 });
}
