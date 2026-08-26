"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MediaPicker } from "./MediaPicker";

type Language = { id: string; name: string; code: string };
type Category = { id: string; name: string; language_id: string };

type Entry = {
  id: string;
  language_id: string;
  category_id: string;
  entry_type: string;
  featured?: boolean | null;
  native_text: string;
  transliteration: string | null;
  english_meaning: string;
  hindi_meaning: string | null;
  region: string | null;
  speaker_notes: string | null;
  status?: string;
};

/**
 * Create or edit one word or phrase, with its pronunciation recording, in a
 * single task.
 *
 * The recording is not a second copy of anything: MediaPicker puts the file
 * through the canonical media pipeline, and the entry is joined to it by a
 * media_links row. So an admin never has to upload into the Media Library,
 * leave, create the entry elsewhere and reconnect the two by hand
 * (brief section 9), while the architecture keeps one canonical media record.
 */
export function LearningEntryForm({
  entry,
  languages,
  categories,
  initialAudioAssetId = null,
  initialAudioLinkId = null,
}: {
  entry?: Entry;
  languages: Language[];
  categories: Category[];
  /** Pronunciation asset already linked to this entry, if any. */
  initialAudioAssetId?: string | null;
  /** The media_links row joining them, needed to replace or remove it. */
  initialAudioLinkId?: string | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(entry);

  const [languageId, setLanguageId] = useState(
    entry?.language_id ?? languages[0]?.id ?? ""
  );
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? "");
  const [entryType, setEntryType] = useState(entry?.entry_type ?? "word");
  const [nativeText, setNativeText] = useState(entry?.native_text ?? "");
  const [transliteration, setTransliteration] = useState(
    entry?.transliteration ?? ""
  );
  const [englishMeaning, setEnglishMeaning] = useState(
    entry?.english_meaning ?? ""
  );
  const [hindiMeaning, setHindiMeaning] = useState(entry?.hindi_meaning ?? "");
  const [region, setRegion] = useState(entry?.region ?? "");
  const [featured, setFeatured] = useState(entry?.featured ?? false);
  const [speakerNotes, setSpeakerNotes] = useState(entry?.speaker_notes ?? "");

  const [audioAssetId, setAudioAssetId] = useState<string | null>(
    initialAudioAssetId
  );
  const [audioError, setAudioError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.language_id === languageId);
  const noCategories = filteredCategories.length === 0;

  /**
   * Keep the entry's pronunciation link in step with what the picker holds.
   * Done after the entry exists, because media_links needs its id.
   */
  async function syncAudioLink(entryId: string) {
    if (audioAssetId === initialAudioAssetId) return;

    if (initialAudioLinkId) {
      // Only the relationship goes. The recording stays in the Media Library
      // and remains available to every other entry (brief section 16).
      await fetch(`/api/admin/media-links?id=${initialAudioLinkId}`, {
        method: "DELETE",
      }).catch(() => null);
    }

    if (audioAssetId) {
      const res = await fetch("/api/admin/media-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_asset_id: audioAssetId,
          linked_entry_type: "learning_entry",
          linked_entry_id: entryId,
          link_type: "pronunciation_audio",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAudioError(
          body.error ?? "The entry saved, but the recording could not be linked."
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAudioError(null);
    setSaving(true);

    const url = isEdit
      ? `/api/admin/learning-entries/${entry?.id}`
      : "/api/admin/learning-entries";

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: languageId,
        category_id: categoryId,
        entry_type: entryType,
        native_text: nativeText,
        transliteration: transliteration || null,
        english_meaning: englishMeaning,
        hindi_meaning: hindiMeaning || null,
        region: region || null,
        featured,
        speaker_notes: speakerNotes || null,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save learning entry.");
      return;
    }

    const body = await res.json().catch(() => ({}));
    const savedId: string | undefined = body.data?.id ?? entry?.id;
    if (savedId) await syncAudioLink(savedId);

    setSaving(false);

    if (isEdit) {
      router.refresh();
    } else {
      router.push("/admin/learning-entries");
      router.refresh();
    }
  }

  return (
    <form className="hp-editor" onSubmit={handleSubmit}>
      <div className="hp-bar">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">
            {isEdit ? "Edit entry" : "New word or phrase"}
          </h2>
          <p className="hp-bar__sub">
            {nativeText || "Untitled"}
            {entry?.status && (
              <span className={`admin-pill admin-pill--${entry.status}`}>
                {entry.status}
              </span>
            )}
          </p>
        </div>
        <div className="hp-bar__actions">
          <Link href="/admin/learning-entries" className="admin-btn admin-btn--ghost">
            Back to list
          </Link>
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={saving || !categoryId || !nativeText.trim() || !englishMeaning.trim()}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create entry"}
          </button>
        </div>
      </div>

      {error && <p className="hp-msg hp-msg--error">{error}</p>}
      {audioError && <p className="hp-msg hp-msg--error">{audioError}</p>}

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>The word or phrase</h3>
        </header>

        <div className="hp-fields">
          <Row label="Language" htmlFor="language_id">
            <select
              id="language_id"
              value={languageId}
              onChange={(e) => {
                setLanguageId(e.target.value);
                // Categories belong to one language, so a category chosen
                // under the previous one no longer applies.
                setCategoryId("");
              }}
              required
              disabled={saving}
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </Row>

          <Row label="Type" htmlFor="entry_type">
            <select
              id="entry_type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              disabled={saving}
            >
              <option value="word">Word</option>
              <option value="phrase">Phrase</option>
            </select>
          </Row>

          <Row label="Category" htmlFor="category_id">
            <select
              id="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              disabled={saving || noCategories}
            >
              <option value="" disabled>
                Select a category
              </option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {noCategories && (
              <p className="hp-row__hint">
                This language has no categories yet.{" "}
                <Link href="/admin/categories">Add one</Link> before saving.
              </p>
            )}
          </Row>

          <Row label="Native text" htmlFor="native_text">
            <input
              id="native_text"
              value={nativeText}
              onChange={(e) => setNativeText(e.target.value)}
              required
              maxLength={500}
              disabled={saving}
            />
            <p className="hp-row__hint">
              Exactly as the speaker or the verified source gives it. Never
              guessed or corrected here.
            </p>
          </Row>

          <Row label="Transliteration" htmlFor="transliteration">
            <input
              id="transliteration"
              value={transliteration}
              onChange={(e) => setTransliteration(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
          </Row>

          <Row label="English meaning" htmlFor="english_meaning">
            <input
              id="english_meaning"
              value={englishMeaning}
              onChange={(e) => setEnglishMeaning(e.target.value)}
              required
              maxLength={500}
              disabled={saving}
            />
          </Row>

          <Row label="Hindi meaning" htmlFor="hindi_meaning">
            <input
              id="hindi_meaning"
              value={hindiMeaning}
              onChange={(e) => setHindiMeaning(e.target.value)}
              maxLength={500}
              disabled={saving}
            />
          </Row>
        </div>
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Pronunciation</h3>
        </header>

        <div className="hp-media-list">
          <MediaPicker
            label="Pronunciation recording"
            kind="audio"
            assetId={audioAssetId}
            onChange={setAudioAssetId}
            disabled={saving}
            // The speaker agreed to this recording being published; that is
            // what the consent field records, and without it the clip will
            // not play publicly.
            consentStatus="obtained"
            hint="Select a recording already in the Media Library, or upload one here."
          />
        </div>
        {!isEdit && audioAssetId && (
          <p className="hp-row__hint">
            The recording is linked once the entry is created.
          </p>
        )}
      </section>

      <section className="admin-card hp-section">
        <header className="hp-section__head">
          <h3>Source</h3>
        </header>

        <div className="hp-fields">
          <Row label="Region / village" htmlFor="region">
            <input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={255}
              disabled={saving}
            />
          </Row>

          <Row label="Feature this word" htmlFor="featured">
            <label className="hp-check">
              <input
                id="featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                disabled={saving}
              />
              <span>
                Show in the Language Explorer&apos;s Explore &amp; Discover panel
              </span>
            </label>
          </Row>

          <Row label="Notes (internal)" htmlFor="speaker_notes">
            <textarea
              id="speaker_notes"
              rows={3}
              value={speakerNotes}
              onChange={(e) => setSpeakerNotes(e.target.value)}
              disabled={saving}
            />
          </Row>
        </div>
      </section>
    </form>
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
