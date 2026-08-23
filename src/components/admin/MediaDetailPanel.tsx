"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AudioMeta = {
  speaker_name: string | null;
  speaker_code: string | null;
  region: string | null;
  consent_status: string | null;
  playback_permission: string;
  quality_rating: string | null;
} | null;

type MediaAsset = {
  id: string;
  filename: string;
  media_type: "audio" | "image" | "video";
  status: "draft" | "published" | "archived";
  title: string | null;
  description: string | null;
  alt_text: string | null;
  caption: string | null;
  credit: string | null;
};

export function MediaDetailPanel({
  media,
  audioMeta,
  hasActiveLinks,
}: {
  media: MediaAsset;
  audioMeta: AudioMeta;
  hasActiveLinks: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(media.title ?? "");
  const [description, setDescription] = useState(media.description ?? "");
  const [altText, setAltText] = useState(media.alt_text ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [credit, setCredit] = useState(media.credit ?? "");

  const [speakerName, setSpeakerName] = useState(audioMeta?.speaker_name ?? "");
  const [region, setRegion] = useState(audioMeta?.region ?? "");
  const [consentStatus, setConsentStatus] = useState(audioMeta?.consent_status ?? "");
  const [playbackPermission, setPlaybackPermission] = useState(
    audioMeta?.playback_permission ?? "public"
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveMetadata(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: title || null,
      description: description || null,
      alt_text: altText || null,
      caption: caption || null,
      credit: credit || null,
    };

    if (media.media_type === "audio") {
      body.audio = {
        speaker_name: speakerName || null,
        region: region || null,
        consent_status: consentStatus || null,
        playback_permission: playbackPermission,
      };
    }

    const res = await fetch(`/api/admin/media/${media.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Failed to save metadata.");
      return;
    }
    router.refresh();
  }

  async function setStatus(status: "published" | "archived" | "draft") {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/media/${media.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this media asset? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/media/${media.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Failed to delete media asset.");
      return;
    }
    router.push("/admin/media");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={saveMetadata}>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>
        {media.media_type === "image" && (
          <>
            <div>
              <label htmlFor="alt_text">Alt text</label>
              <input
                id="alt_text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="caption">Caption</label>
              <input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={saving}
              />
            </div>
          </>
        )}
        <div>
          <label htmlFor="credit">Credit</label>
          <input id="credit" value={credit} onChange={(e) => setCredit(e.target.value)} disabled={saving} />
        </div>

        {media.media_type === "audio" && (
          <fieldset>
            <legend>Audio metadata</legend>
            <div>
              <label htmlFor="speaker_name">Speaker name</label>
              <input
                id="speaker_name"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="region">Region / village</label>
              <input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="consent_status">Consent status</label>
              <select
                id="consent_status"
                value={consentStatus}
                onChange={(e) => setConsentStatus(e.target.value)}
                disabled={saving}
              >
                <option value="">Not set</option>
                <option value="obtained">Obtained</option>
                <option value="pending">Pending</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </div>
            <div>
              <label htmlFor="playback_permission">Playback permission</label>
              <select
                id="playback_permission"
                value={playbackPermission}
                onChange={(e) => setPlaybackPermission(e.target.value)}
                disabled={saving}
              >
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <p>
              Public playback requires consent obtained/not_applicable AND playback
              permission = public.
            </p>
          </fieldset>
        )}

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save metadata"}
        </button>
      </form>

      <div>
        <p>Current status: {media.status}</p>
        {media.status !== "published" && (
          <button onClick={() => setStatus("published")} disabled={saving}>
            Publish
          </button>
        )}
        {media.status === "published" && (
          <button onClick={() => setStatus("archived")} disabled={saving}>
            Archive
          </button>
        )}
        {media.status === "archived" && (
          <button onClick={() => setStatus("draft")} disabled={saving}>
            Restore to Draft
          </button>
        )}
        <p>
          Note: this status is independent of any linked learning entry. Publishing the
          entry does not publish this media, and publishing this media does not publish
          the entry.
        </p>
      </div>

      <div>
        <button onClick={handleDelete} disabled={saving || hasActiveLinks}>
          Delete
        </button>
        {hasActiveLinks && <p>Unlink or archive before deleting — this media is in use.</p>}
      </div>
    </div>
  );
}
