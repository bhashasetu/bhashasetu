import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reading and filtering the Words & Phrases library.
 *
 * Filtering runs in Postgres from URL query parameters, the same shape the
 * Stories list and the public Stories page already use. Search is plain
 * `ilike` across the meaning fields plus aliases — deterministic, no LLM and
 * no vector search (brief section 11, CLAUDE.md sections 16 and 18).
 *
 * Every incoming value is matched against a fixed list, or against ids that
 * came from the database, before it reaches a query.
 */

export const ENTRY_STATUSES = [
  "draft",
  "pending_verification",
  "verified",
  "published",
  "archived",
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const ENTRY_TYPES = ["word", "phrase"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const AUDIO_FILTERS = ["with", "without"] as const;
export type AudioFilter = (typeof AUDIO_FILTERS)[number];

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/** The role a pronunciation recording is linked under. */
export const PRONUNCIATION_LINK_TYPE = "pronunciation_audio";

export type EntryRow = {
  id: string;
  native_text: string;
  transliteration: string | null;
  english_meaning: string;
  hindi_meaning: string | null;
  entry_type: string;
  status: string;
  verified: boolean;
  region: string | null;
  speaker_notes: string | null;
  display_order: number | null;
  updated_at: string | null;
  created_at: string | null;
  updated_by: string | null;
  verified_by: string | null;
  created_by: string | null;
  language: { id: string; code: string; name: string } | null;
  category: { id: string; name: string } | null;
};

const ENTRY_COLUMNS =
  "id, native_text, transliteration, english_meaning, hindi_meaning, " +
  "entry_type, status, verified, region, speaker_notes, display_order, " +
  "updated_at, created_at, updated_by, verified_by, created_by, " +
  "language:languages(id, code, name), category:categories(id, name)";

export type EntryFilters = {
  q: string;
  languageId?: string;
  categoryId?: string;
  status?: EntryStatus;
  entryType?: EntryType;
  audio?: AudioFilter;
  page: number;
  pageSize: number;
};

export type FilterOptions = {
  languageIds: string[];
  categoryIds: string[];
};

/** Turn raw searchParams into filters, discarding anything unrecognised. */
export function parseEntryFilters(
  params: Record<string, string | string[] | undefined>,
  allowed: FilterOptions
): EntryFilters {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pick = <T extends string>(value: string | undefined, list: readonly T[]) =>
    value && (list as readonly string[]).includes(value) ? (value as T) : undefined;

  const rawPage = Number(one("page"));
  const rawSize = Number(one("size"));

  return {
    q: (one("q") ?? "").trim().slice(0, 200),
    languageId: pick(one("language"), allowed.languageIds),
    categoryId: pick(one("category"), allowed.categoryIds),
    status: pick(one("status"), ENTRY_STATUSES),
    entryType: pick(one("type"), ENTRY_TYPES),
    audio: pick(one("audio"), AUDIO_FILTERS),
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(rawSize) ? rawSize : 10,
  };
}

/**
 * PostgREST's `or()` takes a comma-separated expression, so a comma or a
 * parenthesis in the search box would otherwise change its meaning. Strip the
 * separators and the LIKE wildcards rather than escaping them: a visitor
 * typing `%` means the character, not "match anything".
 */
function sanitiseSearch(value: string): string {
  return value.replace(/[(),*%_\\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Ids of entries whose alias matches the search term.
 *
 * Aliases live in their own table, and PostgREST cannot OR across a joined
 * table and the base table in one expression — so they are looked up first
 * and folded into the main query as an id list.
 */
async function idsMatchingAlias(
  supabase: SupabaseClient,
  term: string
): Promise<string[]> {
  const { data } = await supabase
    .from("learning_entry_aliases")
    .select("learning_entry_id")
    .ilike("alias", `%${term}%`)
    .limit(500);

  return [...new Set((data ?? []).map((r) => r.learning_entry_id as string))];
}

/**
 * Entry id -> the published pronunciation asset linked to it.
 *
 * This returned only a set of ids, which was enough to show whether a
 * recording existed but not enough to play one — so the list's play control
 * had nothing to point at. The asset id comes back with it now.
 */
export async function audioAssetByEntry(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("media_links")
    .select("linked_entry_id, media_asset_id, media_assets!inner(status)")
    .eq("linked_entry_type", "learning_entry")
    .eq("link_type", PRONUNCIATION_LINK_TYPE)
    .eq("media_assets.status", "published");

  const byEntry = new Map<string, string>();
  for (const row of data ?? []) {
    byEntry.set(row.linked_entry_id as string, row.media_asset_id as string);
  }
  return byEntry;
}

export type EntryPage = {
  rows: EntryRow[];
  total: number;
  /** Entry id -> playable asset id. */
  withAudio: Map<string, string>;
};

/** One page of entries for the management list. */
export async function getEntries(
  supabase: SupabaseClient,
  filters: EntryFilters
): Promise<EntryPage> {
  const withAudio = await audioAssetByEntry(supabase);

  let query = supabase
    .from("learning_entries")
    .select(ENTRY_COLUMNS, { count: "exact" });

  if (filters.languageId) query = query.eq("language_id", filters.languageId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.entryType) query = query.eq("entry_type", filters.entryType);

  const term = sanitiseSearch(filters.q);
  if (term) {
    const aliasIds = await idsMatchingAlias(supabase, term);
    const clauses = [
      `native_text.ilike.%${term}%`,
      `transliteration.ilike.%${term}%`,
      `english_meaning.ilike.%${term}%`,
      `hindi_meaning.ilike.%${term}%`,
    ];
    if (aliasIds.length > 0) clauses.push(`id.in.(${aliasIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  // Audio presence is a property of media_links, not of the entry row, so it
  // is applied against the id set rather than as a column filter.
  if (filters.audio === "with") {
    const ids = [...withAudio.keys()];
    if (ids.length === 0) return { rows: [], total: 0, withAudio };
    query = query.in("id", ids);
  } else if (filters.audio === "without") {
    const ids = [...withAudio.keys()];
    if (ids.length > 0) query = query.not("id", "in", `(${ids.join(",")})`);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const { data, count } = await query
    .order("updated_at", { ascending: false, nullsFirst: false })
    .range(from, from + filters.pageSize - 1);

  return {
    rows: (data ?? []) as unknown as EntryRow[],
    total: count ?? 0,
    withAudio,
  };
}

export type EntryCounts = {
  words: number;
  phrases: number;
  missingAudio: number;
  drafts: number;
};

/**
 * The four summary cards, all derived.
 *
 * The reference shows growth figures such as "+8.2% this month"; nothing
 * stores historical snapshots, so those are omitted rather than invented
 * (brief section 12).
 *
 * "Missing audio" counts entries that are meant to be heard — verified or
 * published — and have no published recording linked. A draft with no audio
 * yet is simply unfinished, not a gap worth flagging.
 */
export async function getEntryCounts(
  supabase: SupabaseClient
): Promise<EntryCounts> {
  const [words, phrases, drafts, needAudio, withAudio] = await Promise.all([
    supabase
      .from("learning_entries")
      .select("id", { count: "exact", head: true })
      .eq("entry_type", "word")
      .neq("status", "archived"),
    supabase
      .from("learning_entries")
      .select("id", { count: "exact", head: true })
      .eq("entry_type", "phrase")
      .neq("status", "archived"),
    supabase
      .from("learning_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("learning_entries")
      .select("id")
      .in("status", ["verified", "published"]),
    audioAssetByEntry(supabase),
  ]);

  const missingAudio = (needAudio.data ?? []).filter(
    (row) => !withAudio.has(row.id as string)
  ).length;

  return {
    words: words.count ?? 0,
    phrases: phrases.count ?? 0,
    missingAudio,
    drafts: drafts.count ?? 0,
  };
}

/** Human label for a workflow status. */
export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_verification: "Pending",
  verified: "Verified",
  published: "Published",
  archived: "Archived",
};

/** "2h ago" / "3d ago", as the reference's Last Updated column shows. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
