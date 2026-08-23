"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function MediaSlotImage({
  slotId,
  altText,
  aspectRatio,
}: {
  slotId: string;
  altText?: string;
  aspectRatio?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    async function fetchUrl() {
      try {
        const params = new URLSearchParams({ slot_id: slotId });
        const res = await fetch(`/api/public/media-slot?${params.toString()}`);
        const body = await res.json().catch(() => ({ data: null }));

        if (!body.data?.url) {
          setUnavailable(true);
        } else {
          setUrl(body.data.url);
        }
      } catch {
        setUnavailable(true);
      } finally {
        setLoading(false);
      }
    }

    fetchUrl();
  }, [slotId]);

  if (unavailable || (!url && !loading)) {
    return <div className="media-placeholder">Image not available</div>;
  }

  if (loading) {
    return <div className="media-loading">Loading image...</div>;
  }

  const containerStyle: React.CSSProperties = aspectRatio
    ? {
        position: "relative",
        width: "100%",
        paddingBottom: calculatePaddingBottom(aspectRatio),
      }
    : { width: "100%" };

  const imageStyle: React.CSSProperties = aspectRatio
    ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }
    : { width: "100%", height: "auto" };

  return (
    <div style={containerStyle}>
      {url && (
        <img
          src={url}
          alt={altText || "Content image"}
          style={imageStyle}
        />
      )}
    </div>
  );
}

function calculatePaddingBottom(aspectRatio: string): string {
  const [w, h] = aspectRatio.split(":").map(Number);
  const percentage = (h / w) * 100;
  return `${percentage}%`;
}
