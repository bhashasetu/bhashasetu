import { SlotMedia } from "./SlotMedia";
import { formatDuration, type StoryRow } from "@/lib/stories/queries";

/**
 * One interview card: thumbnail with a play affordance and a duration badge,
 * then title, speaker line, summary and the language tag.
 *
 * The play control is a link to the story's own page rather than an inline
 * player — the approved design shows a still with a play symbol, and the
 * cards sit in a scrolling rail where several simultaneous players would be
 * hostile.
 */
export function StoryCard({
  story,
  thumbnailUrl,
}: {
  story: StoryRow;
  thumbnailUrl: string | null;
}) {
  const duration = formatDuration(story.duration_seconds);
  const speakerLine = [story.speaker_name, story.speaker_role, story.speaker_place]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="story-card">
      <div className="story-card__media">
        <SlotMedia
          url={thumbnailUrl}
          altText={
            story.speaker_name
              ? `${story.title} — ${story.speaker_name}`
              : story.title
          }
          aspectRatio="16:9"
          label="Interview"
        />
        <span className="story-card__play" aria-hidden="true">
          ▶
        </span>
        {duration && <span className="story-card__duration">{duration}</span>}
      </div>

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
