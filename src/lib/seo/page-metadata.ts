import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";

/**
 * Maps a CMS page slug to the route that renders it.
 *
 * Slugs and routes deliberately differ (the homepage is slug 'homepage' at
 * '/', Stories & Voices is slug 'stories-voices' at '/stories'), so canonical
 * URLs and the sitemap both need this translation rather than assuming
 * `/${slug}`.
 */
export const ROUTE_BY_SLUG: Record<string, string> = {
  homepage: "/",
  "stories-voices": "/stories",
  "language-explorer": "/languages",
};

export function routeForSlug(slug: string): string {
  return ROUTE_BY_SLUG[slug] ?? `/${slug}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export type PageSeoRow = {
  slug: string;
  title: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_slot_id: string | null;
  noindex: boolean | null;
  page_summary: string | null;
  structured_data_type: string | null;
  updated_at: string | null;
};

export const PAGE_SEO_COLUMNS =
  "slug, title, description, meta_title, meta_description, meta_keywords, " +
  "canonical_url, og_title, og_description, og_image_slot_id, noindex, " +
  "page_summary, structured_data_type, updated_at";

/** Read the SEO row for one published page, or null if there isn't one. */
export async function getPageSeo(slug: string): Promise<PageSeoRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select(PAGE_SEO_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return (data as PageSeoRow | null) ?? null;
}

/**
 * Build Next metadata for a CMS page.
 *
 * Every field degrades: the CMS SEO field wins, then the page's own
 * title/description, then the caller's fallback. That last step matters
 * because a page whose record is missing or still in draft must not serve an
 * empty <title>.
 *
 * The Open Graph image is served through /api/public/og-image rather than as
 * a signed storage URL. Signed URLs expire after an hour, so a scraper
 * reading a cached page an hour later would get a dead image; the route
 * redirects to a freshly signed URL on each request, giving the OG tag a
 * stable address.
 */
export async function buildPageMetadata({
  slug,
  fallback,
}: {
  slug: string;
  fallback: { title: string; description: string };
}): Promise<Metadata> {
  const page = await getPageSeo(slug);
  const route = routeForSlug(slug);

  const title = page?.meta_title || page?.title || fallback.title;
  const description =
    page?.meta_description || page?.description || fallback.description;
  const canonical = page?.canonical_url || absoluteUrl(route);
  const indexable = !page?.noindex;

  const ogImage = page?.og_image_slot_id
    ? absoluteUrl(`/api/public/og-image?page=${encodeURIComponent(slug)}`)
    : undefined;

  return {
    title,
    description,
    keywords: page?.meta_keywords
      ? page.meta_keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    alternates: { canonical },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: "website",
      siteName: "Bhasha Setu",
      title: page?.og_title || title,
      description: page?.og_description || description,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: page?.og_title || title,
      description: page?.og_description || description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
