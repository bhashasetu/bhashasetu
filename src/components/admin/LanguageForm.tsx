"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Language = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  featured: boolean;
  status: "draft" | "published" | "archived";
};

export function LanguageForm({ language }: { language?: Language }) {
  const router = useRouter();
  const [code, setCode] = useState(language?.code ?? "");
  const [name, setName] = useState(language?.name ?? "");
  const [description, setDescription] = useState(language?.description ?? "");
  const [featured, setFeatured] = useState(language?.featured ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(language);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const url = isEdit ? `/api/admin/languages/${language!.id}` : "/api/admin/languages";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, description: description || null, featured }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save language.");
      return;
    }

    router.push("/admin/languages");
    router.refresh();
  }

  async function handleStatusChange(status: "draft" | "published" | "archived") {
    if (!isEdit) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/languages/${language!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="code">Code</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={10}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="featured">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              disabled={saving}
            />{" "}
            Featured
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create language"}
        </button>
      </form>

      {isEdit && (
        <div>
          <p>Current status: {language!.status}</p>
          {language!.status === "draft" && (
            <button onClick={() => handleStatusChange("published")} disabled={saving}>
              Publish
            </button>
          )}
          {language!.status === "published" && (
            <button onClick={() => handleStatusChange("archived")} disabled={saving}>
              Archive
            </button>
          )}
          {language!.status === "archived" && (
            <button onClick={() => handleStatusChange("draft")} disabled={saving}>
              Restore to Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
