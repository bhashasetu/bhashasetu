import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminMediaPreview } from "@/components/admin/AdminMediaPreview";
import { formatDuration } from "@/lib/stories/queries";

export const dynamic = "force-dynamic";

/**
 * There are no generated Supabase types in this project, so an embedded
 * to-one relation (language:languages) comes back loosely typed. Declaring
 * the shape the query actually selects keeps the table code honest without
 * scattering `any`.
 */
type StoryListRow = {
  id: string;
  slug: string;
  title: string;
  format: string;
  speaker_name: string | null;
  speaker_place: string | null;
  status: string;
  featured: boolean;
  consent_confirmed: boolean;
  duration_seconds: number | null;
  thumbnail_asset_id: string | null;
  media_asset_id: string | null;
  display_order: number | null;
  language: { name: string } | null;
};

const FORMAT_LABELS: Record<string, string> = {
  interview: "Interview",
  audio: "Audio clip",
  song: "Song",
};

/**
 * Stories & Interviews (CLAUDE.md section 13, module 7).
 *
 * Editorial copy for the Stories & Voices page itself is a separate screen;
 * this one manages the records the page lists.
 */
export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const format = one("format");
  const status = one("status");

  let query = supabase
    .from("stories")
    .select(
      "id, slug, title, format, speaker_name, speaker_place, status, featured, " +
        "consent_confirmed, duration_seconds, thumbnail_asset_id, media_asset_id, " +
        "display_order, language:languages(name)"
    )
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (format) query = query.eq("format", format);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  const stories = (data ?? []) as unknown as StoryListRow[];

  const filterHref = (key: string, value: string | null) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ format, status })) {
      if (v) next.set(k, v);
    }
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return qs ? `/admin/stories?${qs}` : "/admin/stories";
  };

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">Stories &amp; Interviews</h2>
          <p className="hp-bar__sub">
            The interviews, audio clips and songs listed on Stories &amp; Voices.
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/stories/content" className="admin-btn admin-btn--ghost">
            Page content
          </Link>
          <Link href="/admin/stories/new" className="admin-btn admin-btn--primary">
            + New story
          </Link>
        </div>
      </div>

      <nav className="hp-jump" aria-label="Filter">
        <a href={filterHref("format", null)}>All formats</a>
        <a href={filterHref("format", "interview")}>Interviews</a>
        <a href={filterHref("format", "audio")}>Audio</a>
        <a href={filterHref("format", "song")}>Songs</a>
        <a href={filterHref("status", "draft")}>Drafts</a>
        <a href={filterHref("status", "published")}>Published</a>
      </nav>

      {error && (
        <p role="alert" className="hp-msg hp-msg--error">
          Could not load stories: {error.message}
        </p>
      )}

      {!error && stories.length === 0 && (
        <section className="admin-card hp-section">
          <p className="admin-page-intro">
            No stories yet. Add one to see it appear on the public Stories &amp;
            Voices page.
          </p>
        </section>
      )}

      {stories.length > 0 && (
        <section className="admin-card hp-section">
          <table className="admin-table story-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Image</span>
                </th>
                <th scope="col">Title</th>
                <th scope="col">Speaker</th>
                <th scope="col">Format</th>
                <th scope="col">Language</th>
                <th scope="col">Length</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story.id}>
                  <td className="story-table__thumb">
                    {story.thumbnail_asset_id ? (
                      <AdminMediaPreview
                        key={story.thumbnail_asset_id}
                        assetId={story.thumbnail_asset_id}
                        mediaType="image"
                        label={story.title}
                      />
                    ) : (
                      <div className="admin-preview admin-preview--empty">
                        <span>No image</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/stories/${story.id}`}>{story.title}</Link>
                    {story.featured && (
                      <span className="admin-pill admin-pill--published">Featured</span>
                    )}
                    {!story.consent_confirmed && (
                      <span className="admin-pill admin-pill--draft">No consent</span>
                    )}
                  </td>
                  <td>
                    {[story.speaker_name, story.speaker_place]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>{FORMAT_LABELS[story.format] ?? story.format}</td>
                  <td>{story.language?.name ?? "—"}</td>
                  <td>{formatDuration(story.duration_seconds) ?? "—"}</td>
                  <td>
                    <span className={`admin-pill admin-pill--${story.status}`}>
                      {story.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/stories/${story.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
