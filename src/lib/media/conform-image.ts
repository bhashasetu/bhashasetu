import sharp from "sharp";
import { keepsAlpha } from "./image-output";

export type ConformResult = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  /** True when the bytes were re-encoded rather than stored as uploaded. */
  adjusted: boolean;
  originalWidth: number;
  originalHeight: number;
  /**
   * How this image should fill a frame. A photograph covers it and may be
   * cropped; a cut-out, which has transparency, must be seen whole. Stored on
   * the asset as its default and overridable by an editor.
   */
  fit: "cover" | "contain";
};

/** Longest edge we store for a slot image. Keeps files small without visible loss. */
const MAX_WIDTH = 2000;

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
    fit: "contain" as const,
  };

  try {
    // toBuffer reports the dimensions of what was actually produced.
    // metadata() would not: on an unexecuted pipeline it describes the source,
    // so a trimmed cut-out recorded its untrimmed size against the asset.
    const { data, info } = await sharp(input, { failOn: "none" })
      .rotate()
      .trim()
      .toBuffer({ resolveWithObject: true });

    if (!info.width || !info.height) return unchanged;

    const scale = Math.min(1, MAX_WIDTH / Math.max(info.width, info.height));
    let buffer = data;
    let outWidth = info.width;
    let outHeight = info.height;

    if (scale < 1) {
      outWidth = Math.max(1, Math.round(info.width * scale));
      outHeight = Math.max(1, Math.round(info.height * scale));
      const resized = sharp(data, { failOn: "none" }).resize(outWidth, outHeight);
      buffer =
        mimeType === "image/webp"
          ? await resized.webp({ quality: 86 }).toBuffer()
          : await resized.png({ compressionLevel: 9 }).toBuffer();
    } else if (mimeType === "image/webp") {
      // trim() emits the input format; keep WebP as WebP.
      buffer = await sharp(data, { failOn: "none" }).webp({ quality: 86 }).toBuffer();
    }

    return {
      buffer,
      width: outWidth,
      height: outHeight,
      mimeType: mimeType === "image/webp" ? "image/webp" : "image/png",
      adjusted: outWidth !== originalWidth || outHeight !== originalHeight,
      originalWidth,
      originalHeight,
      fit: "contain" as const,
    };
  } catch {
    // Nothing to trim, or a source sharp cannot re-encode: store as uploaded.
    return unchanged;
  }
}

/**
 * Prepare an uploaded image for storage.
 *
 * Deliberately minimal: cap the size, keep the shape, and say which kind of
 * image it is. It takes no aspect ratio, because framing is no longer decided
 * here — the browser crops around the asset's focal point at render time, so
 * one stored file serves every slot and every viewport.
 *
 * Animated GIFs and SVGs are returned untouched: rasterising vector art or
 * re-encoding frame by frame would do more harm than good.
 */
export async function conformImage(
  input: Buffer,
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
    fit: "cover" as const,
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

  // A photograph: cap the size, keep the shape.
  //
  // This used to centre-crop to the slot's aspect ratio. That decided the
  // framing once, permanently, against whichever slot the file was first
  // uploaded to — pixels thrown away, one ratio locked in, and the choice of
  // what to keep left to sharp's saliency guess. A speaker standing off to one
  // side could simply lose their head, and an editor had no way to correct it
  // short of preparing a new file by hand.
  //
  // The crop now happens in the browser, every time the image is drawn, around
  // the asset's focal point (media_assets.focal_x / focal_y). One upload
  // therefore frames correctly in every slot it is used in and at every
  // viewport, including slots that do not exist yet — which is what the ratio
  // crop made impossible.
  const withinCap = Math.max(originalWidth, originalHeight) <= MAX_WIDTH;

  if (withinCap) {
    return {
      buffer: input,
      width: originalWidth,
      height: originalHeight,
      mimeType,
      adjusted: false,
      originalWidth,
      originalHeight,
      fit: "cover" as const,
    };
  }

  const scale = MAX_WIDTH / Math.max(originalWidth, originalHeight);
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const pipeline = sharp(input, { failOn: "none" })
    .rotate() // honour EXIF orientation
    .resize(width, height);

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
    fit: "cover" as const,
  };
}
