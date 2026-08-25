"use client";

import { useState } from "react";
import { SlotMedia } from "./SlotMedia";
import { parseVideoUrl } from "@/lib/media/video-embed";

/**
 * The poster-and-play-button control on a story card.
 *
 * The play circle used to be a decorative <span> over a still image, with no
 * handler on it — every interview on the page looked playable and none was.
 * This is the control that plays: pressing it replaces the still with the
 * actual media, in place, so the card keeps its size and the rail does not
 * reflow.
 *
 * A recording is either a file we host or a video on YouTube/Vimeo, and both
 * arrive here the same way. Nothing loads until the visitor presses play, so
 * a page of nine cards costs nine images rather than nine video streams — and
 * no third party hears from anyone who never pressed it.
 */
export function StoryPlayer({
  url,
  sourceUrl,
  posterUrl,
  title,
  aspectRatio = "16:9",
  label = "Interview",
  duration,
  frameClassName = "story-card__media",
}: {
  /** Signed URL for a file we host. */
  url: string | null;
  /** Address of a hosted video (YouTube/Vimeo). */
  sourceUrl: string | null;
  posterUrl: string | null;
  title: string;
  aspectRatio?: string;
  label?: string;
  duration?: string | null;
  /**
   * Class on the frame around the poster and player. The desktop story rail
   * and the mobile home row are different compositions with their own sizing,
   * but the play behaviour is identical, so they share this component and
   * differ only in what wraps it.
   */
  frameClassName?: string;
}) {
  const [playing, setPlaying] = useState(false);

  const embed = sourceUrl ? parseVideoUrl(sourceUrl) : null;
  const playable = Boolean(url || embed);

  if (playing && embed) {
    return (
      <div className={frameClassName}>
        <SlotMedia
          url={null}
          sourceUrl={sourceUrl}
          altText={title}
          aspectRatio={aspectRatio}
          label={label}
        />
      </div>
    );
  }

  if (playing && url) {
    return (
      <div className={frameClassName}>
        <div className="media-slot" style={frameStyle(aspectRatio)}>
          <video
            src={url}
            poster={posterUrl ?? undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <SlotMedia
        url={posterUrl}
        altText={title}
        aspectRatio={aspectRatio}
        label={label}
      />
      {playable ? (
        <button
          type="button"
          className="story-card__play story-card__play--button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title}`}
        >
          <span aria-hidden="true">▶</span>
        </button>
      ) : (
        // Honest rather than a button that would do nothing: the still is
        // published but its recording is not.
        <span className="story-card__play story-card__play--pending" title="Recording not available yet">
          <span aria-hidden="true">▶</span>
        </span>
      )}
      {duration && <span className="story-card__duration">{duration}</span>}
    </div>
  );
}

/**
 * The press-to-play control for an audio clip published as a hosted video.
 *
 * An <audio> element cannot play a YouTube URL, so those clips need the embed
 * — but dropping the iframe straight into the card would call YouTube for
 * every visitor on page load, including everyone who never plays it. The
 * uploaded clips beside it use preload="none" and fetch nothing until pressed;
 * this matches that.
 */
export function AudioClipPlayer({
  sourceUrl,
  title,
}: {
  sourceUrl: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <SlotMedia
        url={null}
        sourceUrl={sourceUrl}
        altText={title}
        aspectRatio="16:9"
        label="Recording"
        className="audio-card__embed"
      />
    );
  }

  return (
    <button
      type="button"
      className="audio-card__player audio-card__player--embed"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
    >
      <span aria-hidden="true">▶</span> Play recording
    </button>
  );
}

/** Same ratio box SlotMedia uses, so the player matches the poster it replaces. */
function frameStyle(aspectRatio: string): React.CSSProperties {
  const [w, h] = aspectRatio.split(":").map(Number);
  const paddingBottom = w && h ? `${(h / w) * 100}%` : undefined;
  return paddingBottom
    ? { position: "relative", width: "100%", paddingBottom }
    : { position: "relative", width: "100%", height: "100%" };
}
