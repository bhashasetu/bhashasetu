"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { AdminMediaPreview } from "./AdminMediaPreview";
import type { MediaSlot } from "./HomepageContentEditor";

/**
 * One media slot row inside Homepage Content: a live preview of whatever is
 * currently attached, and an inline uploader that stages a file until the
 * editor explicitly clicks Save — the same edit-then-save pattern the text
 * fields above it use, rather than uploading the instant a file is chosen.
 */
export function HomepageMediaRow({
  pageId,
  slot,
  label,
}: {
  pageId: string;
  slot: MediaSlot;
  label: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mirror the public resolver: only a 'published' assignment counts as
  // attached, so this matches what a visitor actually sees.
  const assignment =
    slot.slot_media_assignments?.find((a) => a.status === "published") ?? null;
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

    const formData = new FormData();
    formData.append("file", file);
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
      window.dispatchEvent(new CustomEvent("homepage-media-saved"));
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
              href={`/admin/pages/${pageId}/slots/${slot.id}`}
              className="admin-btn admin-btn--ghost"
            >
              {prompt.provider === "manual" ? "Advanced" : "Generate with AI"}
            </Link>
          )}
        </div>

        {slot.aspect_ratio && (
          <p className="hp-media__hint">
            Any size is fine — it&apos;s centre-cropped to {slot.aspect_ratio}{" "}
            automatically.
          </p>
        )}
        {notice && <p className="hp-media__status hp-media__status--ok">{notice}</p>}
        {error && <p className="hp-media__status hp-media__status--error">{error}</p>}
      </div>
    </div>
  );
}
