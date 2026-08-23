"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Language = { id: string; name: string; code: string };

type Category = {
  id: string;
  language_id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  status: "draft" | "published" | "archived";
};

export function CategoryForm({
  category,
  languages,
}: {
  category?: Category;
  languages: Language[];
}) {
  const router = useRouter();
  const [languageId, setLanguageId] = useState(
    category?.language_id ?? languages[0]?.id ?? ""
  );
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [iconName, setIconName] = useState(category?.icon_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const url = isEdit ? `/api/admin/categories/${category!.id}` : "/api/admin/categories";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: languageId,
        name,
        description: description || null,
        icon_name: iconName || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save category.");
      return;
    }

    router.push("/admin/categories");
    router.refresh();
  }

  async function handleStatusChange(status: "draft" | "published" | "archived") {
    if (!isEdit) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/categories/${category!.id}`, {
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
          <label htmlFor="language_id">Language</label>
          <select
            id="language_id"
            value={languageId}
            onChange={(e) => setLanguageId(e.target.value)}
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
          <label htmlFor="icon_name">Icon name (Lucide)</label>
          <input
            id="icon_name"
            value={iconName ?? ""}
            onChange={(e) => setIconName(e.target.value)}
            disabled={saving}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </button>
      </form>

      {isEdit && (
        <div>
          <p>Current status: {category!.status}</p>
          {category!.status === "draft" && (
            <button onClick={() => handleStatusChange("published")} disabled={saving}>
              Publish
            </button>
          )}
          {category!.status === "published" && (
            <button onClick={() => handleStatusChange("archived")} disabled={saving}>
              Archive
            </button>
          )}
          {category!.status === "archived" && (
            <button onClick={() => handleStatusChange("draft")} disabled={saving}>
              Restore to Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
