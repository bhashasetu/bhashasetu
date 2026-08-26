import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finding a verified Warli or Katkari entry.
 *
 * This lived inside the public API route, which meant the assistant would have
 * had to make an HTTP call to its own server to reuse it — or, far more likely,
 * grow a second copy that drifted. It is the single most important query in the
 * project: it is what makes it structurally impossible for the assistant to
 * answer a language question with anything but stored, community-checked
 * content, so there must be exactly one of it.
 *
 * The cascade is ordered by how certain the match is, and stops at the first
 * hit (CLAUDE.md section 16). No language model is involved at any step, and
 * the last step is an honest empty result rather than a guess.
 */

export type EntryMatch =
  | "native_text"
  | "alias"
  | "english_meaning"
  | "hindi_meaning"
  | "transliteration"
  | "partial";

export type EntryRow = {
  id: string;
  native_text: string;
  transliteration: string | null;
  english_meaning: string | null;
  hindi_meaning: string | null;
  entry_type: string;
  language_id: string | null;
  category_id: string | null;
};

export const ENTRY_FIELDS =
  "id, native_text, transliteration, english_meaning, hindi_meaning, " +
  "entry_type, language_id, category_id";

export type SearchResult = {
  data: EntryRow[];
  matchedOn: EntryMatch | null;
};

/**
 * PostgREST reads % and _ as wildcards in ilike, so a query containing either
 * would silently match far more than it should. Commas and brackets separate
 * terms inside or(), so they are removed rather than escaped.
 */
function forPattern(value: string): string {
  return value.replace(/[%_]/g, (c) => `\\${c}`);
}

function forOr(value: string): string {
  return value.replace(/[(),*]/g, " ").trim();
}

export async function searchEntries(
  supabase: SupabaseClient,
  languageId: string | null,
  q: string
): Promise<SearchResult> {
  const term = q.trim();
  if (!term) return { data: [], matchedOn: null };
  const pattern = forPattern(term);

  const base = () =>
    supabase
      .from("learning_entries")
      .select(ENTRY_FIELDS)
      .eq("status", "published");

  const scoped = (query: ReturnType<typeof base>) =>
    languageId ? query.eq("language_id", languageId) : query;

  const rows = (data: unknown) => (data ?? []) as unknown as EntryRow[];

  // 1. The word itself.
  {
    const { data } = await scoped(base()).ilike("native_text", pattern);
    if (rows(data).length) return { data: rows(data), matchedOn: "native_text" };
  }

  // 2. A spelling variant. These matter more than usual for languages written
  //    down by different people at different times.
  {
    let aliasQuery = supabase
      .from("learning_entry_aliases")
      .select("learning_entry_id")
      .ilike("alias", pattern);
    if (languageId) aliasQuery = aliasQuery.eq("language_id", languageId);

    const { data: aliasRows } = await aliasQuery;
    if (aliasRows?.length) {
      const { data } = await base().in(
        "id",
        aliasRows.map((r) => r.learning_entry_id)
      );
      if (rows(data).length) return { data: rows(data), matchedOn: "alias" };
    }
  }

  // 3-5. Searching by what it means, or by how it sounds in English letters.
  for (const column of ["english_meaning", "hindi_meaning", "transliteration"] as const) {
    const { data } = await scoped(base()).ilike(column, pattern);
    if (rows(data).length) return { data: rows(data), matchedOn: column };
  }

  // 6. Anything containing the term.
  {
    const safe = forOr(pattern);
    if (safe) {
      const { data } = await scoped(base()).or(
        `native_text.ilike.%${safe}%,english_meaning.ilike.%${safe}%`
      );
      if (rows(data).length) return { data: rows(data), matchedOn: "partial" };
    }
  }

  // 7. Nothing. Said plainly, never filled in by a model.
  return { data: [], matchedOn: null };
}

/**
 * The native-speaker recording linked to each entry, where one exists.
 *
 * Returns asset ids, not URLs: signing is the caller's job, because the public
 * page and the assistant sign for different lifetimes.
 */
export async function pronunciationAudioIds(
  supabase: SupabaseClient,
  entries: { id: string }[]
): Promise<Record<string, string>> {
  if (entries.length === 0) return {};

  const { data: links } = await supabase
    .from("media_links")
    .select("linked_entry_id, media_asset_id")
    .eq("linked_entry_type", "learning_entry")
    .eq("link_type", "pronunciation_audio")
    .in(
      "linked_entry_id",
      entries.map((e) => e.id)
    );

  const map: Record<string, string> = {};
  for (const link of links ?? []) {
    map[link.linked_entry_id] = link.media_asset_id;
  }
  return map;
}
