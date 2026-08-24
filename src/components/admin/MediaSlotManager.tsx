"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { ImageCropper } from "./ImageCropper";

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

const PROVIDER_KEY: Record<string, string> = {
  openai: "openai",
  "fal.ai": "fal.ai",
  flux: "fal.ai",
};

export function MediaSlotManager({ slot, onUpdate }: { slot: MediaSlot; onUpdate: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [generatingProvider, setGeneratingProvider] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Staged for the crop control: an image slot with a fixed ratio lets the
  // editor choose the crop instead of always taking the automatic one.
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
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

  const currentAssignment = slot.slot_media_assignments?.[0] ?? null;

  const handleGenerateImage = async (provider: string, promptId: string) => {
    setGenerating(true);
    setGeneratingProvider(provider);
    setError(null);

    try {
      const res = await fetch("/api/admin/media-slots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: slot.id, provider, promptId }),
      });

      if (res.ok) {
        setNotice("Generated. Review it in Media before it can be attached here.");
        onUpdate();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGeneratingProvider(null);
    }
  };

  const uploadFile = async (file: File) => {
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
    }
  };

  // An image slot with a fixed ratio gets the crop control, so the editor
  // decides which part of the photo fills the frame. Anything else (video,
  // audio, or a slot with no required ratio) uploads directly, as before.
  const canCropUpload = slot.media_type === "image" && !!slot.aspect_ratio;

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    setNotice(null);

    if (canCropUpload) {
      setPendingCropFile(file);
    } else {
      uploadFile(file);
    }
  };

  const handleCropConfirm = (cropped: File) => {
    setPendingCropFile(null);
    uploadFile(cropped);
  };

  const handleSavePromptEdit = async (promptId: string) => {
    try {
      const res = await fetch("/api/admin/generation-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promptId, prompt_text: promptText }),
      });

      if (res.ok) {
        setEditingPromptId(null);
        onUpdate();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not save prompt");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prompt");
    }
  };

  return (
    <div className="slotmgr">
      <div className="slotmgr__top">
        <div className="slotmgr__preview">
          {currentAssignment ? (
            <AdminMediaPreview
              key={currentAssignment.media_asset.id}
              assetId={currentAssignment.media_asset.id}
              mediaType={slot.media_type}
              label={currentAssignment.media_asset.title || currentAssignment.media_asset.filename}
            />
          ) : (
            <div className="admin-preview admin-preview--empty">
              <span>No media attached</span>
            </div>
          )}
        </div>

        <div className="slotmgr__meta">
          {currentAssignment ? (
            <>
              <p className="slotmgr__filename">
                {currentAssignment.media_asset.title || currentAssignment.media_asset.filename}
              </p>
              <span
                className={`admin-pill admin-pill--${currentAssignment.media_asset.status}`}
              >
                {currentAssignment.media_asset.status}
              </span>
            </>
          ) : (
            <p className="slotmgr__filename slotmgr__filename--empty">
              This slot has no media yet.
            </p>
          )}
        </div>
      </div>

      <div className="slotmgr__section">
        <h3 className="slotmgr__heading">Upload media</h3>

        {pendingCropFile ? (
          <ImageCropper
            file={pendingCropFile}
            aspectRatio={slot.aspect_ratio!}
            onConfirm={handleCropConfirm}
            onCancel={() => setPendingCropFile(null)}
          />
        ) : (
          <div className="hp-row">
            <label className="hp-row__label" htmlFor="slot-upload">
              File
            </label>
            <div className="hp-row__control">
              <input
                id="slot-upload"
                type="file"
                accept={slot.media_type === "image" ? "image/*" : undefined}
                onChange={handleFileSelected}
                disabled={uploadingFile}
              />
              {canCropUpload ? (
                <p className="hp-row__hint">
                  Any size is fine — you&apos;ll choose how it crops to{" "}
                  {slot.aspect_ratio} on the next step.
                </p>
              ) : (
                slot.aspect_ratio && (
                  <p className="hp-row__hint">
                    Any size is fine — the image is centre-cropped to{" "}
                    {slot.aspect_ratio} automatically.
                  </p>
                )
              )}
              {uploadingFile && <p className="slotmgr__status">Uploading…</p>}
              {notice && <p className="slotmgr__status slotmgr__status--ok">{notice}</p>}
              {error && <p className="slotmgr__status slotmgr__status--error">{error}</p>}
            </div>
          </div>
        )}
      </div>

      {slot.generation_prompts && slot.generation_prompts.length > 0 && (
        <div className="slotmgr__section">
          <h3 className="slotmgr__heading">Create with AI</h3>

          {configured !== null && configured.length === 0 && (
            <p className="slotmgr__status slotmgr__status--warn">
              No image generation provider is configured. Set OPENAI_API_KEY or
              FAL_AI_KEY in the Vercel project settings.
            </p>
          )}
          {configured !== null && configured.length > 0 && (
            <p className="slotmgr__status slotmgr__status--ok">
              Configured: {configured.join(", ")}
            </p>
          )}

          {slot.generation_prompts.map((prompt) => {
            const providerKey = PROVIDER_KEY[prompt.provider] ?? prompt.provider;
            const providerReady =
              configured !== null && configured.includes(providerKey);

            return (
              <div className="slotmgr__prompt" key={prompt.id}>
                <div className="slotmgr__prompt-head">
                  <strong>{prompt.provider}</strong>
                  {prompt.model_name && <span> ({prompt.model_name})</span>}
                </div>

                {editingPromptId === prompt.id ? (
                  <div className="slotmgr__prompt-edit">
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={4}
                    />
                    <div className="slotmgr__prompt-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() => handleSavePromptEdit(prompt.id)}
                      >
                        Save Prompt
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        onClick={() => setEditingPromptId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="slotmgr__prompt-text">{prompt.prompt_text}</p>
                    <div className="slotmgr__prompt-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary"
                        onClick={() =>
                          handleGenerateImage(prompt.provider, prompt.id)
                        }
                        disabled={generating || configured === null || !providerReady}
                        title={
                          configured !== null && !providerReady
                            ? `${providerKey} is not configured on this deployment`
                            : undefined
                        }
                      >
                        {generating && generatingProvider === prompt.provider
                          ? "Generating…"
                          : `Generate with ${prompt.provider}`}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        onClick={() => {
                          setEditingPromptId(prompt.id);
                          setPromptText(prompt.prompt_text);
                        }}
                        disabled={generating}
                      >
                        Edit Prompt
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
