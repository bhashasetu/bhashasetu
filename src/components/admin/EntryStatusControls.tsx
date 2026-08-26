"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS: Record<string, { next: string; label: string }[]> = {
  draft: [{ next: "pending_verification", label: "Submit for Verification" }],
  pending_verification: [
    { next: "verified", label: "Mark Verified" },
    { next: "draft", label: "Return to Draft" },
  ],
  verified: [{ next: "published", label: "Publish" }],
  published: [],
  archived: [],
};

export function EntryStatusControls({
  entryId,
  status,
}: {
  entryId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function transition(next: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/learning-entries/${entryId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  const options = NEXT_STATUS[status] ?? [];

  return (
    <section className="admin-card hp-section">
      <header className="hp-section__head">
        <h3>Verification &amp; publishing</h3>
        <span className={`admin-pill admin-pill--${status}`}>{status}</span>
      </header>

      {error && <p className="hp-msg hp-msg--error">{error}</p>}

      <div className="story-status__actions">
        {options.map((opt) => (
          <button
            key={opt.next}
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => transition(opt.next)}
            disabled={saving}
          >
            {opt.label}
          </button>
        ))}
        {status !== "archived" && (
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => transition("archived")}
            disabled={saving}
          >
            Archive
          </button>
        )}
      </div>

      {status === "published" && (
        <p className="hp-row__hint">
          Publishing this entry does not publish its recording. Media has its
          own lifecycle — publish the asset in the Media Library for it to play
          on the public site.
        </p>
      )}
    </section>
  );
}
