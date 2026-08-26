import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ENTRY_FIELDS,
  pronunciationAudioIds,
  searchEntries,
  type EntryRow,
} from "@/lib/entries/search";

/**
 * What the Language Explorer needs from the database.
 *
 * Everything here is an ordinary query. No model is involved at any point, and
 * none can be: this is the page where a visitor asks what a Warli or Katkari
 * word is, so the answer comes out of the collection or the page says it has
 * nothing (CLAUDE.md sections 16 and 25).
 *
 * The searching itself is not reimplemented — lib/entries/search.ts owns the
 * cascade, and the assistant runs the same one, so the Explorer and My
 * BhashaSetu can never disagree about what the collection contains.
 */

export const EXPLORER_SORTS = ["relevance", "az", "newest"] as const;
export type ExplorerSort = (typeof EXPLORER_SORTS)[number];

export type ExplorerFilters = {
  q: string;
  /** Language code, e.g. "warli". Absent means both. */
  lang?: string;
  categoryId?: string;
  /** Only entries that have a playable recording. */
  audioOnly: boolean;
  sort: ExplorerSort;
};

/** Bounded so a long paste cannot become a long, expensive query. */
const MAX_QUERY = 200;

export function parseExplorerFilters(
  params: Record<string, string | string[] | undefined>,
  allowed: { languageCodes: string[]; categoryIds: string[] }
): ExplorerFilters {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pick = <T extends string>(value: string | undefined, list: readonly T[]) =>
    value && (list as readonly string[]).includes(value) ? (value as T) : undefined;

  return {
    q: (one("q") ?? "").trim().slice(0, MAX_QUERY),
    lang: pick(one("lang"), allowed.languageCodes),
    categoryId: pick(one("category"), allowed.categoryIds),
    audioOnly: one("audio") === "1",
    sort: pick(one("sort"), EXPLORER_SORTS) ?? "relevance",
  };
}

export type ExplorerLanguage = { id: string; code: string; name: string };
export type ExplorerCategory = {
  id: string;
  name: string;
  icon_name: string | null;
  language_id: string;
};

/** The options the filter controls offer, read from published rows only. */
export async function getExplorerFacets(supabase: SupabaseClient): Promise<{
  languages: ExplorerLanguage[];
  categories: ExplorerCategory[];
}> {
  const [{ data: languages }, { data: categories }] = await Promise.all([
    supabase
      .from("languages")
      .select("id, code, name")
      .eq("status", "published")
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, icon_name, language_id")
      .eq("status", "published")
      .order("display_order"),
  ]);

  return {
    languages: (languages ?? []) as ExplorerLanguage[],
    categories: (categories ?? []) as ExplorerCategory[],
  };
}

export type ExplorerResult = {
  entries: EntryRow[];
  audioByEntryId: Record<string, string>;
  /** Which step of the cascade matched, for the honest "how" note on the card. */
  matchedOn: string | null;
};

/**
 * The result list.
 *
 * With a query, the deterministic cascade decides what matches and in what
 * order, and the filters narrow what it returned — never the other way round.
 * Filtering first and then searching would change which cascade step won, and
 * the step that wins is the whole basis of the "how we matched" note.
 *
 * Without a query this is a plain browse of the collection.
 */
export async function searchExplorer(
  supabase: SupabaseClient,
  filters: ExplorerFilters,
  languages: ExplorerLanguage[]
): Promise<ExplorerResult> {
  const languageId = filters.lang
    ? (languages.find((l) => l.code === filters.lang)?.id ?? null)
    : null;

  let entries: EntryRow[];
  let matchedOn: string | null = null;

  if (filters.q) {
    const found = await searchEntries(supabase, languageId, filters.q, filters.q);
    entries = found.data;
    matchedOn = found.matchedOn;
  } else {
    let query = supabase
      .from("learning_entries")
      .select(ENTRY_FIELDS)
      .eq("status", "published");
    if (languageId) query = query.eq("language_id", languageId);
    const { data } = await query.order("display_order");
    entries = (data ?? []) as unknown as EntryRow[];
  }

  if (filters.categoryId) {
    entries = entries.filter((e) => e.category_id === filters.categoryId);
  }

  const audioByEntryId = await pronunciationAudioIds(supabase, entries);
  if (filters.audioOnly) {
    entries = entries.filter((e) => audioByEntryId[e.id]);
  }

  if (filters.sort === "az") {
    entries = [...entries].sort((a, b) =>
      (a.english_meaning ?? a.native_text).localeCompare(
        b.english_meaning ?? b.native_text
      )
    );
  }
  // "relevance" is the cascade's own order, and "newest" is display_order
  // reversed — the collection has no public sort key better than the one an
  // editor chose.
  if (filters.sort === "newest") entries = [...entries].reverse();

  return { entries, audioByEntryId, matchedOn };
}

