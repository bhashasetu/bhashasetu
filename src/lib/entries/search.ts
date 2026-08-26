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
  | "partial"
  /** The question contained one of our phrases, rather than being one. */
  | "contained";

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

/**
 * Contractions, written out.
 *
 * A visitor typed "I want to say I am hungry in Warli" and was told we had
 * nothing, while the collection held that phrase with the meaning recorded as
 * "im hungry". Neither spelling is wrong; they are the same sentence. Every
 * comparison below runs both sides through the same expansion so the two meet.
 *
 * The apostrophe is stripped before this runs, so one entry covers all three
 * spellings a person might use: I'm, Im, and I am.
 *
 * Ambiguous ones are left alone on purpose. "ill" is a word, "were" is a word,
 * and expanding them would match sentences that mean something else.
 */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bim\b/g, "i am"],
  [/\bive\b/g, "i have"],
  [/\byoure\b/g, "you are"],
  [/\byouve\b/g, "you have"],
  [/\bhes\b/g, "he is"],
  [/\bshes\b/g, "she is"],
  [/\bits\b/g, "it is"],
  [/\bthats\b/g, "that is"],
  [/\bwhats\b/g, "what is"],
  [/\bhows\b/g, "how is"],
  [/\bwheres\b/g, "where is"],
  [/\blets\b/g, "let us"],
  [/\bdont\b/g, "do not"],
  [/\bdoesnt\b/g, "does not"],
  [/\bdidnt\b/g, "did not"],
  [/\bisnt\b/g, "is not"],
  [/\barent\b/g, "are not"],
  [/\bwasnt\b/g, "was not"],
  [/\bhavent\b/g, "have not"],
  [/\bhasnt\b/g, "has not"],
  [/\bwont\b/g, "will not"],
  // All three forms land on the same one, so any of them matches any other.
  [/\bcannot\b/g, "can not"],
  [/\bcant\b/g, "can not"],
];

/**
 * One spelling of a phrase, for comparing against another.
 *
 * Lower case, no punctuation, no apostrophes, contractions written out, single
 * spaces. Devanagari passes through untouched — the Unicode letter class keeps
 * it, and none of the rules above apply to it.
 *
 * This is only ever used to compare, never to display or to store.
 */
export function canonical(value: string): string {
  let text = value
    .toLowerCase()
    // Curly quotes are what phones type, and the apostrophe has to be gone
    // before the contractions above can be recognised at all.
    .replace(/[‘’‛′`]/g, "'")
    .replace(/'/g, "")
    /**
     * Everything that is not part of a word becomes a gap, which also handles
     * the full stop in "in Warli." and the Devanagari danda.
     *
     * \p{M} is not optional. Devanagari vowel signs and the virama are marks,
     * not letters, so a class of letters and digits alone quietly reduced
     * "मैं ठीक हूँ" to "म ठ क ह" — every matra stripped, and Hindi matching
     * broken in a way that still looked like text.
     */
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ");

  for (const [from, to] of CONTRACTIONS) text = text.replace(from, to);
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Editorial notes that are not content.
 *
 * A transliteration recorded as "(same)" — because the native text is already
 * in Latin letters — would otherwise match every question containing the word
 * "same". Anything wholly in brackets is a note to another editor, and these
 * few bare words are the placeholders that turn up in practice.
 */
const PLACEHOLDERS = new Set(["same", "na", "n a", "none", "tbd", "unknown"]);

function isContent(original: string, canonicalised: string): boolean {
  if (canonicalised.length < 4) return false;
  if (/^\(.*\)$/.test(original.trim())) return false;
  return !PLACEHOLDERS.has(canonicalised);
}

/**
 * Does the question contain one of our phrases?
 *
 * Pure, and separated from the query above so it can be tested against the
 * sentences people actually type without a database. Both sides are
 * canonicalised, and the comparison is on whole words: padding each side with
 * a space stops "at" from matching inside "water".
 *
 * The longest match wins — a question containing both "tree" and "where is the
 * school" is about the school — and every entry that matched on that same
 * longest phrase comes back, so a phrase held in both languages returns both.
 */
export function containedMatch(rows: EntryRow[], question: string): EntryRow[] {
  const asked = ` ${canonical(question)} `;
  if (asked.trim().length === 0) return [];

  const hits = rows
    .map((row) => {
      const longest = [
        row.english_meaning,
        row.hindi_meaning,
        row.native_text,
        row.transliteration,
      ]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => ({ original: v, text: canonical(v) }))
        .filter((v) => isContent(v.original, v.text))
        .filter((v) => asked.includes(` ${v.text} `))
        .sort((a, b) => b.text.length - a.text.length)[0];

      return longest ? { row, length: longest.text.length } : null;
    })
    .filter((hit): hit is { row: EntryRow; length: number } => hit !== null)
    .sort((a, b) => b.length - a.length);

  if (hits.length === 0) return [];
  const best = hits[0].length;
  return hits.filter((h) => h.length === best).map((h) => h.row);
}

function forOr(value: string): string {
  return value.replace(/[(),*]/g, " ").trim();
}

export async function searchEntries(
  supabase: SupabaseClient,
  languageId: string | null,
  q: string,
  /**
   * The whole question, before anything was stripped out of it.
   *
   * Only the containment step uses it, and only that step can: every other
   * step needs the reduced term. Scanning the reduction would be pointless —
   * the reduction is the thing that failed.
   */
  fullQuestion?: string
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

  /**
   * 7. The other direction: does the question contain one of our phrases?
   *
   * Every step above takes the question, reduces it to a term, and looks that
   * term up. When the reduction fails — an unusual phrasing, a transcription
   * that came back in the wrong script — the phrase can be sitting in the
   * collection and still be missed, because nothing ever compares the two.
   *
   * This scans the published entries and keeps the ones whose meaning, native
   * text or transliteration appears inside what was asked. "Say how are you in
   * Warli" contains "how are you", and that is the answer.
   *
   * Both sides are canonicalised first, which is what makes "I am hungry" find
   * a phrase whose meaning an editor recorded as "im hungry". See
   * containedMatch above for the rest.
   */
  {
    const { data } = await scoped(base());
    const found = containedMatch(rows(data), fullQuestion ?? term);
    if (found.length) return { data: found, matchedOn: "contained" };
  }

  // 8. Nothing. Said plainly, never filled in by a model.
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
