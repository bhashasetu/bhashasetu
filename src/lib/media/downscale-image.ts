"use client";

import {
  MAX_OUTPUT_WIDTH,
  OUTPUT_QUALITY,
  REENCODE_ABOVE_BYTES,
  keepsAlpha,
} from "./image-output";

/**
 * Shrinks an oversized image in the browser before it is uploaded.
 *
 * Images still go through the server route, because sharp fits them to their
 * slot's aspect ratio and needs the bytes. That route sits behind Vercel's
 * 4.5 MB request-body limit, which the platform enforces before the handler
 * runs — so a 6-8 MB phone photo failed with an opaque 413. Rather than
 * rejecting those, they are re-encoded down to the same ceiling the cropper
 * already applies.
 *
 * Anything already small enough is returned untouched, so a file that would
 * have worked is byte-identical to before.
 */
export async function downscaleImage(file: File): Promise<File> {
  // An SVG has no raster size to reduce, and rasterising it would destroy the
  // reason to use one.
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= REENCODE_ABOVE_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Undecodable here is not necessarily undecodable by sharp; let the
    // server have its say rather than blocking the upload.
    return file;
  }

  const scale = Math.min(1, MAX_OUTPUT_WIDTH / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // A format with alpha keeps its transparency; everything else becomes JPEG,
  // which is what makes a large photograph small.
  const alpha = keepsAlpha(file.type);
  const outputType = alpha ? file.type : "image/jpeg";

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, OUTPUT_QUALITY)
  );

  if (!blob) return file;

  // A re-encode can occasionally come out larger (a small PNG of flat colour,
  // say). Keep whichever is smaller.
  if (blob.size >= file.size) return file;

  const name = alpha
    ? file.name
    : file.name.replace(/\.[^.]+$/, "") + ".jpg";

  return new File([blob], name, { type: outputType });
}
