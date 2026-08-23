"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Select a file first.");
      return;
    }
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    const res = await fetch("/api/admin/media/upload", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed.");
      return;
    }

    setFile(null);
    setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Upload Media</h2>
      <p>Approved formats: audio (.mp3, .m4a, .wav, .ogg), image (.jpg, .png, .webp, .svg)</p>
      <div>
        <label htmlFor="file">File</label>
        <input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={uploading}
          required
        />
      </div>
      <div>
        <label htmlFor="title">Title (optional)</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={uploading}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={uploading}>
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
