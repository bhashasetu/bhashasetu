"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { ImageCropper } from "./ImageCropper";

/**
 * Attaches one media asset to a story.
 *
 * This is the same pipeline the page media slots use — the shared upload
 * route, so the same validation, the same sharp conform-to-ratio, the same
 * metadata columns — with the crop step routed through the existing
 * ImageCropper. The only difference is that there is no slot to assign to,
 * so the route is asked to publish the asset and hands back its id for the
 * story row to hold.
 */
export function StoryMediaField({
  label,
  hint,
  kind,
  aspectRatio,
  assetId,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  /** "image" routes through the cropper; "recording" uploads as-is. */
  kind: "image" | "recording";
  /** Target ratio for images; ignored for recordings. */
  aspectRatio?: string;
  assetId: string | null;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const form = new FormData();
    form.append("file", file);
    if (kind === "image" && aspectRatio) form.append("aspect_ratio", aspectRatio);
    // No slot to attach to, so the asset has to be published explicitly or
    // the public page cannot read it.
    form.append("publish", "1");
    if (kind === "recording") {
      // A story is only publishable once consent is recorded, and the same
      // consent covers the recording itself.
      form.append("consent_status", "obtained");
    }

    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? `Upload failed (${res.status})`);
        return;
      }

      onChange(body.data.id);
      setNotice(body.adjusted ? "Uploaded and fitted to the card shape." : "Uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function handleChoose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);

    if (kind === "image" && aspectRatio) {
      setPending(file);
      return;
    }
    void upload(file);
  }

  return (
    <div className="story-media">
      <div className="story-media__preview">
        {assetId ? (
          <AdminMediaPreview
            key={assetId}
            assetId={assetId}
            mediaType={kind === "image" ? "image" : "audio"}
            label={label}
          />
        ) : (
          <div className="admin-preview admin-preview--empty">
            <span>{label}</span>
          </div>
        )}
      </div>

      <div className="story-media__body">
        <div className="story-media__head">
          <span className="story-media__label">{label}</span>
          <span
            className={
              assetId ? "admin-pill admin-pill--published" : "admin-pill admin-pill--draft"
            }
          >
            {assetId ? "Attached" : "Empty"}
          </span>
        </div>

        <div className="story-media__actions">
          <input
            type="file"
            aria-label={`Choose a file for ${label}`}
            accept={kind === "image" ? "image/*" : "audio/*,video/*"}
            onChange={handleChoose}
            disabled={disabled || busy}
          />
          {assetId && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                onChange(null);
                setNotice("Detached. Save the story to keep this change.");
              }}
              disabled={disabled || busy}
            >
              Remove
            </button>
          )}
        </div>

        {hint && <p className="story-media__hint">{hint}</p>}
        {busy && <p className="story-media__status">Uploading…</p>}
        {notice && (
          <p className="story-media__status story-media__status--ok">{notice}</p>
        )}
        {error && (
          <p className="story-media__status story-media__status--error">{error}</p>
        )}
      </div>

      {pending && aspectRatio && (
        <ImageCropper
          file={pending}
          aspectRatio={aspectRatio}
          onConfirm={(cropped) => void upload(cropped)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
