"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type PageData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  page_type: string;
  status: string;
};

export function PageEditForm({
  pageId,
  initialData,
}: {
  pageId: string;
  initialData: PageData;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const statusOptions = ["draft", "published", "archived"];
  // Must stay in step with the pages_type_valid CHECK constraint (migration
  // 0004). Three of the values previously offered here — "stories", "chat" and
  // "landing" — are not legal, so saving with any of them returned a 500.
  const pageTypeOptions = [
    "homepage",
    "about",
    "stories_voices",
    "language_selection",
    "heritage",
    "custom",
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          page_type: formData.page_type,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save page");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginBottom: "30px", padding: "20px", border: "1px solid #e0e0e0", borderRadius: "8px" }}
    >
      <h2>Page Settings</h2>

      {error && (
        <div style={{ padding: "10px", backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: "4px", marginBottom: "15px", color: "#c00" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: "10px", backgroundColor: "#efe", border: "1px solid #cfc", borderRadius: "4px", marginBottom: "15px", color: "#060" }}>
          Changes saved successfully
        </div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Title:</strong>
          <br />
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{ width: "100%", padding: "8px", marginTop: "5px", boxSizing: "border-box" }}
            placeholder="Page title"
            required
          />
        </label>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Slug:</strong>
          <br />
          <input
            type="text"
            value={formData.slug}
            style={{ width: "100%", padding: "8px", marginTop: "5px", boxSizing: "border-box" }}
            readOnly
          />
          <small style={{ color: "#666" }}>Slug cannot be changed</small>
        </label>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Description:</strong>
          <br />
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ width: "100%", padding: "8px", marginTop: "5px", minHeight: "80px", boxSizing: "border-box" }}
            placeholder="Page description for SEO"
          />
        </label>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Page Type:</strong>
          <br />
          <select
            value={formData.page_type}
            onChange={(e) => setFormData({ ...formData, page_type: e.target.value })}
            style={{ width: "100%", padding: "8px", marginTop: "5px", boxSizing: "border-box" }}
          >
            {pageTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Status:</strong>
          <br />
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{ width: "100%", padding: "8px", marginTop: "5px", boxSizing: "border-box" }}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "10px 20px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
