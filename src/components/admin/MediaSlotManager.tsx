"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

type MediaSlot = {
  id: string;
  slot_key: string;
  media_type: string;
  aspect_ratio?: string;
  generation_prompts: Array<{
    id: string;
    provider: string;
    prompt_text: string;
    model_name?: string;
  }>;
  slot_media_assignments: Array<{
    id: string;
    media_asset: {
      id: string;
      filename: string;
      title?: string;
      status: string;
    };
  }>;
};

export function MediaSlotManager({ slot, onUpdate }: { slot: MediaSlot; onUpdate: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [generatingProvider, setGeneratingProvider] = useState<
    "openai" | "fal.ai" | null
  >(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Key presence can only be known on the server; a client component reading
  // process.env.OPENAI_API_KEY always sees undefined.
  const [configured, setConfigured] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/image-providers")
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((b) => {
        if (cancelled) return;
        setConfigured(
          (b.providers ?? [])
            .filter((p: { configured: boolean }) => p.configured)
            .map((p: { name: string }) => p.name)
        );
      })
      .catch(() => !cancelled && setConfigured([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerateImage = async (
    provider: "openai" | "fal.ai",
    promptId: string
  ) => {
    setGenerating(true);
    setGeneratingProvider(provider);

    try {
      const res = await fetch("/api/admin/media-slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          provider,
          promptId,
        }),
      });

      if (res.ok) {
        onUpdate();
      } else {
        const error = await res.json();
        console.error("Generation failed:", error);
        alert(`Generation failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate image");
    } finally {
      setGenerating(false);
      setGeneratingProvider(null);
    }
  };

  const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("media_type", slot.media_type);
    formData.append("slot_id", slot.id);

    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface the server's reason instead of a bare "Upload failed".
        setError(body.error ?? `Upload failed (${res.status})`);
        return;
      }

      setNotice(
        body.adjusted
          ? `Uploaded and cropped to ${slot.aspect_ratio ?? "the slot ratio"}.`
          : "Uploaded and attached to this slot."
      );
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFile(false);
      // Allow re-selecting the same file after a failure.
      e.target.value = "";
    }
  };

  const handleSavePromptEdit = async (promptId: string) => {
    try {
      const res = await fetch("/api/admin/generation-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: promptId,
          prompt_text: promptText,
        }),
      });

      if (res.ok) {
        setEditingPromptId(null);
        onUpdate();
      }
    } catch (error) {
      alert("Failed to save prompt");
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "20px", margin: "10px 0" }}>
      <h4>{slot.slot_key}</h4>
      <p>
        Type: {slot.media_type} | Aspect Ratio: {slot.aspect_ratio || "not specified"}
      </p>

      {/* Current Media */}
      {slot.slot_media_assignments && slot.slot_media_assignments.length > 0 && (
        <div>
          <h5>Current Media</h5>
          <ul>
            {slot.slot_media_assignments.map((assignment) => (
              <li key={assignment.id}>
                {assignment.media_asset.title || assignment.media_asset.filename}
                <br />
                <small>Status: {assignment.media_asset.status}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual Upload */}
      <div style={{ marginTop: "15px" }}>
        <label>
          Upload Media:
          <input
            type="file"
            onChange={handleUploadFile}
            disabled={uploadingFile}
          />
        </label>
        {uploadingFile && <span> Uploading…</span>}
        {slot.aspect_ratio && (
          <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
            Any size is fine — the image is centre-cropped to{" "}
            {slot.aspect_ratio} automatically.
          </p>
        )}
        {notice && <p style={{ color: "#1E7A3C", fontSize: 13 }}>{notice}</p>}
        {error && <p style={{ color: "#B3261E", fontSize: 13 }}>{error}</p>}
      </div>

      {/* Generation Prompts */}
      {slot.generation_prompts && slot.generation_prompts.length > 0 && (
        <div style={{ marginTop: "15px" }}>
          <h5>Generate Image</h5>

          {configured !== null && configured.length === 0 && (
            <p style={{ color: "#B3781A" }}>
              No image generation provider is configured. Set OPENAI_API_KEY or
              FAL_AI_KEY in the Vercel project settings.
            </p>
          )}
          {configured !== null && configured.length > 0 && (
            <p style={{ color: "#1E7A3C", fontSize: 13 }}>
              Configured: {configured.join(", ")}
            </p>
          )}

          {slot.generation_prompts.map((prompt) => (
            <div
              key={prompt.id}
              style={{
                border: "1px solid #e0e0e0",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "4px",
              }}
            >
              <div>
                <strong>{prompt.provider}</strong>
                {prompt.model_name && <span> ({prompt.model_name})</span>}
              </div>

              {editingPromptId === prompt.id ? (
                <div>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    rows={4}
                    style={{ width: "100%", marginTop: "5px" }}
                  />
                  <div style={{ marginTop: "5px" }}>
                    <button
                      onClick={() => handleSavePromptEdit(prompt.id)}
                      disabled={generating}
                    >
                      Save Prompt
                    </button>
                    <button
                      onClick={() => setEditingPromptId(null)}
                      style={{ marginLeft: "5px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "14px", margin: "5px 0" }}>
                    {prompt.prompt_text}
                  </p>
                  <div>
                    <button
                      onClick={() => handleGenerateImage(
                        prompt.provider as "openai" | "fal.ai",
                        prompt.id
                      )}
                      disabled={
                        generating ||
                        (prompt.provider === "openai" &&
                          !process.env.OPENAI_API_KEY) ||
                        ((prompt.provider === "fal.ai" ||
                          prompt.provider === "flux") &&
                          !process.env.FAL_AI_KEY)
                      }
                    >
                      {generating && generatingProvider === prompt.provider
                        ? "Generating..."
                        : `Generate with ${prompt.provider}`}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPromptId(prompt.id);
                        setPromptText(prompt.prompt_text);
                      }}
                      style={{ marginLeft: "5px" }}
                      disabled={generating}
                    >
                      Edit Prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
