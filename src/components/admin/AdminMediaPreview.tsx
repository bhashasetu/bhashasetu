"use client";

import { useEffect, useState } from "react";

/**
 * Thumbnail preview for an attached media asset, used wherever the Back
 * Office needs to show what is actually in a slot rather than just its
 * filename. Works for draft assets too (unlike the public resolver), since
 * an editor previewing an upload or an unapproved AI variant needs to see it.
 *
 * mediaType is optional: the signed-url endpoint already reports the asset's
 * real kind, so a caller that cannot know it in advance — a story recording
 * that might be audio, video or a hosted link — should leave it out rather
 * than guess. Guessing "audio" is what made an attached mp4 render as an
 * audio player.
 */
export function AdminMediaPreview({
  assetId,
  mediaType,
  label,
}: {
  assetId: string;
  /** Omit to use whatever the asset actually is. */
  mediaType?: string;
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [resolvedType, setResolvedType] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Callers key this component by assetId (see usages), so a change in
    // assetId remounts it with fresh initial state rather than needing an
    // imperative reset here.
    let cancelled = false;

    fetch(`/api/admin/media/${assetId}/signed-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        if (cancelled) return;
        setUrl(body.data?.url ?? null);
        setResolvedType(body.data?.mediaType ?? null);
        setSourceUrl(body.data?.sourceUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (failed) {
    return (
      <div className="admin-preview admin-preview--empty">
        <span>Preview unavailable</span>
      </div>
    );
  }

  // A hosted video has no stored object to sign; show that it is a link.
  if (sourceUrl) {
    return (
      <div className="admin-preview admin-preview--link">
        <span aria-hidden="true">▶</span>
        <span className="admin-preview__linktext">Video link</span>
      </div>
    );
  }

  if (!url) {
    return <div className="admin-preview admin-preview--loading" />;
  }

  const kind = mediaType ?? resolvedType ?? "image";

  if (kind === "video") {
    return (
      <div className="admin-preview">
        <video src={url} muted playsInline preload="metadata" />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="admin-preview admin-preview--audio">
        <audio src={url} controls />
      </div>
    );
  }

  return (
    <div className="admin-preview">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label ?? ""} />
    </div>
  );
}
