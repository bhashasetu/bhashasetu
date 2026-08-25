"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Click the point that must stay in shot.
 *
 * Every slot on the site crops its image to a different ratio at a different
 * size, and the crop happens in the browser at render time. This is the one
 * number pair that steers all of them: object-position, so whatever the frame,
 * the browser keeps this point visible.
 *
 * It replaces per-slot cropping, which decided framing once at upload and
 * threw away the pixels outside it. One click here re-frames the asset
 * everywhere it is used — including slots that do not exist yet — and changes
 * no bytes, so it is fully reversible.
 */
export function FocalPointPicker({
  assetId,
  alt,
  initialX,
  initialY,
  initialFit,
  aspectRatio,
}: {
  assetId: string;
  alt?: string;
  initialX: number;
  initialY: number;
  initialFit: "cover" | "contain";
  /** The slot this is being edited from, so the preview crops as that slot will. */
  aspectRatio?: string | null;
}) {
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [fit, setFit] = useState<"cover" | "contain">(initialFit);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const frameRef = useRef<HTMLButtonElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Same signed-URL endpoint the plain preview uses, so a draft asset is
  // visible here too — an editor frames an image before publishing it.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/media/${assetId}/signed-url`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        if (!cancelled) setImageUrl(body.data?.url ?? null);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // Clear the "Saved" note without leaving a timer running after unmount.
  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  async function save(nextX: number, nextY: number, nextFit: "cover" | "contain") {
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/media/${assetId}/framing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focal_x: Number(nextX.toFixed(3)),
          focal_y: Number(nextY.toFixed(3)),
          fit: nextFit,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? `Could not save (${res.status})`);
        return;
      }
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not save");
    }
  }

  function pick(clientX: number, clientY: number) {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return;
    const nextX = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const nextY = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
    setX(nextX);
    setY(nextY);
    void save(nextX, nextY, fit);
  }

  // Arrow keys nudge, so the control is usable without a pointer.
  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const nextX = Math.min(1, Math.max(0, x + move[0]));
    const nextY = Math.min(1, Math.max(0, y + move[1]));
    setX(nextX);
    setY(nextY);
    void save(nextX, nextY, fit);
  }

  const [w, h] = (aspectRatio ?? "4:3").split(":").map(Number);
  const paddingBottom = w && h ? `${(h / w) * 100}%` : "75%";

  if (!imageUrl) {
    return (
      <div className="admin-preview admin-preview--loading" />
    );
  }

  return (
    <div className="focal">
      <button
        type="button"
        ref={frameRef}
        className="focal__frame"
        style={{ paddingBottom }}
        onClick={(e) => pick(e.clientX, e.clientY)}
        onKeyDown={handleKeyDown}
        aria-label={`Set the focal point for ${alt || "this image"}. Click the part that must stay in shot, or use the arrow keys.`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt ?? ""}
          className="focal__img"
          style={{ objectFit: fit, objectPosition: `${x * 100}% ${y * 100}%` }}
        />
        <span
          className="focal__marker"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          aria-hidden="true"
        />
      </button>

      <div className="focal__controls">
        <label className="focal__fit">
          <span>Fills the frame</span>
          <input
            type="checkbox"
            checked={fit === "cover"}
            onChange={(e) => {
              const next = e.target.checked ? "cover" : "contain";
              setFit(next);
              void save(x, y, next);
            }}
          />
        </label>
        <span className="focal__readout">
          {Math.round(x * 100)}% · {Math.round(y * 100)}%
        </span>
        {status === "saving" && <span className="focal__status">Saving…</span>}
        {status === "saved" && (
          <span className="focal__status focal__status--ok">Saved</span>
        )}
        {status === "error" && (
          <span className="focal__status focal__status--error">
            {message ?? "Could not save"}
          </span>
        )}
      </div>

      <p className="focal__hint">
        Click the part that must stay visible — a face, usually. Every page
        crops around it, so one upload frames correctly everywhere.
        {fit === "contain"
          ? " Uncropped: the whole image is shown and the point decides where it sits."
          : ""}
      </p>
    </div>
  );
}
