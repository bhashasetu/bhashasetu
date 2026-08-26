export type MediaKind = "audio" | "image" | "video";

const APPROVED_AUDIO_FORMATS: Record<string, string[]> = {
  ".mp3": ["audio/mpeg"],
  ".m4a": ["audio/mp4", "audio/x-m4a"],
  ".wav": ["audio/wav", "audio/x-wav"],
  ".ogg": ["audio/ogg"],
};

// Browsers report .mp4 as video/mp4, but some report audio/mp4 for
// audio-only tracks; .m4a already claims audio/mp4, so extension decides.
const APPROVED_VIDEO_FORMATS: Record<string, string[]> = {
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
  ".mov": ["video/quicktime"],
};

const APPROVED_IMAGE_FORMATS: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".svg": ["image/svg+xml"],
};

/**
 * Ceilings the platform can actually honour, not aspirational ones.
 *
 * Supabase enforces a global per-object limit set by the project's plan; this
 * project is on the free plan, where that limit is 50 MB and cannot be raised
 * without upgrading. Video was advertised here as 200 MB, so the Back Office
 * accepted files that storage was always going to refuse.
 */
export const STORAGE_PLAN_LIMIT_BYTES = 50 * 1024 * 1024;

export const MEDIA_UPLOAD_LIMITS = {
  audio: { maxFileSizeBytes: STORAGE_PLAN_LIMIT_BYTES },
  image: { maxFileSizeBytes: 20 * 1024 * 1024 }, // 20 MB
  video: { maxFileSizeBytes: STORAGE_PLAN_LIMIT_BYTES },
};

export type ValidationResult =
  | {
      valid: true;
      mediaType: MediaKind;
      extension: string;
      /**
       * The MIME type to store and to hand to Supabase Storage. Normally the
       * browser's, but when the browser declined to guess this is the
       * extension's canonical type — see acceptableMimeType().
       */
      mimeType: string;
    }
  | { valid: false; error: string };

/**
 * Browsers do not always know a file's type. A .mp4 copied off a camera, or
 * opened on a Windows machine with no codec registered, commonly arrives as
 * "" or "application/octet-stream" — and the exact-match check rejected it as
 * a MIME mismatch even though the extension was on the allowlist.
 *
 * The extension still decides what is allowed. This only stops an unhelpful
 * browser from blocking a file the allowlist already accepts; a file whose
 * bytes do not match its extension still fails downstream, where sharp
 * decodes images and storage rejects malformed objects.
 */
const UNKNOWN_MIME_TYPES = ["", "application/octet-stream", "binary/octet-stream"];

function resolveMimeType(
  declared: string,
  approved: string[]
): { ok: true; mimeType: string } | { ok: false } {
  if (approved.includes(declared)) return { ok: true, mimeType: declared };
  if (UNKNOWN_MIME_TYPES.includes(declared.trim().toLowerCase())) {
    return { ok: true, mimeType: approved[0] };
  }
  return { ok: false };
}

/** Human-readable size for an error message, e.g. "50 MB". */
function mb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

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
    const resolved = resolveMimeType(mimeType, APPROVED_AUDIO_FORMATS[ext]);
    if (!resolved.ok) {
      return {
        valid: false,
        error: `MIME type mismatch for ${ext}: received ${mimeType}, expected one of [${APPROVED_AUDIO_FORMATS[ext].join(", ")}].`,
      };
    }
    if (fileSize > MEDIA_UPLOAD_LIMITS.audio.maxFileSizeBytes) {
      return {
        valid: false,
        error: `That audio file is ${mb(fileSize)}. The project's storage plan accepts up to ${mb(MEDIA_UPLOAD_LIMITS.audio.maxFileSizeBytes)} per file.`,
      };
    }
    return { valid: true, mediaType: "audio", extension: ext, mimeType: resolved.mimeType };
  }

  if (APPROVED_VIDEO_FORMATS[ext]) {
    const resolved = resolveMimeType(mimeType, APPROVED_VIDEO_FORMATS[ext]);
    if (!resolved.ok) {
      return {
        valid: false,
        error: `MIME type mismatch for ${ext}: received ${mimeType}, expected one of [${APPROVED_VIDEO_FORMATS[ext].join(", ")}].`,
      };
    }
    if (fileSize > MEDIA_UPLOAD_LIMITS.video.maxFileSizeBytes) {
      return {
        valid: false,
        error: `That video is ${mb(fileSize)}. The project's storage plan accepts up to ${mb(MEDIA_UPLOAD_LIMITS.video.maxFileSizeBytes)} per file — for anything longer, paste a YouTube or Vimeo link instead.`,
      };
    }
    return { valid: true, mediaType: "video", extension: ext, mimeType: resolved.mimeType };
  }

  if (APPROVED_IMAGE_FORMATS[ext]) {
    const resolved = resolveMimeType(mimeType, APPROVED_IMAGE_FORMATS[ext]);
    if (!resolved.ok) {
      return {
        valid: false,
        error: `MIME type mismatch for ${ext}: received ${mimeType}, expected one of [${APPROVED_IMAGE_FORMATS[ext].join(", ")}].`,
      };
    }
    if (fileSize > MEDIA_UPLOAD_LIMITS.image.maxFileSizeBytes) {
      return {
        valid: false,
        error: `That image is ${mb(fileSize)}. Images are accepted up to ${mb(MEDIA_UPLOAD_LIMITS.image.maxFileSizeBytes)}.`,
      };
    }
    return { valid: true, mediaType: "image", extension: ext, mimeType: resolved.mimeType };
  }

  return { valid: false, error: `Unsupported file format: ${ext}` };
}
