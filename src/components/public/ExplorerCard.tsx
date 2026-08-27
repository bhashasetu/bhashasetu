import Link from "next/link";
import type { EntryRow } from "@/lib/entries/search";
import type { RelatedWord } from "@/lib/explorer/queries";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { WordAudioButton } from "@/components/public/WordAudioButton";

/**
 * One result in the Language Explorer (WEB-04 / MOBILE-01).
 *
 * The coloured panel down the left is the language, named in words as well as
 * in colour — colour alone would tell a reader nothing if they cannot
 * distinguish navy from green, and would tell them nothing at all in print.
 *
 * The Verified pill is on every card because it is true of every card: a
 * database CHECK requires every published entry to be verified, so there is no
 * state in which this page shows an unverified word. It is a fact about the
 * collection, not a badge some entries earned.
 */
export function ExplorerCard({
  entry,
  language,
  category,
  audioAssetId,
  related,
  cardArtUrl,
}: {
  entry: EntryRow;
  language: { code: string; name: string } | null;
  category: { name: string; icon_name: string | null } | null;
  audioAssetId: string | null;
  related: { words: RelatedWord[]; more: number };
  /** Community artwork for this language, when an editor has attached one. */
  cardArtUrl: string | null;
}) {
  const code = language?.code ?? "unknown";

  return (
    <article className={`ex-card ex-card--${code}`}>
      <div className="ex-card__lang">
        <span className="ex-card__lang-name">{language?.name ?? "—"}</span>
        {/* The artwork is decoration over a panel that already carries the
            language name, so it is hidden from assistive technology rather
            than described twice. Absent, the panel simply stays flat. */}
        {cardArtUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ex-card__lang-art" src={cardArtUrl} alt="" aria-hidden="true" />
        )}
      </div>

      <div className="ex-card__body">
        <h3 className="ex-card__word">
            <span className="ex-card__native">{entry.native_text}</span>
          <WordAudioButton
            assetId={audioAssetId}
            entryId={entry.id}
            label={entry.native_text}
            tone={code === "katkari" ? "green" : "navy"}
          />
        </h3>

        {category && (
          <p className="ex-card__category">
            <span className="ex-card__category-label">Category</span>
            <span className="ex-card__category-name">
              <CategoryIcon name={category.icon_name} />
              {category.name}
            </span>
          </p>
        )}

        <p className="ex-card__meanings">
          <span className="ex-card__meaning">
            <span className="ex-card__meaning-label">English:</span>{" "}
            {entry.english_meaning ?? "—"}
          </span>
          {entry.hindi_meaning && (
            <span className="ex-card__meaning">
              <span className="ex-card__meaning-label">Hindi:</span>{" "}
              <span className="ex-card__hindi">{entry.hindi_meaning}</span>
            </span>
          )}
        </p>

        <p className="ex-card__trust">
          <span className="ex-card__verified">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2l7 3v6c0 4.4-3 8.4-7 9.5C8 19.4 5 15.4 5 11V5l7-3zm-1 13l5-5-1.4-1.4L11 12.2l-1.6-1.6L8 12l3 3z"
              />
            </svg>
            Verified
          </span>
          <span className="ex-card__dot" aria-hidden="true">
            ·
          </span>
          {/* Said only when there is one. A card with no recording must not
              claim a native speaker recorded it. */}
          <span className="ex-card__by">
            {audioAssetId ? "Audio by native speaker" : "No recording yet"}
          </span>
        </p>

        {related.words.length > 0 && (
          <div className="ex-card__related">
            <p className="ex-card__related-label">Related words</p>
            <ul className="ex-chips">
              {related.words.map((word) => (
                <li key={word.id}>
                  <Link className="ex-chip" href={`/languages?q=${encodeURIComponent(word.native_text)}`}>
                    <strong>{word.native_text}</strong>
                    {word.gloss && <span> ({word.gloss})</span>}
                  </Link>
                </li>
              ))}
              {related.more > 0 && category && (
                <li>
                  <Link
                    className="ex-chip ex-chip--more"
                    href={`/languages?category=${entry.category_id}`}
                  >
                    +{related.more} more
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
