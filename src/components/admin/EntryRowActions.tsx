"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * View, edit and archive actions for one row.
 *
 * The approved reference draws a trash icon. It archives rather than deletes:
 * a verified word is the product of someone sitting with a speaker and
 * checking it, and removing the row would also orphan its verification
 * history and drop it out of anything published, with no way back. The icon
 * does not override that (brief section 16).
 */
export function EntryRowActions({
  entryId,
  nativeText,
  status,
  viewHref,
}: {
  entryId: string;
  nativeText: string;
  status: string;
  viewHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyArchived = status === "archived";

  async function archive() {
    // Name what is at stake rather than asking "are you sure?".
    const warning =
      status === "published"
        ? `"${nativeText}" is published. Archiving removes it from the public Learn page. Its recording stays in the Media Library and remains available to other entries. Continue?`
        : `Archive "${nativeText}"? It leaves the working list but keeps its history, and can be restored to draft later.`;

    if (!window.confirm(warning)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/learning-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Could not archive (${res.status})`);
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
    <div className="wp-actions">
      <Link href={viewHref} className="wp-action" title={`View ${nativeText}`}>
        <span aria-hidden="true">👁</span>
        <span className="visually-hidden">View {nativeText}</span>
      </Link>
      <Link
        href={`/admin/learning-entries/${entryId}`}
        className="wp-action"
        title={`Edit ${nativeText}`}
      >
        <span aria-hidden="true">✎</span>
        <span className="visually-hidden">Edit {nativeText}</span>
      </Link>
      <button
        type="button"
        className="wp-action wp-action--danger"
        onClick={archive}
        disabled={busy || alreadyArchived}
        title={
          alreadyArchived ? "Already archived" : `Archive ${nativeText}`
        }
      >
        <span aria-hidden="true">🗑</span>
        <span className="visually-hidden">Archive {nativeText}</span>
      </button>
      {error && <span className="wp-action__error">{error}</span>}
    </div>
  );
}
