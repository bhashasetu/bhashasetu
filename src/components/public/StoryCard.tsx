import { StoryPlayer } from "./StoryPlayer";
import { formatDuration, type StoryRow } from "@/lib/stories/queries";

/**
 * One interview card: the recording behind a still with a play control, then
 * title, speaker line, summary and the language tag.
 *
 * The still and the play button live in StoryPlayer, which swaps in the real
 * media on press. Nothing loads until then, so a rail of cards costs a row of
 * images rather than a row of video streams.
 */
export function StoryCard({
  story,
  thumbnailUrl,
  mediaUrl,
  mediaSourceUrl,
}: {
  story: StoryRow;
  thumbnailUrl: string | null;
  /** Signed URL for a recording we host. */
  mediaUrl: string | null;
  /** Address of a hosted video (YouTube/Vimeo). */
  mediaSourceUrl: string | null;
}) {
  const duration = formatDuration(story.duration_seconds);
  const speakerLine = [story.speaker_name, story.speaker_role, story.speaker_place]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="story-card">
      <StoryPlayer
        url={mediaUrl}
        sourceUrl={mediaSourceUrl}
        posterUrl={thumbnailUrl}
        title={
          story.speaker_name
            ? `${story.title} — ${story.speaker_name}`
            : story.title
        }
        aspectRatio="16:9"
        label="Interview"
        duration={duration}
      />

      <div className="story-card__body">
        <h3 className="story-card__title">{story.title}</h3>
        {speakerLine && <p className="story-card__speaker">{speakerLine}</p>}
        {story.summary && <p className="story-card__summary">{story.summary}</p>}
        {story.language && (
          <span className="story-tag">{story.language.name}</span>
        )}
      </div>
    </article>
  );
}
