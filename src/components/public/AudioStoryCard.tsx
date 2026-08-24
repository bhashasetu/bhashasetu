import { SlotMedia } from "./SlotMedia";
import { formatDuration, type StoryRow } from "@/lib/stories/queries";

/**
 * A decorative waveform.
 *
 * The approved design shows a waveform beside every audio clip. Real
 * waveform data would mean decoding each file and storing peaks — a
 * meaningful pipeline for something purely ornamental here. This draws a
 * deterministic shape from the story id instead, so a given clip always
 * looks the same, and is hidden from assistive technology.
 */
function Waveform({ seed }: { seed: string }) {
  const bars = 44;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const heights: number[] = [];
  for (let i = 0; i < bars; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    heights.push(20 + ((hash >>> 8) % 80));
  }

  return (
    <span className="waveform" aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="waveform__bar" style={{ height: `${h}%` }} />
      ))}
    </span>
  );
}

/** One audio clip: portrait, waveform, play control, duration and tag. */
export function AudioStoryCard({
  story,
  thumbnailUrl,
  audioUrl,
}: {
  story: StoryRow;
  thumbnailUrl: string | null;
  audioUrl: string | null;
}) {
  const duration = formatDuration(story.duration_seconds);

  return (
    <article className="audio-card">
      <div className="audio-card__row">
        <div className="audio-card__portrait">
          <SlotMedia
            url={thumbnailUrl}
            altText={
              story.speaker_name
                ? `${story.title} — ${story.speaker_name}`
                : story.title
            }
            aspectRatio="1:1"
            label="Speaker"
          />
        </div>

        <div className="audio-card__wave">
          <Waveform seed={story.id} />
        </div>

        {duration && <span className="audio-card__duration">{duration}</span>}
      </div>

      {/* The approved design draws a bespoke play button. A native control
          is used instead: it is keyboard-accessible and screen-reader
          labelled out of the box, which a styled <span> is not, and audio
          controls have to be accessible (CLAUDE.md section 28). It sits on
          its own row so four cards across never crush it. */}
      {audioUrl ? (
        <audio
          className="audio-card__player"
          controls
          preload="none"
          src={audioUrl}
          aria-label={`Play ${story.title}`}
        />
      ) : (
        <p className="audio-card__pending">Audio not yet attached</p>
      )}

      <div className="audio-card__body">
        <h3 className="audio-card__title">{story.title}</h3>
        {story.speaker_name && (
          <p className="audio-card__speaker">{story.speaker_name}</p>
        )}
        {story.language && (
          <span className="story-tag">{story.language.name}</span>
        )}
      </div>
    </article>
  );
}
