"use client";

import { useState } from "react";

export function AudioPlayer({
  mediaAssetId,
  linkedEntryId,
}: {
  mediaAssetId: string;
  linkedEntryId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function loadAndPlay() {
    setLoading(true);
    setUnavailable(false);
    const params = new URLSearchParams({
      media_asset_id: mediaAssetId,
      linked_entry_type: "learning_entry",
      linked_entry_id: linkedEntryId,
    });
    const res = await fetch(`/api/public/media?${params.toString()}`);
    const body = await res.json().catch(() => ({ data: null }));
    setLoading(false);

    if (!body.data?.url) {
      setUnavailable(true);
      return;
    }
    setUrl(body.data.url);
  }

  if (unavailable) {
    return <p>Audio is not currently available for this entry.</p>;
  }

  if (url) {
    // Signed URL expires in 60 minutes; reloading the page or navigating
    // back to this entry re-triggers loadAndPlay for a fresh URL.
    return <audio controls autoPlay src={url} />;
  }

  return (
    <button onClick={loadAndPlay} disabled={loading}>
      {loading ? "Loading audio…" : "Play pronunciation"}
    </button>
  );
}
