"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The round speaker beside a word.
 *
 * The URL is signed on first press rather than up front, so a page of results
 * costs no audio requests until someone wants to hear one — and the signing
 * route checks the asset is published, linked to this entry and cleared for
 * public playback before it hands anything back.
 *
 * With no recording it renders a disabled control that says so, rather than
 * disappearing. A missing recording is a fact about the collection worth
 * showing: it is what a contributor could fix. What it never does is offer a
 * synthetic voice — Bulbul has no Warli or Katkari phonology and would
 * pronounce the word confidently wrong (CLAUDE.md section 25).
 */
export function WordAudioButton({
  assetId,
  entryId,
  label,
  tone = "navy",
}: {
  assetId: string | null;
  entryId: string;
  label: string;
  tone?: "navy" | "green";
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "failed">(
    "idle"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!assetId) {
    return (
      <span
        className={`ex-audio ex-audio--${tone} ex-audio--empty`}
        title="No recording yet"
        aria-label={`No recording yet for ${label}`}
        role="img"
      >
        <Speaker muted />
      </span>
    );
  }

  async function play() {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const params = new URLSearchParams({
        media_asset_id: assetId!,
        linked_entry_type: "learning_entry",
        linked_entry_id: entryId,
      });
      const res = await fetch(`/api/public/media?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      const url = body.data?.url;
      if (!url) {
        setState("failed");
        return;
      }
      const audio = new Audio(url);
      audio.addEventListener("ended", () => setState("idle"));
      audio.addEventListener("error", () => setState("failed"));
      audioRef.current = audio;
      await audio.play();
      setState("playing");
    } catch {
      setState("failed");
    }
  }

  if (state === "failed") {
    return (
      <span
        className={`ex-audio ex-audio--${tone} ex-audio--empty`}
        title="This recording could not be played"
        role="img"
        aria-label={`Recording unavailable for ${label}`}
      >
        <Speaker muted />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`ex-audio ex-audio--${tone}${state === "playing" ? " is-playing" : ""}`}
      onClick={() => void play()}
      aria-label={`Play the pronunciation of ${label}`}
    >
      <Speaker />
    </button>
  );
}

function Speaker({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M4 9h3.5L12 5v14L7.5 15H4a1 1 0 01-1-1v-4a1 1 0 011-1z" />
      {muted ? (
        <path d="M15.5 9.5l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.5 8.5a4.5 4.5 0 010 7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M18 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
