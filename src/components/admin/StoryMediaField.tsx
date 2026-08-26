"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { ImageCropper } from "./ImageCropper";
import { uploadMediaDirect, attachVideoLink } from "@/lib/media/direct-upload";
import { MEDIA_UPLOAD_LIMITS } from "@/lib/media/validate-upload";
import { downscaleImage } from "@/lib/media/downscale-image";

const MAX_UPLOAD_MB = Math.round(
  MEDIA_UPLOAD_LIMITS.video.maxFileSizeBytes / (1024 * 1024)
);

/**
 * Attaches one media asset to a story.
 *
 * Images go through the shared server route, so they get the same sharp
 * fit-to-ratio treatment as page slots, with the existing ImageCropper in
 * front. Recordings go straight from the browser to Supabase Storage — a
 * serverless request body cannot carry a video — or, for anything longer than
 * the storage plan allows, are attached as a YouTube or Vimeo link instead.
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
  /** "image" routes through the cropper; "recording" is audio or video. */
  kind: "image" | "recording";
  /** Target ratio for images; ignored for recordings. */
  aspectRatio?: string;
  assetId: string | null;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    setError(null);
    setNotice(null);
  }

  async function uploadImage(file: File) {
    setBusy(true);
    reset();

    // Without a target ratio there is no crop step, so the file arrives at
    // full size and would hit Vercel's 4.5 MB request-body limit.
    const toSend = await downscaleImage(file);

    const form = new FormData();
    form.append("file", toSend);
    if (aspectRatio) form.append("aspect_ratio", aspectRatio);
    // No slot to attach to, so the asset has to be published explicitly or
    // the public page cannot read it.
    form.append("publish", "1");

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

  async function uploadRecording(file: File) {
    setBusy(true);
    reset();
    setNotice("Uploading… large recordings can take a while.");

    const result = await uploadMediaDirect(file, {
      publish: true,
      // A story is only publishable once consent is recorded, and the same
      // consent covers the recording itself.
      consentStatus: "obtained",
    });

    if (!result.ok) {
      setError(result.error);
      setNotice(null);
    } else {
      onChange(result.asset.id);
      setNotice("Uploaded.");
    }
    setBusy(false);
  }

  async function saveLink() {
    if (!link.trim()) return;
    setBusy(true);
    reset();

    const result = await attachVideoLink(link.trim());
    if (!result.ok) {
      setError(result.error);
    } else {
      onChange(result.asset.id);
      setNotice("Video link attached.");
      setLink("");
      setLinkOpen(false);
    }
    setBusy(false);
  }

  function handleChoose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    reset();

    if (kind === "image") {
      if (aspectRatio) {
        setPending(file);
        return;
      }
      void uploadImage(file);
      return;
    }
    void uploadRecording(file);
  }

  return (
    <div className="story-media">
      <div className="story-media__preview">
        {assetId ? (
          <AdminMediaPreview key={assetId} assetId={assetId} label={label} />
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
          {kind === "recording" && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setLinkOpen((o) => !o);
                reset();
              }}
              aria-expanded={linkOpen}
              disabled={disabled || busy}
            >
              {linkOpen ? "Cancel link" : "Use a video link"}
            </button>
          )}
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

        {linkOpen && (
          <div className="story-media__link">
            <label htmlFor={`link-${label}`} className="visually-hidden">
              YouTube or Vimeo address
            </label>
            <input
              id={`link-${label}`}
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={saveLink}
              disabled={busy || !link.trim()}
            >
              Attach
            </button>
          </div>
        )}

        {hint && <p className="story-media__hint">{hint}</p>}
        {kind === "recording" && (
          <p className="story-media__hint">
            Files up to {MAX_UPLOAD_MB} MB upload directly. For a full-length
            interview, put it on YouTube or Vimeo and paste the link — it plays
            the same way and costs the project nothing to serve.
          </p>
        )}
        {busy && <p className="story-media__status">Working…</p>}
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
          onConfirm={(cropped) => void uploadImage(cropped)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
