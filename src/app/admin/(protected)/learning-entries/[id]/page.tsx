import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearningEntryForm } from "@/components/admin/LearningEntryForm";
import { EntryStatusControls } from "@/components/admin/EntryStatusControls";
import { PRONUNCIATION_LINK_TYPE } from "@/lib/entries/queries";

export const dynamic = "force-dynamic";

export default async function EditLearningEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: entry }, { data: languages }, { data: categories }, { data: links }] =
    await Promise.all([
      supabase.from("learning_entries").select("*").eq("id", id).single(),
      supabase
        .from("languages")
        .select("id, name, code")
        .eq("status", "published")
        .order("created_at"),
      supabase
        .from("categories")
        .select("id, name, language_id")
        .neq("status", "archived")
        .order("display_order")
        .order("name"),
      supabase
        .from("media_links")
        .select("id, media_asset_id")
        .eq("linked_entry_type", "learning_entry")
        .eq("linked_entry_id", id)
        .eq("link_type", PRONUNCIATION_LINK_TYPE)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  if (!entry) notFound();

  const link = links?.[0];

  return (
    <>
      <LearningEntryForm
        entry={entry}
        languages={languages ?? []}
        categories={categories ?? []}
        initialAudioAssetId={link?.media_asset_id ?? null}
        initialAudioLinkId={link?.id ?? null}
      />
      <EntryStatusControls entryId={entry.id} status={entry.status} />
    </>
  );
}
