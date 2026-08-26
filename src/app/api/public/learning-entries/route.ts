import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ENTRY_FIELDS,
  pronunciationAudioIds,
  searchEntries,
  type EntryRow,
} from "@/lib/entries/search";

/**
 * Public lookup for the Language Explorer.
 *
 * The deterministic cascade this used to define inline now lives in
 * lib/entries/search.ts, so the assistant runs the same query rather than a
 * copy of it that could drift.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const languageId = url.searchParams.get("language_id");
  const categoryId = url.searchParams.get("category_id");
  const q = url.searchParams.get("q")?.trim();

  if (q) {
    const result = await searchEntries(supabase, languageId, q);
    const audioByEntryId = await pronunciationAudioIds(supabase, result.data);
    return NextResponse.json({ ...result, audioByEntryId });
  }

  let query = supabase
    .from("learning_entries")
    .select(ENTRY_FIELDS)
    .eq("status", "published");
  if (languageId) query = query.eq("language_id", languageId);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query.order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data ?? []) as unknown as EntryRow[];
  const audioByEntryId = await pronunciationAudioIds(supabase, entries);
  return NextResponse.json({ data: entries, audioByEntryId });
}
