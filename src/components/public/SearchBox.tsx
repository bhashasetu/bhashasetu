"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/public/AudioPlayer";

type Entry = {
  id: string;
  native_text: string;
  transliteration: string | null;
  english_meaning: string;
  hindi_meaning: string | null;
};

export function SearchBox() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Entry[] | null>(null);
  const [audioByEntryId, setAudioByEntryId] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/public/learning-entries?q=${encodeURIComponent(q)}`);
    const body = await res.json().catch(() => ({ data: [], audioByEntryId: {} }));
    setSearching(false);
    setResults(body.data ?? []);
    setAudioByEntryId(body.audioByEntryId ?? {});
  }

  return (
    <div>
      <form onSubmit={handleSearch}>
        <label htmlFor="search">Search Warli or Katkari words</label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. hello, kos, नमस्ते"
        />
        <button type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {results !== null && results.length === 0 && (
        <p>No verified results found for &ldquo;{q}&rdquo;.</p>
      )}

      {results !== null && results.length > 0 && (
        <ul>
          {results.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.native_text}</strong>
              {entry.transliteration && <span> ({entry.transliteration})</span>} —{" "}
              {entry.english_meaning}
              {entry.hindi_meaning && <span> / {entry.hindi_meaning}</span>}
              {audioByEntryId[entry.id] && (
                <AudioPlayer mediaAssetId={audioByEntryId[entry.id]} linkedEntryId={entry.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
