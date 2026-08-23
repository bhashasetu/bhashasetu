import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LearningEntryForm } from "@/components/admin/LearningEntryForm";
import { EntryStatusControls } from "@/components/admin/EntryStatusControls";
import { MediaAttachment } from "@/components/admin/MediaAttachment";

export default async function EditLearningEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: entry },
    { data: languages },
    { data: categories },
    { data: links },
    { data: audioMedia },
  ] = await Promise.all([
    supabase.from("learning_entries").select("*").eq("id", id).single(),
    supabase.from("languages").select("id, name, code").order("name"),
    supabase.from("categories").select("id, name, language_id").order("name"),
    supabase
      .from("media_links")
      .select("id, link_type, media_asset_id, media_assets(filename, status)")
      .eq("linked_entry_type", "learning_entry")
      .eq("linked_entry_id", id),
    supabase
      .from("media_assets")
      .select("id, filename, title, status")
      .eq("media_type", "audio")
      .order("created_at", { ascending: false }),
  ]);

  if (!entry) notFound();

  const linkedMedia = (links ?? []).map((link) => {
    const media = link.media_assets as unknown as { filename: string; status: string } | null;
    return {
      linkId: link.id,
      linkType: link.link_type,
      mediaAssetId: link.media_asset_id,
      filename: media?.filename ?? link.media_asset_id,
      status: media?.status ?? "unknown",
    };
  });

  return (
    <main>
      <h1>Edit Learning Entry: {entry.native_text}</h1>
      <EntryStatusControls entryId={entry.id} status={entry.status} />
      <LearningEntryForm
        entry={entry}
        languages={languages ?? []}
        categories={categories ?? []}
      />
      <MediaAttachment
        entryId={entry.id}
        linkedMedia={linkedMedia}
        availableAudio={audioMedia ?? []}
      />
    </main>
  );
}
