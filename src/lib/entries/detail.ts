import type { SupabaseClient } from "@supabase/supabase-js";
import { PRONUNCIATION_LINK_TYPE, type EntryRow } from "./queries";

/**
 * Everything the entry detail panel shows.
 *
 * All four tabs are backed by real rows. Nothing is fabricated to fill a tab
 * out: where there is no data the panel shows an empty state instead (brief
 * sections 13 to 15).
 */

export type AudioEligibility =
  | "missing"
  | "draft"
  | "eligible"
  | "blocked_consent"
  | "archived";

export type EntryAudio = {
  linkId: string;
  assetId: string;
  filename: string;
  title: string | null;
  status: string;
  eligibility: AudioEligibility;
  /** Why the recording is not yet playable in public, when it is not. */
  reason: string | null;
  speakerName: string | null;
  region: string | null;
  recordingDate: string | null;
  consentStatus: string | null;
  playbackPermission: string | null;
  /** Other entries the same recording is attached to. */
  alsoUsedBy: { id: string; native_text: string }[];
};

export type HistoryEvent = {
  id: string;
  oldStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  createdAt: string | null;
  actor: string | null;
};

export type EntryDetail = {
  entry: EntryRow;
  audio: EntryAudio | null;
  history: HistoryEvent[];
  aliases: { id: string; alias: string }[];
  related: { id: string; native_text: string; english_meaning: string }[];
  /** Display names for the created/updated/verified bylines. */
  people: Record<string, string>;
};

const DETAIL_COLUMNS =
  "id, native_text, transliteration, english_meaning, hindi_meaning, " +
  "entry_type, status, verified, region, speaker_notes, display_order, " +
  "updated_at, created_at, updated_by, verified_by, created_by, " +
  "language:languages(id, code, name), category:categories(id, name)";

/**
 * Work out whether a linked recording is actually playable in public.
 *
 * These are the same conditions getSignedMediaUrl enforces, restated so the
 * Back Office can explain the state rather than just failing to play
 * (brief section 7). An asset sitting in storage is not public learning audio.
 */
function assessAudio(
  assetStatus: string,
  consentStatus: string | null,
  playbackPermission: string | null
): { eligibility: AudioEligibility; reason: string | null } {
  if (assetStatus === "archived") {
    return { eligibility: "archived", reason: "The recording has been archived." };
  }
  if (assetStatus !== "published") {
    return {
      eligibility: "draft",
      reason: "The recording is still a draft in the Media Library.",
    };
  }
  if (!["obtained", "not_applicable"].includes(consentStatus ?? "")) {
    return {
      eligibility: "blocked_consent",
      reason:
        "Consent for this recording is not recorded as obtained, so it will not play publicly.",
    };
  }
  if (playbackPermission !== "public") {
    return {
      eligibility: "blocked_consent",
      reason: "Public playback is not permitted for this recording.",
    };
  }
  return { eligibility: "eligible", reason: null };
}

export async function getEntryDetail(
  supabase: SupabaseClient,
  id: string
): Promise<EntryDetail | null> {
  const { data: entryRow } = await supabase
    .from("learning_entries")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (!entryRow) return null;
  const entry = entryRow as unknown as EntryRow;

  const [{ data: links }, { data: auditRows }, { data: aliasRows }] =
    await Promise.all([
      supabase
        .from("media_links")
        .select("id, media_asset_id, media_assets(id, filename, title, status)")
        .eq("linked_entry_type", "learning_entry")
        .eq("linked_entry_id", id)
        .eq("link_type", PRONUNCIATION_LINK_TYPE)
        .order("created_at", { ascending: false }),
      supabase
        .from("verification_audit_log")
        .select("id, old_status, new_status, notes, created_at, verified_by")
        .eq("learning_entry_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("learning_entry_aliases")
        .select("id, alias")
        .eq("learning_entry_id", id)
        .order("alias"),
    ]);

  // Other entries filed under the same category, as a genuine relationship.
  // Never an inferred or generated one (brief section 15).
  const { data: relatedRows } = entry.category
    ? await supabase
        .from("learning_entries")
        .select("id, native_text, english_meaning")
        .eq("category_id", entry.category.id)
        .neq("id", id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(6)
    : { data: [] };

  let audio: EntryAudio | null = null;
  const link = links?.[0];

  if (link) {
    const asset = (Array.isArray(link.media_assets)
      ? link.media_assets[0]
      : link.media_assets) as
      | { id: string; filename: string; title: string | null; status: string }
      | null
      | undefined;

    if (asset) {
      const [{ data: meta }, { data: otherLinks }] = await Promise.all([
        supabase
          .from("audio_metadata")
          .select(
            "speaker_name, region, recording_date, consent_status, playback_permission"
          )
          .eq("media_asset_id", asset.id)
          .maybeSingle(),
        supabase
          .from("media_links")
          .select("linked_entry_id, learning_entries(id, native_text)")
          .eq("media_asset_id", asset.id)
          .eq("linked_entry_type", "learning_entry")
          .neq("linked_entry_id", id),
      ]);

      const { eligibility, reason } = assessAudio(
        asset.status,
        meta?.consent_status ?? null,
        meta?.playback_permission ?? null
      );

      audio = {
        linkId: link.id,
        assetId: asset.id,
        filename: asset.filename,
        title: asset.title,
        status: asset.status,
        eligibility,
        reason,
        speakerName: meta?.speaker_name ?? null,
        region: meta?.region ?? null,
        recordingDate: meta?.recording_date ?? null,
        consentStatus: meta?.consent_status ?? null,
        playbackPermission: meta?.playback_permission ?? null,
        alsoUsedBy: (otherLinks ?? []).flatMap((row) => {
          const e = (Array.isArray(row.learning_entries)
            ? row.learning_entries[0]
            : row.learning_entries) as
            | { id: string; native_text: string }
            | null
            | undefined;
          return e ? [e] : [];
        }),
      };
    }
  }

  // Resolve the bylines the list and panel show. back_office_users is the
  // only place a display name exists; auth.users is not readable here.
  const actorIds = [
    ...new Set(
      [
        entry.created_by,
        entry.updated_by,
        entry.verified_by,
        ...(auditRows ?? []).map((r) => r.verified_by as string | null),
      ].filter((v): v is string => !!v)
    ),
  ];

  const people: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: users } = await supabase
      .from("back_office_users")
      .select("id, full_name, email")
      .in("id", actorIds);

    for (const u of users ?? []) {
      people[u.id as string] = (u.full_name as string) || (u.email as string);
    }
  }

  return {
    entry,
    audio,
    history: (auditRows ?? []).map((r) => ({
      id: r.id as string,
      oldStatus: r.old_status as string | null,
      newStatus: r.new_status as string | null,
      notes: r.notes as string | null,
      createdAt: r.created_at as string | null,
      actor: r.verified_by ? people[r.verified_by as string] ?? null : null,
    })),
    aliases: (aliasRows ?? []) as { id: string; alias: string }[],
    related: (relatedRows ?? []) as {
      id: string;
      native_text: string;
      english_meaning: string;
    }[],
    people,
  };
}

/** Display names for the bylines shown in the list. */
export async function getActorNames(
  supabase: SupabaseClient,
  ids: (string | null)[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (unique.length === 0) return {};

  const { data } = await supabase
    .from("back_office_users")
    .select("id, full_name, email")
    .in("id", unique);

  const names: Record<string, string> = {};
  for (const u of data ?? []) {
    names[u.id as string] = (u.full_name as string) || (u.email as string);
  }
  return names;
}
