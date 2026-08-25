"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays an entry's pronunciation recording from the list.
 *
 * The Audio column used to be a green <span> shaped like a play button with
 * no handler on it — it reported that a recording existed and did nothing
 * when clicked. This is the control that actually plays.
 *
 * The URL is fetched on first press rather than up front: a page of entries
 * would otherwise mint a signed URL per row for recordings nobody plays.
 */

/**
 * One shared element for the whole table, so starting a second recording
 * stops the first instead of layering them.
 */
let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

export function EntryAudioButton({
  assetId,
  label,
}: {
  assetId: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Stop and detach if the row unmounts mid-play (pagination, filtering).
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (current?.audio === audio) current = null;
      }
    };
  }, []);

  async function play() {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }

    setMessage(null);
    setState("loading");

    try {
      let url = urlRef.current;

      if (!url) {
        const res = await fetch(`/api/admin/media/${assetId}/signed-url`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("error");
          setMessage(body.error ?? `Could not load the recording (${res.status})`);
          return;
        }
        if (!body.data?.url) {
          setState("error");
          setMessage("This recording has no playable file.");
          return;
        }
        url = body.data.url as string;
        urlRef.current = url;
      }

      current?.stop();

      // A fresh element per press: the previous one is finished with, and
      // building it fully before it is stored keeps it from being mutated
      // afterwards.
      const audio = new Audio(url);

      audio.addEventListener("ended", () => setState("idle"), { once: true });
      audio.addEventListener(
        "error",
        () => {
          setState("error");
          // A signed URL that resolves but will not decode usually means the
          // stored object is not the audio it claims to be.
          setMessage("The file could not be played. It may not be valid audio.");
        },
        { once: true }
      );

      current = {
        audio,
        stop: () => {
          audio.pause();
          audio.currentTime = 0;
        },
      };
      audioRef.current = audio;

      await audio.play();
      setState("playing");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error ? err.message : "Could not play the recording."
      );
    }
  }

  return (
    <span className="wp-play-wrap">
      <button
        type="button"
        className={`wp-audio-dot wp-audio-dot--button${
          state === "playing" ? " is-playing" : ""
        }${state === "error" ? " is-error" : ""}`}
        onClick={play}
        disabled={state === "loading"}
        title={
          state === "playing" ? `Stop ${label}` : `Play ${label}`
        }
        aria-label={state === "playing" ? `Stop ${label}` : `Play ${label}`}
      >
        <span aria-hidden="true">
          {state === "loading" ? "…" : state === "playing" ? "■" : "▶"}
        </span>
      </button>
      {message && <span className="wp-play-error">{message}</span>}
    </span>
  );
}