export type RelatedWord = { id: string; native_text: string; gloss: string | null };

/**
 * The "Related words" chips.
 *
 * Other published entries in the same category and language. Nothing in the
 * database says two words are related, and inventing a relationship would be
 * inventing content — but a category is a relationship an editor already
 * stated, so "water" sits with "river", "rain" and "pond" because someone
 * filed all four under Nature & Environment.
 *
 * Fetched for every card on screen in one query rather than one per card.
 */
export async function relatedWords(
  supabase: SupabaseClient,
  entries: EntryRow[],
  limit = 3
): Promise<Record<string, { words: RelatedWord[]; more: number }>> {
  const categoryIds = [
    ...new Set(entries.map((e) => e.category_id).filter(Boolean)),
  ] as string[];
  if (categoryIds.length === 0) return {};

  const { data } = await supabase
    .from("learning_entries")
    .select("id, native_text, english_meaning, category_id, language_id")
    .eq("status", "published")
    .in("category_id", categoryIds)
    .order("display_order");

  const pool = (data ?? []) as {
    id: string;
    native_text: string;
    english_meaning: string | null;
    category_id: string | null;
    language_id: string | null;
  }[];

  const out: Record<string, { words: RelatedWord[]; more: number }> = {};
  for (const entry of entries) {
    const siblings = pool.filter(
      (p) =>
        p.id !== entry.id &&
        p.category_id === entry.category_id &&
        p.language_id === entry.language_id
    );
    out[entry.id] = {
      words: siblings.slice(0, limit).map((s) => ({
        id: s.id,
        native_text: s.native_text,
        gloss: s.english_meaning,
      })),
      more: Math.max(0, siblings.length - limit),
    };
  }
  return out;
}

export type DiscoverWord = {
  id: string;
  native_text: string;
  gloss: string | null;
  language_id: string | null;
};

/**
 * The words in the Explore & Discover rail, and what to call the panel.
 *
 * The reference calls this "Trending Words". Nothing has ever been measured, so
 * calling an editor's chosen list "trending" would be a claim we cannot support
 * — the heading follows the source instead. Once search_queries holds enough
 * real searches, `measured` becomes true and the panel says Trending; until
 * then it says Featured, which is exactly what it is.
 */
export async function discoverWords(
  supabase: SupabaseClient,
  limit = 5
): Promise<{ words: DiscoverWord[]; measured: boolean }> {
  const trending = await trendingFromSearches(supabase, limit);
  if (trending.length >= limit) return { words: trending, measured: true };

  const { data } = await supabase
    .from("learning_entries")
    .select("id, native_text, english_meaning, language_id")
    .eq("status", "published")
    .eq("featured", true)
    .order("display_order")
    .limit(limit);

  const rows = (data ?? []) as {
    id: string;
    native_text: string;
    english_meaning: string | null;
    language_id: string | null;
  }[];

  return {
    words: rows.map((w) => ({
      id: w.id,
      native_text: w.native_text,
      gloss: w.english_meaning,
      language_id: w.language_id,
    })),
    measured: false,
  };
}

/** How far back trending looks. Short enough to mean "lately". */
const TRENDING_DAYS = 30;

async function trendingFromSearches(
  supabase: SupabaseClient,
  limit: number
): Promise<DiscoverWord[]> {
  const since = new Date(Date.now() - TRENDING_DAYS * 86400_000).toISOString();
  const { data } = await supabase
    .from("search_queries")
    .select("query_text")
    .gt("result_count", 0)
    .gte("searched_at", since)
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { query_text: string }[]) {
    const key = row.query_text.trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
  if (top.length < limit) return [];

  // Resolved through the same cascade the page uses, so a trending term shows
  // the entry a visitor would actually have landed on.
  const words: DiscoverWord[] = [];
  for (const term of top) {
    const found = await searchEntries(supabase, null, term, term);
    const first = found.data[0];
    if (first) {
      words.push({
        id: first.id,
        native_text: first.native_text,
        gloss: first.english_meaning,
        language_id: first.language_id,
      });
    }
  }
  return words.length >= limit ? words : [];
}

/**
 * Record a search.
 *
 * The query text and what it found, nothing about who asked. Server-side only:
 * there is no public endpoint that writes here, so the insert-only policy
 * cannot be used to fill the table from outside.
 *
 * A failure is swallowed. Not being able to log a search is no reason to fail
 * the visitor's page.
 */
export async function logSearch(
  supabase: SupabaseClient,
  query: string,
  languageId: string | null,
  resultCount: number
): Promise<void> {
  const text = query.trim().slice(0, MAX_QUERY);
  if (!text) return;
  await supabase
    .from("search_queries")
    .insert({ query_text: text, language_id: languageId, result_count: resultCount })
    .then(
      () => undefined,
      () => undefined
    );
}
