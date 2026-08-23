"use client";

import { useState, useEffect } from "react";

function ratioToPadding(aspectRatio?: string): string | undefined {
  if (!aspectRatio) return undefined;
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) return undefined;
  return `${(h / w) * 100}%`;
}

/**
 * Renders a managed media slot.
 *
 * A slot with no approved asset yet must still hold its exact space: the
 * placeholder uses the same aspect ratio as the real image so the surrounding
 * layout never shifts or collapses when media is later attached in the Back
 * Office. It is a designed, quiet placeholder rather than a broken-image box.
 */
export function MediaSlotImage({
  slotId,
  altText,
  aspectRatio,
  label,
}: {
  slotId: string;
  altText?: string;
  aspectRatio?: string;
  /** Short human label for the empty state, e.g. "Warli illustration". */
  label?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      try {
        const params = new URLSearchParams({ slot_id: slotId });
        const res = await fetch(`/api/public/media-slot?${params.toString()}`);
        const body = await res.json().catch(() => ({ data: null }));
        if (!cancelled) setUrl(body.data?.url ?? null);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  const paddingBottom = ratioToPadding(aspectRatio);
  const frameStyle: React.CSSProperties = paddingBottom
    ? { position: "relative", width: "100%", paddingBottom }
    : { position: "relative", width: "100%", height: "100%" };

  const fillStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };

  if (url) {
    return (
      <div className="media-slot" style={frameStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={altText || ""}
          style={{ ...fillStyle, objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div className="media-slot" style={frameStyle}>
      <div
        className={`media-slot__empty${loading ? " is-loading" : ""}`}
        style={fillStyle}
        role="img"
        aria-label={
          loading ? "Loading image" : altText || label || "Image coming soon"
        }
      >
        {!loading && (
          <span className="media-slot__label">{label || altText}</span>
        )}
      </div>
    </div>
  );
}
