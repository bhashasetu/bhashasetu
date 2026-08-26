"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a recording from the browser straight to Supabase Storage.
 *
 * A Vercel serverless function rejects request bodies over 4.5 MB before the
 * handler runs, so posting a video to /api/admin/media/upload could never
 * work — the editor just saw an opaque 413. Here the server only mints a
 * one-object upload token and, afterwards, records the asset; the bytes go
 * direct.
 *
 * Images deliberately keep the old route: they are conformed to their slot's
 * aspect ratio by sharp, which needs them server-side.
 */
export type DirectUploadOptions = {
  slotId?: string | null;
  /** Publish the asset when there is no slot to publish it. */
  publish?: boolean;
  consentStatus?: string | null;
  title?: string | null;
  altText?: string | null;
  /** Progress between 0 and 1, for a long upload over a slow connection. */
  onProgress?: (fraction: number) => void;
};

export type DirectUploadResult =
  | { ok: true; asset: { id: string; [key: string]: unknown } }
  | { ok: false; error: string };

export async function uploadMediaDirect(
  file: File,
  options: DirectUploadOptions = {}
): Promise<DirectUploadResult> {
  // 1. Ask the server for a token. It validates the name, type and size, so
  //    an oversized file is refused before a single byte is transferred.
  const signRes = await fetch("/api/admin/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    }),
  });

  const signBody = await signRes.json().catch(() => ({}));
  if (!signRes.ok) {
    return { ok: false, error: signBody.error ?? `Could not start the upload (${signRes.status})` };
  }

  const { bucket, path, token, mimeType } = signBody.data;

  // 2. Send the file to Supabase. Nothing of this passes through Vercel.
  options.onProgress?.(0);
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: mimeType });

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }
  options.onProgress?.(1);

  // 3. Record it. The server confirms the object really landed before
  //    creating the row, so an interrupted upload leaves nothing behind.
  const registerRes = await fetch("/api/admin/media/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket,
      path,
      filename: file.name,
      mime_type: mimeType,
      file_size: file.size,
      slot_id: options.slotId ?? null,
      publish: options.publish ?? false,
      consent_status: options.consentStatus ?? null,
      title: options.title ?? null,
      alt_text: options.altText ?? null,
    }),
  });

  const registerBody = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok) {
    return {
      ok: false,
      error: registerBody.error ?? `Uploaded, but could not be saved (${registerRes.status})`,
    };
  }

  return { ok: true, asset: registerBody.data };
}

/** Attach a hosted video (YouTube/Vimeo) instead of uploading a file. */
export async function attachVideoLink(
  url: string,
  options: { slotId?: string | null; title?: string | null } = {}
): Promise<DirectUploadResult> {
  const res = await fetch("/api/admin/media/external", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      slot_id: options.slotId ?? null,
      title: options.title ?? null,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body.error ?? `Could not attach the link (${res.status})` };
  }
  return { ok: true, asset: body.data };
}

/** True when this file should bypass the server route. */
export function shouldUploadDirect(file: File): boolean {
  return /\.(mp4|webm|mov|mp3|m4a|wav|ogg)$/i.test(file.name);
}
