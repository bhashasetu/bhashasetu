"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_OUTPUT_WIDTH = 2000;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const PREVIEW_WIDTH = 380;
/** Letterbox fill for the area left empty when zoomed out past "cover". */
const MATTE = "#ffffff";

function parseRatio(aspectRatio: string): number {
  const [w, h] = aspectRatio.split(":").map(Number);
  return w && h ? w / h : 1;
}

/**
 * Lets an editor choose how an uploaded image fills its slot, rather than
 * always taking whatever the automatic centre-crop picks. Zoom moves between
 * "fit the whole frame" (minimum) and 4x that; drag repositions within the
 * frame. On confirm, the visible crop is rendered to a canvas at up to
 * MAX_OUTPUT_WIDTH and handed back as a File ready to upload — the same
 * ratio the server's own conform step enforces, so that step becomes a
 * no-op safety net rather than doing the cropping itself.
 *
 * Position and zoom are only ever changed imperatively (an image-load
 * callback, a drag handler, a zoom control) — never derived via an effect
 * that re-clamps state in response to another state change, which is the
 * synchronous-setState-in-effect pattern React's own lint rule flags.
 */
export function ImageCropper({
  file,
  aspectRatio,
  onConfirm,
  onCancel,
}: {
  file: File;
  aspectRatio: string;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}) {
  const ratio = useMemo(() => parseRatio(aspectRatio), [aspectRatio]);
  const previewHeight = Math.round(PREVIEW_WIDTH / ratio);

  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Load the picked file into an <img>; centre it the moment it decodes.
  // This setState happens inside the image's own load callback — an
  // external system notifying us, the sanctioned use of an effect — not
  // synchronously in the effect body itself.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const bs = Math.max(
        PREVIEW_WIDTH / img.naturalWidth,
        previewHeight / img.naturalHeight
      );
      setPos({
        left: (PREVIEW_WIDTH - img.naturalWidth * bs) / 2,
        top: (previewHeight - img.naturalHeight * bs) / 2,
      });
      setImgEl(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, previewHeight]);

  // zoom 1 == "cover" (frame filled, overflow cropped). minZoom reaches
  // "contain" (whole image visible, letterboxed), so the editor can shrink
  // the image as well as enlarge it.
  const coverScale = imgEl
    ? Math.max(PREVIEW_WIDTH / imgEl.naturalWidth, previewHeight / imgEl.naturalHeight)
    : 1;
  const containScale = imgEl
    ? Math.min(PREVIEW_WIDTH / imgEl.naturalWidth, previewHeight / imgEl.naturalHeight)
    : 1;
  // Rounded down to 2dp so the slider's 0.01 step grid lands on it exactly;
  // rounding down only ever shows slightly more of the frame, never less.
  const minZoom =
    coverScale > 0 ? Math.floor((containScale / coverScale) * 100) / 100 : 1;

  const baseScale = coverScale;
  const scale = baseScale * zoom;
  const scaledW = imgEl ? imgEl.naturalWidth * scale : 0;
  const scaledH = imgEl ? imgEl.naturalHeight * scale : 0;

  function clampAt(left: number, top: number, w: number, h: number) {
    // An axis smaller than the frame (zoomed out past cover) is centred
    // rather than pinned to an edge.
    const l =
      w <= PREVIEW_WIDTH
        ? (PREVIEW_WIDTH - w) / 2
        : Math.min(0, Math.max(PREVIEW_WIDTH - w, left));
    const t =
      h <= previewHeight
        ? (previewHeight - h) / 2
        : Math.min(0, Math.max(previewHeight - h, top));
    return { left: l, top: t };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pos.left,
      startTop: pos.top,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { startX, startY, startLeft, startTop } = dragRef.current;
    setPos(
      clampAt(
        startLeft + (e.clientX - startX),
        startTop + (e.clientY - startY),
        scaledW,
        scaledH
      )
    );
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  // Zoom and position change together here, in the handler that owns the
  // change — not split across a setState-plus-reactive-effect pair.
  function setZoomClamped(nextZoom: number) {
    if (!imgEl) {
      setZoom(nextZoom);
      return;
    }
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(minZoom, nextZoom));
    const nextScale = baseScale * clampedZoom;
    const nextW = imgEl.naturalWidth * nextScale;
    const nextH = imgEl.naturalHeight * nextScale;
    setZoom(clampedZoom);
    setPos((p) => clampAt(p.left, p.top, nextW, nextH));
  }

  function handleConfirm() {
    if (!imgEl) return;

    // Convert the visible frame back into natural-image pixel coordinates.
    const srcX = -pos.left / scale;
    const srcY = -pos.top / scale;
    const srcW = PREVIEW_WIDTH / scale;
    const srcH = previewHeight / scale;

    const outW = Math.min(Math.round(srcW), MAX_OUTPUT_WIDTH);
    const outH = Math.round(outW / ratio);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Zoomed out past cover, part of the frame has no image behind it.
    ctx.fillStyle = MATTE;
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    const isPng = file.type === "image/png";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], file.name, { type: blob.type }));
      },
      isPng ? "image/png" : "image/jpeg",
      0.86
    );
  }

  return (
    <div className="cropper">
      <div
        className="cropper__frame"
        style={{ width: PREVIEW_WIDTH, height: previewHeight }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {imgEl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgEl.src}
            alt=""
            draggable={false}
            onPointerDown={handlePointerDown}
            className="cropper__image"
            style={{
              width: scaledW,
              height: scaledH,
              transform: `translate(${pos.left}px, ${pos.top}px)`,
            }}
          />
        )}
      </div>

      <div className="cropper__controls">
        <span className="cropper__zoom-label">Zoom</span>
        <button
          type="button"
          className="admin-btn admin-btn--ghost cropper__zoom-btn"
          onClick={() => setZoomClamped(zoom - ZOOM_STEP)}
          disabled={zoom <= minZoom + 0.001}
          aria-label="Decrease zoom"
        >
          −
        </button>
        <input
          type="range"
          min={minZoom}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomClamped(Number(e.target.value))}
          aria-label="Zoom level"
        />
        <button
          type="button"
          className="admin-btn admin-btn--ghost cropper__zoom-btn"
          onClick={() => setZoomClamped(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Increase zoom"
        >
          +
        </button>
      </div>
      <p className="hp-row__hint">
        Drag the image to reposition it. Zoom in to crop tighter, or out to
        fit more of the image in — at the lowest setting the whole image fits,
        with white filling the rest of the frame.
      </p>

      <div className="cropper__actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={handleConfirm}
          disabled={!imgEl}
        >
          Use this crop
        </button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
