import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MediaDetailPanel } from "@/components/admin/MediaDetailPanel";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: media }, { data: audioMeta }, { data: links }] = await Promise.all([
    supabase.from("media_assets").select("*").eq("id", id).single(),
    supabase.from("audio_metadata").select("*").eq("media_asset_id", id).maybeSingle(),
    supabase
      .from("media_links")
      .select("id, link_type, linked_entry_id, learning_entries(native_text, english_meaning)")
      .eq("media_asset_id", id)
      .eq("linked_entry_type", "learning_entry"),
  ]);

  if (!media) notFound();

  const whereUsed = links ?? [];

  return (
    <main>
      <h1>Edit Media: {media.title || media.filename}</h1>
      <p>
        Filename: {media.filename} ({media.mime_type}, {media.file_size} bytes)
      </p>

      <div>
        <h2>Where Used</h2>
        {whereUsed.length === 0 && <p>Not linked to any content yet.</p>}
        {whereUsed.length > 0 && (
          <ul>
            {whereUsed.map((link) => (
              <li key={link.id}>
                {link.link_type}:{" "}
                <Link href={`/admin/learning-entries/${link.linked_entry_id}`}>
                  {(link.learning_entries as unknown as { native_text: string } | null)
                    ?.native_text ?? link.linked_entry_id}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MediaDetailPanel
        media={media}
        audioMeta={audioMeta ?? null}
        hasActiveLinks={whereUsed.length > 0}
      />
      <p>
        <Link href="/admin/media">← Media Library</Link>
      </p>
    </main>
  );
}
