"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Publish, unpublish and archive a story, with the consent gate in front.
 *
 * The database refuses to publish a story whose consent is not recorded, and
 * the API repeats the check to return a readable sentence. This adds the
 * third layer an editor actually sees: the publish button stays disabled,
 * and says why, until consent is ticked and a recording is attached.
 */
export function StoryStatusControls({
  storyId,
  status,
  consentConfirmed,
  hasRecording,
}: {
  storyId: string;
  status: string;
  consentConfirmed: boolean;
  hasRecording: boolean;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(consentConfirmed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockers = [
    !consent && "the speaker's consent has not been recorded",
    !hasRecording && "no recording is attached",
  ].filter(Boolean) as string[];

  async function change(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stories/${storyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, consent_confirmed: consent }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Could not change status (${res.status})`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card hp-section">
      <header className="hp-section__head">
        <h3>Consent &amp; publishing</h3>
        <span className={`admin-pill admin-pill--${status}`}>{status}</span>
      </header>

      <label className="hp-check story-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
        />
        The speaker gave consent for this recording to be published.
      </label>
      <p className="hp-row__hint">
        Saved with the next status change. Publishing without it is refused by
        the database, not just by this screen.
      </p>

      {blockers.length > 0 && status !== "published" && (
        <p className="hp-msg hp-msg--error">
          Cannot publish yet: {blockers.join(" and ")}.
        </p>
      )}

      <div className="story-status__actions">
        {status !== "published" && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => change("published")}
            disabled={busy || blockers.length > 0}
          >
            {busy ? "Working…" : "Publish"}
          </button>
        )}
        {status === "published" && (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => change("draft")}
            disabled={busy}
          >
            Unpublish
          </button>
        )}
        {status !== "archived" && (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => change("archived")}
            disabled={busy}
          >
            Archive
          </button>
        )}
        {status === "archived" && (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => change("draft")}
            disabled={busy}
          >
            Restore to draft
          </button>
        )}
      </div>

      {error && <p className="hp-msg hp-msg--error">{error}</p>}
    </section>
  );
}
