"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Language = { id: string; name: string; code: string };
type Category = { id: string; name: string; language_id: string };

type Entry = {
  id: string;
  language_id: string;
  category_id: string;
  native_text: string;
  transliteration: string | null;
  english_meaning: string;
  hindi_meaning: string | null;
  region: string | null;
  speaker_notes: string | null;
};

export function LearningEntryForm({
  entry,
  languages,
  categories,
}: {
  entry?: Entry;
  languages: Language[];
  categories: Category[];
}) {
  const router = useRouter();
  const [languageId, setLanguageId] = useState(entry?.language_id ?? languages[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? "");
  const [nativeText, setNativeText] = useState(entry?.native_text ?? "");
  const [transliteration, setTransliteration] = useState(entry?.transliteration ?? "");
  const [englishMeaning, setEnglishMeaning] = useState(entry?.english_meaning ?? "");
  const [hindiMeaning, setHindiMeaning] = useState(entry?.hindi_meaning ?? "");
  const [region, setRegion] = useState(entry?.region ?? "");
  const [speakerNotes, setSpeakerNotes] = useState(entry?.speaker_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(entry);
  const filteredCategories = categories.filter((c) => c.language_id === languageId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const url = isEdit
      ? `/api/admin/learning-entries/${entry!.id}`
      : "/api/admin/learning-entries";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: languageId,
        category_id: categoryId,
        native_text: nativeText,
        transliteration: transliteration || null,
        english_meaning: englishMeaning,
        hindi_meaning: hindiMeaning || null,
        region: region || null,
        speaker_notes: speakerNotes || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save learning entry.");
      return;
    }

    if (isEdit) {
      router.refresh();
    } else {
      router.push("/admin/learning-entries");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="language_id">Language</label>
        <select
          id="language_id"
          value={languageId}
          onChange={(e) => {
            setLanguageId(e.target.value);
            setCategoryId("");
          }}
          required
          disabled={saving}
        >
          {languages.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.name} ({lang.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="category_id">Category</label>
        <select
          id="category_id"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          disabled={saving}
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
      </div>
      <div>
        <label htmlFor="native_text">Native text</label>
        <input
          id="native_text"
          value={nativeText}
          onChange={(e) => setNativeText(e.target.value)}
          required
          maxLength={500}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="transliteration">Transliteration</label>
        <input
          id="transliteration"
          value={transliteration ?? ""}
          onChange={(e) => setTransliteration(e.target.value)}
          maxLength={500}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="english_meaning">English meaning</label>
        <input
          id="english_meaning"
          value={englishMeaning}
          onChange={(e) => setEnglishMeaning(e.target.value)}
          required
          maxLength={500}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="hindi_meaning">Hindi meaning</label>
        <input
          id="hindi_meaning"
          value={hindiMeaning ?? ""}
          onChange={(e) => setHindiMeaning(e.target.value)}
          maxLength={500}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="region">Region / village</label>
        <input
          id="region"
          value={region ?? ""}
          onChange={(e) => setRegion(e.target.value)}
          maxLength={255}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="speaker_notes">Speaker notes (internal)</label>
        <textarea
          id="speaker_notes"
          value={speakerNotes ?? ""}
          onChange={(e) => setSpeakerNotes(e.target.value)}
          disabled={saving}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving || !categoryId}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create entry"}
      </button>
    </form>
  );
}
