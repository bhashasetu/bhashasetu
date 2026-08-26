import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, badRequest, serverError } from "@/lib/api/respond";
import { storyInputSchema } from "@/lib/validation/schemas";

const LIST_COLUMNS =
  "id, slug, title, format, speaker_name, speaker_place, theme, age_group, " +
  "duration_seconds, featured, display_order, status, consent_confirmed, " +
  "thumbnail_asset_id, media_asset_id, published_at, updated_at, " +
  "language:languages(id, code, name)";

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const status = url.searchParams.get("status");
  const languageId = url.searchParams.get("language_id");
  const search = url.searchParams.get("q");

  let query = check.supabase
    .from("stories")
    .select(LIST_COLUMNS)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (format) query = query.eq("format", format);
  if (status) query = query.eq("status", status);
  if (languageId) query = query.eq("language_id", languageId);
  if (search) {
    // Escape the PostgREST pattern separators so a comma or parenthesis in
    // the search box cannot break out of the or() expression.
    const safe = search.replace(/[(),*]/g, " ").trim();
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,speaker_name.ilike.%${safe}%`);
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
  const parsed = storyInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid story input", parsed.error.flatten());
  }

  // Always created as a draft. A story becomes public only through the
  // status endpoint, which checks consent.
  const { data, error } = await check.supabase
    .from("stories")
    .insert({
      ...parsed.data,
      status: "draft",
      created_by: check.user.id,
      updated_by: check.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("A story with that web address already exists.");
    }
    return serverError(error.message);
  }

  return NextResponse.json({ data }, { status: 201 });
}
