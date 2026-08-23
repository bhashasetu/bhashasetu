import type { MediaKind } from "@/lib/media/validate-upload";

const BUCKET_BY_MEDIA_TYPE: Record<MediaKind, string> = {
  audio: "media-audio",
  image: "media-images",
};

export function bucketForMediaType(mediaType: MediaKind): string {
  return BUCKET_BY_MEDIA_TYPE[mediaType];
}

export function buildStoragePath(mediaType: MediaKind, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `${mediaType}/${timestamp}-${random}-${safeName}`;
}
