"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/admin/MediaPicker";

type Language = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  featured: boolean;
  status: "draft" | "published" | "archived";
};

/** The artwork on this language's panel in the Language Explorer. */
const CARD_ART_LINK_TYPE = "card_art";

export function LanguageForm({
  language,
  cardArtAssetId = null,
  cardArtLinkId = null,
}: {
  language?: Language;
  cardArtAssetId?: string | null;
  cardArtLinkId?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(language?.code ?? "");
  const [name, setName] = useState(language?.name ?? "");
  const [description, setDescription] = useState(language?.description ?? "");
  const [featured, setFeatured] = useState(language?.featured ?? false);
  const [cardArt, setCardArt] = useState<string | null>(cardArtAssetId);
  const [artError, setArtError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(language);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const url = isEdit ? `/api/admin/languages/${language!.id}` : "/api/admin/languages";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, description: description || null, featured }),
    });

    if (!res.ok) {
      setSaving(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save language.");
      return;
    }

    const saved = await res.json().catch(() => ({}));
    const languageId = language?.id ?? saved.data?.id;
    if (languageId) await saveCardArt(languageId);
    setSaving(false);

    router.push("/admin/languages");
    router.refresh();
  }

  /**
   * Attach or detach the card art.
   *
   * The same shape the entry form uses for a recording: only the relationship
   * is written, so the image stays in the Media Library and can be used
   * elsewhere without a second copy (brief section 8). A failure here is
   * reported without failing the save — the language itself is already stored.
   */
  async function saveCardArt(languageId: string) {
    if (cardArt === cardArtAssetId) return;

    if (cardArtLinkId && cardArt !== cardArtAssetId) {
      await fetch(`/api/admin/media-links?id=${cardArtLinkId}`, {
        method: "DELETE",
      }).catch(() => null);
    }

    if (!cardArt) return;

    const res = await fetch("/api/admin/media-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_asset_id: cardArt,
        linked_entry_type: "language",
        linked_entry_id: languageId,
        link_type: CARD_ART_LINK_TYPE,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setArtError(body.error ?? "The language saved, but the artwork could not be linked.");
    }
  }

  async function handleStatusChange(status: "draft" | "published" | "archived") {
    if (!isEdit) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/languages/${language!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="code">Code</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={10}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="featured">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              disabled={saving}
            />{" "}
            Featured
          </label>
        </div>
        <MediaPicker
          label="Card artwork"
          kind="image"
          aspectRatio="3:4"
          assetId={cardArt}
          onChange={setCardArt}
          disabled={saving}
          hint="Shown on this language's panel in the Language Explorer. White line art on a plain background reads best against the panel colour."
        />
        {artError && <p role="alert">{artError}</p>}

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create language"}
        </button>
      </form>

      {isEdit && (
        <div>
          <p>Current status: {language!.status}</p>
          {language!.status === "draft" && (
            <button onClick={() => handleStatusChange("published")} disabled={saving}>
              Publish
            </button>
          )}
          {language!.status === "published" && (
            <button onClick={() => handleStatusChange("archived")} disabled={saving}>
              Archive
            </button>
          )}
          {language!.status === "archived" && (
            <button onClick={() => handleStatusChange("draft")} disabled={saving}>
              Restore to Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
