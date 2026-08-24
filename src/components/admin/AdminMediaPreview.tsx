"use client";

import { useEffect, useState } from "react";

/**
 * Thumbnail preview for an attached media asset, used wherever the Back
 * Office needs to show what is actually in a slot rather than just its
 * filename. Works for draft assets too (unlike the public resolver), since
 * an editor previewing an upload or an unapproved AI variant needs to see it.
 */
export function AdminMediaPreview({
  assetId,
  mediaType,
  label,
}: {
  assetId: string;
  mediaType: string;
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Callers key this component by assetId (see usages), so a change in
    // assetId remounts it with fresh initial state rather than needing an
    // imperative reset here.
    let cancelled = false;

    fetch(`/api/admin/media/${assetId}/signed-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        if (!cancelled) setUrl(body.data?.url ?? null);
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

  if (!url) {
    return <div className="admin-preview admin-preview--loading" />;
  }

  if (mediaType === "video") {
    return (
      <div className="admin-preview">
        <video src={url} muted playsInline preload="metadata" />
      </div>
    );
  }

  if (mediaType === "audio") {
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
