"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One suggested word, with the three things an editor can decide about it.
 *
 * "Added" does not create anything — it records that an editor has made a
 * learning entry for this word through the normal workflow. Creating a
 * published entry straight from a visitor's suggestion would put unverified
 * language content on the public site, which is the one thing this project
 * does not do (CLAUDE.md section 25).
 */
const NEXT: { value: string; label: string }[] = [
  { value: "reviewed", label: "Mark reviewed" },
  { value: "added", label: "Added to the collection" },
  { value: "declined", label: "Decline" },
];

export function SuggestionRow({
  id,
  term,
  language,
  meaning,
  note,
  status,
  createdAt,
}: {
  id: string;
  term: string;
  language: string | null;
  meaning: string | null;
  note: string | null;
  status: string;
  createdAt: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(next: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/word-suggestions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "That could not be saved.");
      return;
    }
    router.refresh();
  }

  return (
    <tr>
      <td>
        <strong>{term}</strong>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </td>
      <td>{language ?? <span className="admin-muted">Not given</span>}</td>
      <td>{meaning ?? <span className="admin-muted">—</span>}</td>
      <td>{note ?? <span className="admin-muted">—</span>}</td>
      <td>{createdAt ? new Date(createdAt).toLocaleDateString() : "—"}</td>
      <td>
        <div className="admin-row-actions">
          {NEXT.filter((n) => n.value !== status).map((n) => (
            <button
              key={n.value}
              type="button"
              className="admin-btn admin-btn--small"
              onClick={() => void move(n.value)}
              disabled={saving}
            >
              {n.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}
