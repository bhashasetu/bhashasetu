/**
 * Which route renders a CMS page.
 *
 * Slugs and routes deliberately differ (the homepage is slug 'homepage' at
 * '/', Stories & Voices is 'stories-voices' at '/stories'), so canonical URLs,
 * the sitemap and the Back Office's "View page" link all need this
 * translation rather than assuming `/${slug}`.
 *
 * It lives in its own file with no imports because both a server component
 * building metadata and a client component rendering a link need it, and
 * page-metadata.ts reaches for the Supabase server client.
 */
export const ROUTE_BY_SLUG: Record<string, string> = {
  homepage: "/",
  "stories-voices": "/stories",
  "language-explorer": "/languages",
};

export function routeForSlug(slug: string): string {
  return ROUTE_BY_SLUG[slug] ?? `/${slug}`;
}
