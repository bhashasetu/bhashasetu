import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AudioPlayer } from "@/components/public/AudioPlayer";

export default async function LanguageLearnPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: language } = await supabase
    .from("languages")
    .select("id, code, name, description")
    .eq("code", code)
    .eq("status", "published")
    .single();

  if (!language) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, description")
    .eq("language_id", language.id)
    .eq("status", "published")
    .order("display_order");

  const { data: entries } = await supabase
    .from("learning_entries")
    .select("id, category_id, native_text, transliteration, english_meaning, hindi_meaning")
    .eq("language_id", language.id)
    .eq("status", "published")
    .order("display_order");

  const { data: links } = entries && entries.length > 0
    ? await supabase
        .from("media_links")
        .select("linked_entry_id, media_asset_id")
        .eq("linked_entry_type", "learning_entry")
        .eq("link_type", "pronunciation_audio")
        .in("linked_entry_id", entries.map((e) => e.id))
    : { data: [] as { linked_entry_id: string; media_asset_id: string }[] };

  const audioByEntryId: Record<string, string> = {};
  for (const link of links ?? []) {
    audioByEntryId[link.linked_entry_id] = link.media_asset_id;
  }

  return (
    <main>
      <h1>{language.name}</h1>
      {language.description && <p>{language.description}</p>}

      {(!categories || categories.length === 0) && <p>No published categories yet.</p>}

      {categories?.map((category) => {
        const categoryEntries = (entries ?? []).filter((e) => e.category_id === category.id);
        return (
          <section key={category.id}>
            <h2>{category.name}</h2>
            {categoryEntries.length === 0 && <p>No published entries in this category yet.</p>}
            {categoryEntries.length > 0 && (
              <ul>
                {categoryEntries.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.native_text}</strong>
                    {entry.transliteration && <span> ({entry.transliteration})</span>} —{" "}
                    {entry.english_meaning}
                    {entry.hindi_meaning && <span> / {entry.hindi_meaning}</span>}
                    {audioByEntryId[entry.id] && (
                      <AudioPlayer
                        mediaAssetId={audioByEntryId[entry.id]}
                        linkedEntryId={entry.id}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p>
        <Link href="/learn">← All languages</Link>
      </p>
    </main>
  );
}
