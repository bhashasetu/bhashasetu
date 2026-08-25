import sharp from "sharp";
import { keepsAlpha } from "./image-output";

export type ConformResult = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  /** True when the source did not already match the slot's ratio. */
  adjusted: boolean;
  originalWidth: number;
  originalHeight: number;
};

/** Longest edge we store for a slot image. Keeps files small without visible loss. */
const MAX_WIDTH = 2000;

/** How far off a ratio can be before we bother re-cropping (about 1%). */
const RATIO_TOLERANCE = 0.01;

/**
 * An image that carries an alpha channel: trim its empty border, cap its size,
 * keep its shape.
 *
 * sharp's trim() reads the corner pixel as the background, which for a cut-out
 * is transparent, so this removes exactly the invisible padding and nothing
 * else. An image with no such border comes back the same size, and one that is
 * transparent everywhere would trim to nothing — both fall back to the source.
 */
async function conformCutout(
  input: Buffer,
  mimeType: string,
  originalWidth: number,
  originalHeight: number
): Promise<ConformResult> {
  const unchanged = {
    buffer: input,
    width: originalWidth,
    height: originalHeight,
    mimeType,
    adjusted: false,
    originalWidth,
    originalHeight,
  };

  try {
    const trimmed = sharp(input, { failOn: "none" }).rotate().trim();
    const meta = await trimmed.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return unchanged;

    const scale = Math.min(1, MAX_WIDTH / Math.max(width, height));
    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));

    const pipeline =
      scale < 1 ? trimmed.resize(outWidth, outHeight) : trimmed;
    const buffer =
      mimeType === "image/webp"
        ? await pipeline.webp({ quality: 86 }).toBuffer()
        : await pipeline.png({ compressionLevel: 9 }).toBuffer();

    return {
      buffer,
      width: outWidth,
      height: outHeight,
      mimeType: mimeType === "image/webp" ? "image/webp" : "image/png",
      adjusted: outWidth !== originalWidth || outHeight !== originalHeight,
      originalWidth,
      originalHeight,
    };
  } catch {
    // Nothing to trim, or a source sharp cannot re-encode: store as uploaded.
    return unchanged;
  }
}

export function parseAspectRatio(aspectRatio: string | null | undefined) {
  if (!aspectRatio) return null;
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  return w / h;
}

/**
 * Fit an uploaded image to the aspect ratio its media slot expects.
 *
 * An editor should not have to prepare assets by hand: whatever they upload is
 * centre-cropped to the slot's ratio ("cover", so the frame is always filled
 * and nothing is letterboxed) and capped at MAX_WIDTH. An image that already
 * matches the ratio is only re-encoded if it exceeds the cap.
 *
 * Animated GIFs and SVGs are returned untouched — cropping them frame-by-frame
 * or rasterising vector art would do more harm than the ratio mismatch.
 */
export async function conformImageToSlot(
  input: Buffer,
  aspectRatio: string | null | undefined,
  mimeType: string
): Promise<ConformResult> {
  const passthrough = (reason?: string) => ({
    buffer: input,
    width: 0,
    height: 0,
    mimeType,
    adjusted: false,
    originalWidth: 0,
    originalHeight: 0,
    reason,
  });

  if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
    return passthrough();
  }

  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const originalWidth = meta.width ?? 0;
  const originalHeight = meta.height ?? 0;

  if (!originalWidth || !originalHeight) return passthrough();

  // A cut-out is not a photograph and must not be treated like one.
  //
  // Centre-cropping a transparent cut-out to a slot's ratio can slice through
  // the subject, and padding it out to that ratio bakes empty space into the
  // file — which is what left the hero robot floating away from the corner
  // its layout pins it to. The frame was aligned; the artwork inside it was
  // not, and no amount of object-fit could reach the margin because the
  // margin was part of the image.
  //
  // So: trim the fully transparent border so the file's box is the subject,
  // cap the size, and leave the ratio alone. The page then decides where the
  // subject sits (see SlotMedia's fit and objectPosition), which it can only
  // do once the image stops carrying its own invisible padding.
  if (meta.hasAlpha) {
    return conformCutout(input, mimeType, originalWidth, originalHeight);
  }

  const target = parseAspectRatio(aspectRatio);
  const current = originalWidth / originalHeight;
  const ratioMatches =
    target === null || Math.abs(current - target) / target < RATIO_TOLERANCE;
  const withinCap = originalWidth <= MAX_WIDTH;

  if (ratioMatches && withinCap) {
    return {
      buffer: input,
      width: originalWidth,
      height: originalHeight,
      mimeType,
      adjusted: false,
      originalWidth,
      originalHeight,
    };
  }

  // Work out the output box: keep the source's detail, honour the target
  // ratio, and never upscale beyond the original.
  let width: number;
  let height: number;

  if (target === null) {
    width = Math.min(originalWidth, MAX_WIDTH);
    height = Math.round(width / current);
  } else if (current > target) {
    // Source is wider than the slot: height is the limiting dimension.
    height = Math.min(originalHeight, Math.round(MAX_WIDTH / target));
    width = Math.round(height * target);
  } else {
    width = Math.min(originalWidth, MAX_WIDTH);
    height = Math.round(width / target);
  }

  const pipeline = sharp(input, { failOn: "none" })
    .rotate() // honour EXIF orientation before cropping
    .resize(width, height, { fit: "cover", position: "attention" });

  // A format that carries alpha is re-encoded as itself. Sending a
  // transparent WebP down the JPEG branch flattened it onto black, so a
  // cut-out uploaded as WebP came back on a solid rectangle.
  const outputType = keepsAlpha(mimeType) ? mimeType : "image/jpeg";

  const buffer =
    outputType === "image/png"
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : outputType === "image/webp"
        ? await pipeline.webp({ quality: 86 }).toBuffer()
        : await pipeline.jpeg({ quality: 86, mozjpeg: true }).toBuffer();

  return {
    buffer,
    width,
    height,
    mimeType: outputType,
    adjusted: true,
    originalWidth,
    originalHeight,
  };
}
