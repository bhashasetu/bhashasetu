"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { ImageCropper } from "./ImageCropper";
import { uploadMediaDirect } from "@/lib/media/direct-upload";
import { downscaleImage } from "@/lib/media/downscale-image";
import { MEDIA_UPLOAD_LIMITS } from "@/lib/media/validate-upload";

const MAX_MB = Math.round(
  MEDIA_UPLOAD_LIMITS.audio.maxFileSizeBytes / (1024 * 1024)
);

type LibraryItem = {
  id: string;
  filename: string;
  title: string | null;
  status: string;
};

/**
 * Choose a media asset: from the library, or by uploading a new one.
 *
 * Both the story recording field and the Words & Phrases pronunciation field
 * need the same three things — see what is attached, pick something that
 * already exists, or upload. They differ only in what they do with the
 * resulting asset, so this reports an id through onChange and leaves
 * attachment to the caller: a story writes a foreign key, an entry writes a
 * media_links row.
 *
 * Uploads go through the canonical pipeline either way, so a file lands in
 * media_assets exactly once and stays reusable elsewhere without being copied
 * (brief section 5).
 */
export function MediaPicker({
  label,
  kind,
  aspectRatio,
  assetId,
  onChange,
  hint,
  disabled,
  allowExisting = true,
  consentStatus,
}: {
  label: string;
  /** "image" routes through the cropper; "audio" and "video" upload direct. */
  kind: "image" | "audio" | "video";
  /** Target ratio for images; ignored otherwise. */
  aspectRatio?: string;
  assetId: string | null;
  onChange: (assetId: string | null) => void;
  hint?: string;
  disabled?: boolean;
  /** Offer the Media Library as a source. */
  allowExisting?: boolean;
  /** Consent to record against an uploaded audio file. */
  consentStatus?: string;
}) {
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [term, setTerm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the library the first time the picker is opened, and whenever the
  // search term settles, so a long list stays navigable.
  useEffect(() => {
    if (!browsing) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ media_type: kind });
      if (term.trim()) params.set("q", term.trim());
      fetch(`/api/admin/media?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((body) => {
          if (!cancelled) setLibrary(body.data ?? []);
        })
        .catch(() => {
          if (!cancelled) setLibrary([]);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [browsing, term, kind]);

  function reset() {
    setNotice(null);
    setError(null);
  }

  async function uploadImage(file: File) {
    setBusy(true);
    reset();
    const form = new FormData();
    form.append("file", await downscaleImage(file));
    if (aspectRatio) form.append("aspect_ratio", aspectRatio);
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
      setNotice(body.adjusted ? "Uploaded and fitted to shape." : "Uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setPendingCrop(null);
    }
  }

  async function uploadRecording(file: File) {
    setBusy(true);
    reset();
    setNotice("Uploading…");

    const result = await uploadMediaDirect(file, {
      publish: true,
      consentStatus,
    });

    if (!result.ok) {
      setError(result.error);
      setNotice(null);
    } else {
      onChange(result.asset.id);
      setNotice("Uploaded and added to the Media Library.");
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
        setPendingCrop(file);
        return;
      }
      void uploadImage(file);
      return;
    }
    void uploadRecording(file);
  }

  const accept =
    kind === "image" ? "image/*" : kind === "audio" ? "audio/*" : "video/*";

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
              assetId
                ? "admin-pill admin-pill--published"
                : "admin-pill admin-pill--draft"
            }
          >
            {assetId ? "Attached" : "Empty"}
          </span>
        </div>

        <div className="story-media__actions">
          <input
            type="file"
            aria-label={`Upload a file for ${label}`}
            accept={accept}
            onChange={handleChoose}
            disabled={disabled || busy}
          />
          {allowExisting && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setBrowsing((b) => !b);
                reset();
              }}
              aria-expanded={browsing}
              disabled={disabled || busy}
            >
              {browsing ? "Cancel" : "Select existing"}
            </button>
          )}
          {assetId && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                onChange(null);
                setNotice("Detached. Save to keep this change.");
              }}
              disabled={disabled || busy}
            >
              Remove
            </button>
          )}
        </div>

        {browsing && (
          <div className="wp-library">
            <label htmlFor={`lib-${label}`} className="visually-hidden">
              Search the Media Library
            </label>
            <input
              id={`lib-${label}`}
              type="search"
              placeholder="Search the Media Library…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {library === null ? (
              <p className="story-media__status">Loading…</p>
            ) : library.length === 0 ? (
              <p className="story-media__status">
                Nothing in the library yet. Upload a recording above and it
                becomes available to every other entry too.
              </p>
            ) : (
              <ul className="wp-library__list">
                {library.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(item.id);
                        setBrowsing(false);
                        setNotice("Selected from the Media Library.");
                      }}
                    >
                      <span className="wp-library__name">
                        {item.title || item.filename}
                      </span>
                      <span
                        className={`admin-pill admin-pill--${item.status}`}
                      >
                        {item.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hint && <p className="story-media__hint">{hint}</p>}
        {kind !== "image" && (
          <p className="story-media__hint">
            Up to {MAX_MB} MB. The file is added to the Media Library once and
            can be reused by other entries without uploading it again.
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

      {pendingCrop && aspectRatio && (
        <ImageCropper
          file={pendingCrop}
          aspectRatio={aspectRatio}
          onConfirm={(cropped) => void uploadImage(cropped)}
          onCancel={() => setPendingCrop(null)}
        />
      )}
    </div>
  );
}
