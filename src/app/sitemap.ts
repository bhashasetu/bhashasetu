import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, routeForSlug } from "@/lib/seo/page-metadata";

export const dynamic = "force-dynamic";

/**
 * Sitemap built from the CMS rather than a hardcoded list, so publishing or
 * unpublishing a page in the Back Office is reflected without a code change.
 * Pages marked noindex are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: pages } = await supabase
    .from("pages")
    .select("slug, canonical_url, updated_at, noindex")
    .eq("status", "published")
    .eq("noindex", false);

  return (pages ?? []).map((page) => ({
    url: page.canonical_url || absoluteUrl(routeForSlug(page.slug)),
    lastModified: page.updated_at ? new Date(page.updated_at) : undefined,
    changeFrequency: page.slug === "homepage" ? "weekly" : "monthly",
    priority: page.slug === "homepage" ? 1 : 0.8,
  }));
}
