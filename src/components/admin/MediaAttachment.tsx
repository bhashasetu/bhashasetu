"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LinkedMedia = {
  linkId: string;
  linkType: string;
  mediaAssetId: string;
  filename: string;
  status: string;
};

type AvailableMedia = {
  id: string;
  filename: string;
  title: string | null;
  status: string;
};

export function MediaAttachment({
  entryId,
  linkedMedia,
  availableAudio,
}: {
  entryId: string;
  linkedMedia: LinkedMedia[];
  availableAudio: AvailableMedia[];
}) {
  const router = useRouter();
  const [mediaAssetId, setMediaAssetId] = useState(availableAudio[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function attach(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaAssetId) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/media-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_asset_id: mediaAssetId,
        linked_entry_type: "learning_entry",
        linked_entry_id: entryId,
        link_type: "pronunciation_audio",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to attach media.");
      return;
    }
    router.refresh();
  }

  async function unlink(linkId: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/media-links?id=${linkId}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to unlink media.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h2>Linked Audio</h2>
      {linkedMedia.length === 0 && <p>No audio attached yet.</p>}
      {linkedMedia.length > 0 && (
        <ul>
          {linkedMedia.map((link) => (
            <li key={link.linkId}>
              {link.filename} ({link.status}) — {link.linkType}{" "}
              <button onClick={() => unlink(link.linkId)} disabled={saving}>
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableAudio.length > 0 && (
        <form onSubmit={attach}>
          <label htmlFor="media_asset_id">Attach audio</label>
          <select
            id="media_asset_id"
            value={mediaAssetId}
            onChange={(e) => setMediaAssetId(e.target.value)}
            disabled={saving}
          >
            {availableAudio.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title || m.filename} ({m.status})
              </option>
            ))}
          </select>
          <button type="submit" disabled={saving}>
            Attach
          </button>
        </form>
      )}
      {availableAudio.length === 0 && (
        <p>Upload audio in the Media Library first, then attach it here.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
