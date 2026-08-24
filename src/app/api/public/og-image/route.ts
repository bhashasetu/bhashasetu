import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedSlotMediaUrl } from "@/lib/media/slot-url-generator";

export const dynamic = "force-dynamic";

/**
 * Stable address for a page's Open Graph image.
 *
 * Storage buckets are private, so the real image URL is signed and expires
 * after an hour. An expiring URL cannot go in an og:image tag — a scraper
 * reading a cached page later would fetch a dead link. This route gives the
 * tag a permanent address and redirects to a freshly signed URL per request.
 * Every major scraper follows redirects.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("page");

  if (!slug) {
    return NextResponse.json({ error: "page is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS restricts this to published pages, so a draft page cannot leak its
  // image through the social card.
  const { data: page } = await supabase
    .from("pages")
    .select("og_image_slot_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!page?.og_image_slot_id) {
    return NextResponse.json({ error: "No image for this page" }, { status: 404 });
  }

  const signedUrl = await getSignedSlotMediaUrl(supabase, page.og_image_slot_id);

  if (!signedUrl) {
    return NextResponse.json({ error: "No image for this page" }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl, 307);
}
