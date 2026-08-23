export type MediaKind = "audio" | "image";

const APPROVED_AUDIO_FORMATS: Record<string, string[]> = {
  ".mp3": ["audio/mpeg"],
  ".m4a": ["audio/mp4", "audio/x-m4a"],
  ".wav": ["audio/wav", "audio/x-wav"],
  ".ogg": ["audio/ogg"],
};

const APPROVED_IMAGE_FORMATS: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".svg": ["image/svg+xml"],
};

export const MEDIA_UPLOAD_LIMITS = {
  audio: { maxFileSizeBytes: 50 * 1024 * 1024 }, // 50 MB
  image: { maxFileSizeBytes: 20 * 1024 * 1024 }, // 20 MB
};

export type ValidationResult =
  | { valid: true; mediaType: MediaKind; extension: string }
  | { valid: false; error: string };

function getExtension(filename: string): string | null {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : null;
}

/**
 * Validates a filename + MIME type against the approved allowlist.
 * Extension and MIME type must form an approved pair; server-side only,
 * never trusts client-declared type in isolation.
 */
export function validateMediaUpload(
  filename: string,
  mimeType: string,
  fileSize: number
): ValidationResult {
  const ext = getExtension(filename);
  if (!ext) {
    return { valid: false, error: "File has no extension." };
  }

  if (APPROVED_AUDIO_FORMATS[ext]) {
    if (!APPROVED_AUDIO_FORMATS[ext].includes(mimeType)) {
      return {
        valid: false,
        error: `MIME type mismatch for ${ext}: received ${mimeType}, expected one of [${APPROVED_AUDIO_FORMATS[ext].join(", ")}].`,
      };
    }
    if (fileSize > MEDIA_UPLOAD_LIMITS.audio.maxFileSizeBytes) {
      return { valid: false, error: "Audio file exceeds the 50 MB limit." };
    }
    return { valid: true, mediaType: "audio", extension: ext };
  }

  if (APPROVED_IMAGE_FORMATS[ext]) {
    if (!APPROVED_IMAGE_FORMATS[ext].includes(mimeType)) {
      return {
        valid: false,
        error: `MIME type mismatch for ${ext}: received ${mimeType}, expected one of [${APPROVED_IMAGE_FORMATS[ext].join(", ")}].`,
      };
    }
    if (fileSize > MEDIA_UPLOAD_LIMITS.image.maxFileSizeBytes) {
      return { valid: false, error: "Image file exceeds the 20 MB limit." };
    }
    return { valid: true, mediaType: "image", extension: ext };
  }

  return { valid: false, error: `Unsupported file format: ${ext}` };
}
