/**
 * Shared limits for images the browser re-encodes before upload.
 *
 * Both the cropper and the plain-upload downscaler write to a canvas and hand
 * back a File. Keeping the numbers in one place stops the two encoders
 * drifting into producing different-sized output for the same picture.
 */

/** Longest edge, in pixels, of anything we send to storage. */
export const MAX_OUTPUT_WIDTH = 2000;

/** JPEG quality for canvas re-encoding. */
export const OUTPUT_QUALITY = 0.86;

/**
 * Above this, re-encode before uploading.
 *
 * A Vercel serverless function rejects request bodies over 4.5 MB before the
 * route handler runs, and the response is not JSON — so an oversized photo
 * failed with a bare 413 and no explanation. Well under that, to leave room
 * for the multipart envelope.
 */
export const REENCODE_ABOVE_BYTES = 3 * 1024 * 1024;
