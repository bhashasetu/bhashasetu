"use client";

import { useState } from "react";
import { SlotMedia } from "./SlotMedia";
import { parseVideoUrl } from "@/lib/media/video-embed";

/**
 * The Featured Story panel.
 *
 * "Watch Full Story" pointed at /stories?story=<slug>, a parameter nothing
 * reads — so it reloaded the same page and played nothing. It now plays the
 * recording in place, the same way the interview cards do.
 */
export function FeaturedStoryPanel({
  title,
  summary,
  badge,
  ctaText,
  posterUrl,
  posterFit,
  posterPosition,
  mediaUrl,
  mediaSourceUrl,
  duration,
}: {
  title: string;
  summary: string | null;
  badge: string | undefined;
  ctaText: string | undefined;
  posterUrl: string | null;
  posterFit?: "cover" | "contain";
  posterPosition?: string;
  mediaUrl: string | null;
  mediaSourceUrl: string | null;
  duration: string | null;
}) {
  const [playing, setPlaying] = useState(false);

  const embed = mediaSourceUrl ? parseVideoUrl(mediaSourceUrl) : null;
  const playable = Boolean(mediaUrl || embed);

  if (playing) {
    return (
      <aside className="sv-featured sv-featured--playing">
        {embed ? (
          <SlotMedia
            url={null}
            sourceUrl={mediaSourceUrl}
            altText={title}
            aspectRatio="16:9"
            label="Featured story"
          />
        ) : (
          <video
            src={mediaUrl ?? undefined}
            poster={posterUrl ?? undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={title}
            className="sv-featured__video"
          />
        )}
      </aside>
    );
  }

  return (
    <aside className="sv-featured">
      <SlotMedia
        url={posterUrl}
        altText={title}
        aspectRatio="3:4"
        label="Featured story"
        className="sv-featured__image"
        fit={posterFit}
        objectPosition={posterPosition}
      />
      <div className="sv-featured__content">
        <span className="sv-featured__badge">
          <span aria-hidden="true">★</span> {badge}
        </span>
        <h2 className="sv-featured__title">{title}</h2>
        {summary && <p className="sv-featured__text">{summary}</p>}
        {playable ? (
          <button
            type="button"
            className="sv-featured__cta"
            onClick={() => setPlaying(true)}
          >
            {ctaText} <span aria-hidden="true">›</span>
          </button>
        ) : (
          <p className="sv-featured__text">
            This story&apos;s recording is not available yet.
          </p>
        )}
      </div>
      {duration && <span className="sv-featured__duration">{duration}</span>}
    </aside>
  );
}
