"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StoryMediaField } from "./StoryMediaField";

export type StoryRecord = {
  id?: string;
  slug: string;
  title: string;
  format: string;
  speaker_name: string | null;
  speaker_role: string | null;
  speaker_place: string | null;
  summary: string | null;
  transcript: string | null;
  language_id: string | null;
  theme: string | null;
  age_group: string | null;
  thumbnail_asset_id: string | null;
  media_asset_id: string | null;
  duration_seconds: number | null;
  recorded_on: string | null;
  recorded_by: string | null;
  consent_confirmed?: boolean;
  featured: boolean;
  display_order: number | null;
  status?: string;
  meta_title: string | null;
  meta_description: string | null;
};

const EMPTY: StoryRecord = {
  slug: "",
  title: "",
  format: "interview",
  speaker_name: null,
  speaker_role: null,
  speaker_place: null,
  summary: null,
  transcript: null,
  language_id: null,
  theme: null,
  age_group: null,
  thumbnail_asset_id: null,
  media_asset_id: null,
  duration_seconds: null,
  recorded_on: null,
  recorded_by: null,
  featured: false,
  display_order: 0,
  meta_title: null,
  meta_description: null,
};

/** Lowercase hyphenated web address, derived from the title as a starting point. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

export function StoryForm({
  story,
  languages,
}: {
  story?: StoryRecord;
  languages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isNew = !story?.id;

  const [values, setValues] = useState<StoryRecord>(story ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );

  function set<K extends keyof StoryRecord>(key: K, value: StoryRecord[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const text = (key: keyof StoryRecord) => (values[key] as string | null) ?? "";

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    // Only the fields the API accepts; status and consent move through their
    // own endpoint.
    const payload = {
      slug: values.slug || slugify(values.title),
      title: values.title,
      format: values.format,
      speaker_name: values.speaker_name || null,
      speaker_role: values.speaker_role || null,
      speaker_place: values.speaker_place || null,
      summary: values.summary || null,
      transcript: values.transcript || null,
      language_id: values.language_id || null,
      theme: values.theme || null,
      age_group: values.age_group || null,
      thumbnail_asset_id: values.thumbnail_asset_id || null,
      media_asset_id: values.media_asset_id || null,
      duration_seconds: values.duration_seconds ?? null,
      recorded_on: values.recorded_on || null,
      recorded_by: values.recorded_by || null,
      featured: values.featured,
      display_order: values.display_order ?? 0,
      meta_title: values.meta_title || null,
      meta_description: values.meta_description || null,
    };

    try {
      const res = await fetch(
        isNew ? "/api/admin/stories" : `/api/admin/stories/${story?.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "Could not save." });
        return;
      }

      setMessage({ kind: "ok", text: "Saved." });
      if (isNew) router.push(`/admin/stories/${body.data.id}`);
      else router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  }

  // Interviews are wide video cards; audio and songs use a square portrait.
  const thumbRatio = values.format === "interview" ? "16:9" : "1:1";

  return (
    <div className="hp-editor">
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">{isNew ? "New story" : "Edit story"}</h2>
          <p className="hp-bar__sub">
            {values.title || "Untitled"}
            {story?.status && (
              <span className={`admin-pill admin-pill--${story.status}`}>
                {story.status}
              </span>
            )}
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/stories" className="admin-btn admin-btn--ghost">
            Back to list
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving || !values.title.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={message.kind === "ok" ? "hp-msg hp-msg--ok" : "hp-msg hp-msg--error"}
        >
          {message.text}
        </p>
      )}

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>The story</h3>
        </header>

        <div className="hp-fields">
          <Row label="Title" htmlFor="f-title">
            <input
              id="f-title"
              type="text"
              value={values.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (isNew) set("slug", slugify(e.target.value));
              }}
            />
          </Row>

          <Row label="Web address" htmlFor="f-slug">
            <input
              id="f-slug"
              type="text"
              value={values.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
            />
            <p className="hp-row__hint">Lowercase words separated by hyphens.</p>
          </Row>

          <Row label="Format" htmlFor="f-format">
            <select
              id="f-format"
              value={values.format}
              onChange={(e) => set("format", e.target.value)}
            >
              <option value="interview">Interview (video)</option>
              <option value="audio">Audio clip</option>
              <option value="song">Song</option>
            </select>
          </Row>

          <Row label="Language" htmlFor="f-language">
            <select
              id="f-language"
              value={values.language_id ?? ""}
              onChange={(e) => set("language_id", e.target.value || null)}
            >
              <option value="">Not set</option>
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Summary" htmlFor="f-summary">
            <textarea
              id="f-summary"
              rows={3}
              value={text("summary")}
              onChange={(e) => set("summary", e.target.value)}
            />
            <p className="hp-row__hint">
              The two or three lines shown on the card. Describe what the
              speaker said &mdash; do not paraphrase it into a claim they did
              not make.
            </p>
          </Row>

          <Row label="Transcript" htmlFor="f-transcript">
            <textarea
              id="f-transcript"
              rows={4}
              value={text("transcript")}
              onChange={(e) => set("transcript", e.target.value)}
            />
          </Row>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Speaker</h3>
        </header>

        <div className="hp-fields">
          <Row label="Name" htmlFor="f-speaker">
            <input
              id="f-speaker"
              type="text"
              value={text("speaker_name")}
              onChange={(e) => set("speaker_name", e.target.value)}
            />
          </Row>
          <Row label="Role" htmlFor="f-role">
            <input
              id="f-role"
              type="text"
              value={text("speaker_role")}
              onChange={(e) => set("speaker_role", e.target.value)}
            />
          </Row>
          <Row label="Village or place" htmlFor="f-place">
            <input
              id="f-place"
              type="text"
              value={text("speaker_place")}
              onChange={(e) => set("speaker_place", e.target.value)}
            />
          </Row>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Media</h3>
        </header>

        <div className="hp-media-list">
          <StoryMediaField
            label="Card image"
            kind="image"
            aspectRatio={thumbRatio}
            hint={`Any size is fine — it's centre-cropped to ${thumbRatio} automatically.`}
            assetId={values.thumbnail_asset_id}
            onChange={(id) => set("thumbnail_asset_id", id)}
          />
          <StoryMediaField
            label="Recording"
            kind="recording"
            hint="The audio or video the card plays. Required before publishing."
            assetId={values.media_asset_id}
            onChange={(id) => set("media_asset_id", id)}
          />
        </div>

        <div className="hp-fields">
          <Row label="Length (seconds)" htmlFor="f-duration">
            <input
              id="f-duration"
              type="number"
              min={0}
              value={values.duration_seconds ?? ""}
              onChange={(e) =>
                set("duration_seconds", e.target.value ? Number(e.target.value) : null)
              }
            />
            <p className="hp-row__hint">Shown as the badge on the card.</p>
          </Row>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Filing &amp; recording</h3>
        </header>

        <div className="hp-fields">
          <Row label="Theme" htmlFor="f-theme">
            <input
              id="f-theme"
              type="text"
              value={text("theme")}
              onChange={(e) => set("theme", e.target.value)}
            />
            <p className="hp-row__hint">
              Fills the &ldquo;All Themes&rdquo; filter on the public page.
            </p>
          </Row>
          <Row label="Age group" htmlFor="f-age">
            <input
              id="f-age"
              type="text"
              value={text("age_group")}
              onChange={(e) => set("age_group", e.target.value)}
            />
          </Row>
          <Row label="Recorded on" htmlFor="f-recorded">
            <input
              id="f-recorded"
              type="date"
              value={text("recorded_on")}
              onChange={(e) => set("recorded_on", e.target.value)}
            />
          </Row>
          <Row label="Recorded by" htmlFor="f-recordedby">
            <input
              id="f-recordedby"
              type="text"
              value={text("recorded_by")}
              onChange={(e) => set("recorded_by", e.target.value)}
            />
          </Row>
          <Row label="Order" htmlFor="f-order">
            <input
              id="f-order"
              type="number"
              value={values.display_order ?? 0}
              onChange={(e) => set("display_order", Number(e.target.value))}
            />
            <p className="hp-row__hint">Lower numbers appear first in a rail.</p>
          </Row>
          <Row label="Featured" htmlFor="f-featured">
            <label className="hp-check">
              <input
                id="f-featured"
                type="checkbox"
                checked={values.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Show in the Featured Story panel
            </label>
          </Row>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Search listing</h3>
        </header>
        <div className="hp-fields">
          <Row label="Search title" htmlFor="f-metatitle">
            <input
              id="f-metatitle"
              type="text"
              value={text("meta_title")}
              onChange={(e) => set("meta_title", e.target.value)}
            />
          </Row>
          <Row label="Search description" htmlFor="f-metadesc">
            <textarea
              id="f-metadesc"
              rows={2}
              value={text("meta_description")}
              onChange={(e) => set("meta_description", e.target.value)}
            />
          </Row>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hp-row">
      <label className="hp-row__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="hp-row__control">{children}</div>
    </div>
  );
}
