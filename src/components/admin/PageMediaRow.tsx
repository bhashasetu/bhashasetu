"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { uploadMediaDirect, shouldUploadDirect } from "@/lib/media/direct-upload";
import { downscaleImage } from "@/lib/media/downscale-image";
import type { MediaSlot } from "./PageContentEditor";

/**
 * One media slot row inside a page editor: a live preview of whatever is
 * currently attached, and an inline uploader that stages a file until the
 * editor explicitly clicks Save — the same edit-then-save pattern the text
 * fields above it use, rather than uploading the instant a file is chosen.
 */
export function PageMediaRow({
  pageId,
  slot,
  label,
  backHref,
}: {
  pageId: string;
  slot: MediaSlot;
  label: string;
  /** Where the slot detail screen should return to. */
  backHref: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mirror the public resolver exactly: it takes the NEWEST published
  // assignment. Taking the first match instead let this panel show a
  // different image than the live page when a slot had more than one.
  const assignment =
    [...(slot.slot_media_assignments ?? [])]
      .filter((a) => a.status === "published")
      .sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
      )[0] ?? null;
  const asset = assignment?.media_asset;
  const prompt = slot.generation_prompts?.[0];

  function handleChoose(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setNotice(null);
    setError(null);
  }

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    // A recording skips the server route entirely: a Vercel serverless
    // function rejects request bodies over 4.5 MB before the handler runs,
    // which is why the WRO video slot could never be filled.
    if (shouldUploadDirect(file)) {
      const result = await uploadMediaDirect(file, { slotId: slot.id });
      if (!result.ok) {
        setError(result.error);
      } else {
        setNotice("Saved.");
        setFile(null);
        window.dispatchEvent(new CustomEvent("page-media-saved"));
      }
      setSaving(false);
      return;
    }

    // This row posts the file as-is, with no crop step, so a large photo
    // would otherwise hit Vercel's 4.5 MB body limit and fail with a bare
    // 413. Anything already small enough passes through untouched.
    const toSend = await downscaleImage(file);

    const formData = new FormData();
    formData.append("file", toSend);
    formData.append("media_type", slot.media_type);
    formData.append("slot_id", slot.id);

    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? `Upload failed (${res.status})`);
        return;
      }

      setNotice("Saved.");
      setFile(null);
      // The slot list lives in the parent server component's props; refresh
      // it so the new preview and Attached status appear without a reload.
      window.dispatchEvent(new CustomEvent("page-media-saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hp-media">
      <div className="hp-media__preview">
        {asset ? (
          <AdminMediaPreview
            key={asset.id}
            assetId={asset.id}
            mediaType={slot.media_type}
            label={asset.title || asset.filename}
          />
        ) : (
          <div className="admin-preview admin-preview--empty">
            <span>{label}</span>
          </div>
        )}
      </div>

      <div className="hp-media__body">
        <div className="hp-media__head">
          <span className="hp-media__label">{label}</span>
          <span
            className={
              asset
                ? "admin-pill admin-pill--published"
                : "admin-pill admin-pill--draft"
            }
          >
            {asset ? "Attached" : "Empty"}
          </span>
          <span className="hp-media__spec">
            {slot.media_type}
            {slot.aspect_ratio ? ` · ${slot.aspect_ratio}` : ""}
          </span>
        </div>

        <div className="hp-media__upload">
          <input
            type="file"
            aria-label={`Choose file for ${label}`}
            accept={
              slot.media_type === "image"
                ? "image/*"
                : slot.media_type === "video"
                  ? "video/*"
                  : slot.media_type === "audio"
                    ? "audio/*"
                    : undefined
            }
            onChange={handleChoose}
            disabled={saving}
          />
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={!file || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {prompt && (
            <Link
              href={`/admin/pages/${pageId}/slots/${slot.id}?back=${encodeURIComponent(
                backHref
              )}`}
              className="admin-btn admin-btn--ghost"
            >
              {prompt.provider === "manual" ? "Advanced" : "Generate with AI"}
            </Link>
          )}
        </div>

        {slot.aspect_ratio && slot.media_type !== "video" && (
          <p className="hp-media__hint">
            Any size is fine — it&apos;s centre-cropped to {slot.aspect_ratio}{" "}
            automatically.
          </p>
        )}
        {slot.media_type === "video" && (
          <p className="hp-media__hint">
            Files up to 50 MB upload here. For a longer video, open Advanced
            and paste a YouTube or Vimeo link instead.
          </p>
        )}
        {notice && <p className="hp-media__status hp-media__status--ok">{notice}</p>}
        {error && <p className="hp-media__status hp-media__status--error">{error}</p>}
      </div>
    </div>
  );
}
