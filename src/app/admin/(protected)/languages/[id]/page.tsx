import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageForm } from "@/components/admin/LanguageForm";

export default async function EditLanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: language } = await supabase
    .from("languages")
    .select("*")
    .eq("id", id)
    .single();

  if (!language) notFound();

  // The Language Explorer's card art, so the picker opens already filled in
  // rather than looking as though nothing has been attached.
  const { data: cardArt } = await supabase
    .from("media_links")
    .select("id, media_asset_id")
    .eq("linked_entry_type", "language")
    .eq("linked_entry_id", id)
    .eq("link_type", "card_art")
    .maybeSingle();

  return (
    <main>
      <h1>Edit Language: {language.name}</h1>
      <LanguageForm
        language={language}
        cardArtAssetId={cardArt?.media_asset_id ?? null}
        cardArtLinkId={cardArt?.id ?? null}
      />
    </main>
  );
}
