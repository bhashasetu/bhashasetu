import type { SupabaseClient } from "@supabase/supabase-js";
import { getSignedMediaUrl } from "@/lib/media/url-generator";
import type { ExplorerLanguage } from "@/lib/explorer/queries";

/**
 * The artwork on a language's card panel.
 *
 * WEB-04 draws a different Warli-style illustration for each language down the
 * left edge of every result. That is a per-language media asset, and
 * media_links already carries arbitrary owners — linked_entry_type is a free
 * column — so this needs no schema change: a row with
 * linked_entry_type 'language' and link_type 'card_art'.
 *
 * Nothing is invented. Until an editor attaches an image the map is empty and
 * the panel renders as a flat colour with the language name on it, which is
 * what the page does anyway when the image has not loaded.
 */
export const CARD_ART_LINK_TYPE = "card_art";

export async function languageCardArt(
  supabase: SupabaseClient,
  languages: ExplorerLanguage[]
): Promise<Map<string, string>> {
  const art = new Map<string, string>();
  if (languages.length === 0) return art;

  const { data: links } = await supabase
    .from("media_links")
    .select("linked_entry_id, media_asset_id")
    .eq("linked_entry_type", "language")
    .eq("link_type", CARD_ART_LINK_TYPE)
    .in(
      "linked_entry_id",
      languages.map((l) => l.id)
    );

  for (const link of (links ?? []) as {
    linked_entry_id: string;
    media_asset_id: string;
  }[]) {
    // Signed through the same route everything else uses, so an asset that is
    // still a draft simply does not resolve.
    const url = await getSignedMediaUrl(
      supabase,
      link.media_asset_id,
      "language",
      link.linked_entry_id
    );
    if (url) art.set(link.linked_entry_id, url);
  }

  return art;
}
