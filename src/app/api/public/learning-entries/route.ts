import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ENTRY_FIELDS =
  "id, native_text, transliteration, english_meaning, hindi_meaning, entry_type, language_id, category_id";

/**
 * Deterministic search cascade (governance Point 16 / CLAUDE.md Section 16):
 * exact match → alias match → English → Hindi → transliteration →
 * partial match → honest no-result. No LLM involvement.
 */
async function deterministicSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  languageId: string | null,
  q: string
) {
  const base = supabase.from("learning_entries").select(ENTRY_FIELDS).eq("status", "published");
  const withLang = (query: typeof base) => (languageId ? query.eq("language_id", languageId) : query);

  // 1. Exact match on native_text
  let { data } = await withLang(base).ilike("native_text", q);
  if (data && data.length > 0) return { data, matchedOn: "native_text" };

  // 2. Alias match
  let aliasQuery = supabase
    .from("learning_entry_aliases")
    .select("learning_entry_id")
    .ilike("alias", q);
  if (languageId) aliasQuery = aliasQuery.eq("language_id", languageId);
  const { data: aliasRows } = await aliasQuery;
  if (aliasRows && aliasRows.length > 0) {
    const ids = aliasRows.map((r) => r.learning_entry_id);
    const { data: byAlias } = await supabase
      .from("learning_entries")
      .select(ENTRY_FIELDS)
      .eq("status", "published")
      .in("id", ids);
    if (byAlias && byAlias.length > 0) return { data: byAlias, matchedOn: "alias" };
  }

  // 3. English meaning
  ({ data } = await withLang(base).ilike("english_meaning", q));
  if (data && data.length > 0) return { data, matchedOn: "english_meaning" };

  // 4. Hindi meaning
  ({ data } = await withLang(base).ilike("hindi_meaning", q));
  if (data && data.length > 0) return { data, matchedOn: "hindi_meaning" };

  // 5. Transliteration
  ({ data } = await withLang(base).ilike("transliteration", q));
  if (data && data.length > 0) return { data, matchedOn: "transliteration" };

  // 6. Partial match across native_text / english_meaning
  ({ data } = await withLang(base).or(
    `native_text.ilike.%${q}%,english_meaning.ilike.%${q}%`
  ));
  if (data && data.length > 0) return { data, matchedOn: "partial" };

  // 7. Honest no-result
  return { data: [], matchedOn: null };
}

async function attachAudioIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: { id: string }[]
) {
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const languageId = url.searchParams.get("language_id");
  const categoryId = url.searchParams.get("category_id");
  const q = url.searchParams.get("q")?.trim();

  if (q) {
    const result = await deterministicSearch(supabase, languageId, q);
    const audioByEntryId = await attachAudioIds(supabase, result.data);
    return NextResponse.json({ ...result, audioByEntryId });
  }

  let query = supabase.from("learning_entries").select(ENTRY_FIELDS).eq("status", "published");
  if (languageId) query = query.eq("language_id", languageId);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query.order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const audioByEntryId = await attachAudioIds(supabase, data ?? []);
  return NextResponse.json({ data: data ?? [], audioByEntryId });
}
