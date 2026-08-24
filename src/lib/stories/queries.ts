import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reading and filtering the Stories & Voices archive.
 *
 * Filtering is deterministic and runs in Postgres, driven entirely by URL
 * query parameters (CLAUDE.md sections 16 and 18 — no LLM anywhere near
 * search). Query params rather than client state because the page renders
 * only nine cards out of a collection meant to reach a couple of hundred
 * records, so shipping the whole archive to the browser to filter it there
 * would fetch an order of magnitude more than it displays. It also makes
 * every filter state a real, shareable, crawlable URL.
 *
 * Every incoming value is matched against a fixed list before it reaches a
 * query. An unrecognised value falls back to the default rather than being
 * passed through.
 */

export const STORY_FORMATS = ["interview", "audio", "song"] as const;
export type StoryFormat = (typeof STORY_FORMATS)[number];

export const STORY_SORTS = ["latest", "oldest", "duration", "az"] as const;
export type StorySort = (typeof STORY_SORTS)[number];

export type StoryRow = {
  id: string;
  slug: string;
  title: string;
  format: string;
  speaker_name: string | null;
  speaker_role: string | null;
  speaker_place: string | null;
  summary: string | null;
  theme: string | null;
  age_group: string | null;
  duration_seconds: number | null;
  featured: boolean;
  display_order: number | null;
  published_at: string | null;
  thumbnail_asset_id: string | null;
  media_asset_id: string | null;
  language: { code: string; name: string } | null;
};

const STORY_COLUMNS =
  "id, slug, title, format, speaker_name, speaker_role, speaker_place, " +
  "summary, theme, age_group, duration_seconds, featured, display_order, " +
  "published_at, thumbnail_asset_id, media_asset_id, " +
  "language:languages(code, name)";

export type StoryFilters = {
  lang?: string;
  format?: StoryFormat;
  theme?: string;
  age?: string;
  sort: StorySort;
};

/**
 * Turn raw searchParams into filters, discarding anything not on a known
 * list. `languageCodes` and the theme/age sets come from the database, so the
 * allowed values track the content rather than a hardcoded list.
 */
export function parseStoryFilters(
  params: Record<string, string | string[] | undefined>,
  allowed: { languageCodes: string[]; themes: string[]; ageGroups: string[] }
): StoryFilters {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pick = <T extends string>(value: string | undefined, list: readonly T[]) =>
    value && (list as readonly string[]).includes(value) ? (value as T) : undefined;

  return {
    lang: pick(one("lang"), allowed.languageCodes),
    format: pick(one("format"), STORY_FORMATS),
    theme: pick(one("theme"), allowed.themes),
    age: pick(one("age"), allowed.ageGroups),
    sort: pick(one("sort"), STORY_SORTS) ?? "latest",
  };
}

/** The option lists the filter controls offer, read from published rows. */
export async function getStoryFacets(supabase: SupabaseClient): Promise<{
  languages: { code: string; name: string }[];
  themes: string[];
  ageGroups: string[];
}> {
  const [{ data: languages }, { data: rows }] = await Promise.all([
    supabase
      .from("languages")
      .select("code, name")
      // Insertion order, not alphabetical: both approved references lead
      // with Warli, and sorting by name would put Katkari first.
      .eq("status", "published")
      .order("created_at", { ascending: true }),
    supabase
      .from("stories")
      .select("theme, age_group")
      .eq("status", "published"),
  ]);

  const themes = [
    ...new Set((rows ?? []).map((r) => r.theme).filter((t): t is string => !!t)),
  ].sort();
  const ageGroups = [
    ...new Set(
      (rows ?? []).map((r) => r.age_group).filter((a): a is string => !!a)
    ),
  ].sort();

  return { languages: languages ?? [], themes, ageGroups };
}

function applySort(
  // The builder type from PostgREST is not exported in a usable form here;
  // this is the narrow surface actually used.
  query: {
    order: (
      column: string,
      options?: { ascending?: boolean; nullsFirst?: boolean }
    ) => typeof query;
  },
  sort: StorySort
) {
  switch (sort) {
    case "oldest":
      return query.order("published_at", { ascending: true, nullsFirst: false });
    case "duration":
      return query.order("duration_seconds", { ascending: true, nullsFirst: false });
    case "az":
      return query.order("title", { ascending: true });
    case "latest":
    default:
      return query.order("published_at", { ascending: false, nullsFirst: false });
  }
}

/**
 * Published stories of one format, newest first by default.
 *
 * display_order leads so an editor can pin a story to the front of a rail;
 * the chosen sort breaks ties among everything they have not pinned.
 */
export async function getStories(
  supabase: SupabaseClient,
  {
    format,
    filters,
    limit,
  }: { format: StoryFormat | StoryFormat[]; filters: StoryFilters; limit: number }
): Promise<StoryRow[]> {
  let query = supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("status", "published");

  query = Array.isArray(format)
    ? query.in("format", format)
    : query.eq("format", format);

  if (filters.theme) query = query.eq("theme", filters.theme);
  if (filters.age) query = query.eq("age_group", filters.age);
  if (filters.lang) {
    // Filtering on the embedded table needs the FK path, not the alias.
    query = query.eq("languages.code", filters.lang).not("language_id", "is", null);
  }

  query = query.order("display_order", { ascending: true, nullsFirst: false });
  query = applySort(query as never, filters.sort) as never;

  const { data } = await query.limit(limit);
  return (data ?? []) as unknown as StoryRow[];
}

/** The one story an editor has flagged featured, if any. */
export async function getFeaturedStory(
  supabase: SupabaseClient
): Promise<StoryRow | null> {
  const { data } = await supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("status", "published")
    .eq("featured", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return (data as unknown as StoryRow | null) ?? null;
}

/**
 * Counts for the hero strip.
 *
 * Derived rather than typed in, so the figures on the page are always true.
 * The reference's "86+ interviews" and "120+ audio clips" are mock-up numbers
 * and are never seeded (CLAUDE.md section 25).
 */
export async function getStoryCounts(supabase: SupabaseClient): Promise<{
  interviews: number;
  audioClips: number;
}> {
  const [interviews, audioClips] = await Promise.all([
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .eq("format", "interview"),
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .in("format", ["audio", "song"]),
  ]);

  return {
    interviews: interviews.count ?? 0,
    audioClips: audioClips.count ?? 0,
  };
}

/** Resolve signed URLs for a batch of story media assets in one pass. */
export async function resolveStoryAssetUrls(
  supabase: SupabaseClient,
  assetIds: (string | null)[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const ids = [...new Set(assetIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return resolved;

  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path")
    .in("id", ids)
    .eq("status", "published");

  if (!assets?.length) return resolved;

  const pathsByBucket = new Map<string, string[]>();
  for (const asset of assets) {
    const paths = pathsByBucket.get(asset.storage_bucket) ?? [];
    paths.push(asset.storage_path);
    pathsByBucket.set(asset.storage_bucket, paths);
  }

  const signed = new Map<string, string>();
  await Promise.all(
    [...pathsByBucket.entries()].map(async ([bucket, paths]) => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, 60 * 60);
      for (const entry of data ?? []) {
        if (entry.signedUrl && entry.path) {
          signed.set(`${bucket}:${entry.path}`, entry.signedUrl);
        }
      }
    })
  );

  for (const asset of assets) {
    const url = signed.get(`${asset.storage_bucket}:${asset.storage_path}`);
    if (url) resolved.set(asset.id, url);
  }

  return resolved;
}

/** "12:34" / "00:58" — the badge format the approved design uses. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
