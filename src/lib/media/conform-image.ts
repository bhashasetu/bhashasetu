import sharp from "sharp";

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

  const isPng = mimeType === "image/png";
  const pipeline = sharp(input, { failOn: "none" })
    .rotate() // honour EXIF orientation before cropping
    .resize(width, height, { fit: "cover", position: "attention" });

  const buffer = isPng
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 86, mozjpeg: true }).toBuffer();

  return {
    buffer,
    width,
    height,
    mimeType: isPng ? "image/png" : "image/jpeg",
    adjusted: true,
    originalWidth,
    originalHeight,
  };
}
