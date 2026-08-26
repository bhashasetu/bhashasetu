import { requireAdmin } from "@/lib/auth/require-admin";
import { adminCheckFailureResponse } from "@/lib/api/respond";
import {
  getEntries,
  parseEntryFilters,
  STATUS_LABELS,
  type EntryRow,
} from "@/lib/entries/queries";

/**
 * CSV of the current filtered list.
 *
 * The approved screen shows both an Export and a Bulk Actions control. Export
 * is the one that is genuinely safe: it reads, it changes nothing, and it lets
 * a reviewer check a batch of entries away from the screen. Bulk verification
 * or deletion would need care this slice does not have, so it is not offered
 * (brief section 17).
 */

/** Escape a field for CSV: quote it, and double any quotes inside. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "Native text",
  "Transliteration",
  "English meaning",
  "Hindi meaning",
  "Type",
  "Language",
  "Category",
  "Status",
  "Has audio",
  "Region",
  "Last updated",
];

function toRow(entry: EntryRow, hasAudio: boolean): string {
  return [
    entry.native_text,
    entry.transliteration,
    entry.english_meaning,
    entry.hindi_meaning,
    entry.entry_type,
    entry.language?.name,
    entry.category?.name,
    STATUS_LABELS[entry.status] ?? entry.status,
    hasAudio ? "yes" : "no",
    entry.region,
    entry.updated_at,
  ]
    .map(csvCell)
    .join(",");
}

export async function GET(request: Request) {
  const check = await requireAdmin();
  if (!check.ok) return adminCheckFailureResponse(check);

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  // The filter values are validated against the database's own ids, exactly
  // as the list screen does, so an export cannot reach rows the list cannot.
  const [{ data: languages }, { data: categories }] = await Promise.all([
    check.supabase.from("languages").select("id"),
    check.supabase.from("categories").select("id"),
  ]);

  const filters = parseEntryFilters(params, {
    languageIds: (languages ?? []).map((l) => l.id as string),
    categoryIds: (categories ?? []).map((c) => c.id as string),
  });

  // Export the whole filtered set, not just the page being viewed.
  const { rows, withAudio } = await getEntries(check.supabase, {
    ...filters,
    page: 1,
    pageSize: 5000,
  });

  const csv = [
    HEADERS.map(csvCell).join(","),
    ...rows.map((entry) => toRow(entry, withAudio.has(entry.id))),
  ].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${csv}`, {
    headers: {
      // BOM above so Excel opens Devanagari correctly rather than as mojibake.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="words-and-phrases-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
