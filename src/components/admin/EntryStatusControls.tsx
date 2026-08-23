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
    <div>
      <p>
        Current status: <strong>{status}</strong>
      </p>
      {error && <p role="alert">{error}</p>}
      {options.map((opt) => (
        <button key={opt.next} onClick={() => transition(opt.next)} disabled={saving}>
          {opt.label}
        </button>
      ))}
      {status !== "archived" && (
        <button onClick={() => transition("archived")} disabled={saving}>
          Archive
        </button>
      )}
      {status === "published" && (
        <p>
          Note: publishing this entry does not publish its linked media. Publish each
          media asset independently in the Media Library.
        </p>
      )}
    </div>
  );
}
