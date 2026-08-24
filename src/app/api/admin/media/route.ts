import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse, serverError } from "@/lib/api/respond";

/**
 * Browse the Media Library from a picker.
 *
 * "Select existing" needs a list the browser can search without leaving the
 * entry it is working on (brief sections 5 and 9). Existing screens query
 * Supabase directly as server components, so no list endpoint existed.
 *
 * Admin-guarded, and it returns metadata only — playable URLs still come from
 * the signed-url route, which applies the eligibility rules.
 */
const MEDIA_TYPES = ["audio", "image", "video"];

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const mediaType = url.searchParams.get("media_type");
  const term = (url.searchParams.get("q") ?? "").trim();

  let query = check.supabase
    .from("media_assets")
    .select("id, filename, title, media_type, status, created_at")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(50);

  if (mediaType && MEDIA_TYPES.includes(mediaType)) {
    query = query.eq("media_type", mediaType);
  }

  if (term) {
    // Strip the PostgREST separators and LIKE wildcards so a stray character
    // in the search box cannot change the shape of the expression.
    const safe = term.replace(/[(),*%_\\]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      query = query.or(`filename.ilike.%${safe}%,title.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) return serverError(error.message);

  return NextResponse.json({ data });
}
