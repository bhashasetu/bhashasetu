/**
 * Recognises a hosted video URL and works out how to embed it.
 *
 * Deterministic parsing, no dependency and no network call (CLAUDE.md
 * sections 18 and 23) — the URL shapes are small, stable and easy to test.
 *
 * A URL that is not recognised returns null rather than being embedded on
 * faith: dropping an arbitrary address into an iframe would let an editor
 * frame any site on a public page.
 */

export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  id: string;
  /** Privacy-preserving player URL, safe to put in an iframe src. */
  embedUrl: string;
  /** Canonical page for the video, for a plain link fallback. */
  watchUrl: string;
};

const YOUTUBE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
];

const VIMEO_HOSTS = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];

/** YouTube ids are exactly 11 chars from a fixed alphabet. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

export function parseVideoUrl(input: string): VideoEmbed | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // Only ever embed over https; an http embed would be blocked as mixed
  // content anyway, and other schemes have no business in an iframe.
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.includes(host)) {
    const id = youtubeId(url, host);
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return {
      provider: "youtube",
      id,
      // nocookie: no tracking cookie is set until the viewer presses play.
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  if (VIMEO_HOSTS.includes(host)) {
    const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!VIMEO_ID.test(id)) return null;
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`,
      watchUrl: `https://vimeo.com/${id}`,
    };
  }

  return null;
}

function youtubeId(url: URL, host: string): string | null {
  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  const watchId = url.searchParams.get("v");
  if (watchId) return watchId;

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const segments = url.pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    ["embed", "shorts", "live", "v"].includes(segments[0])
  ) {
    return segments[1];
  }

  return null;
}

/** True when a media asset row is a hosted video rather than a stored file. */
export function isExternalAsset(asset: {
  source_type?: string | null;
  source_url?: string | null;
}): boolean {
  return asset.source_type === "external" && !!asset.source_url;
}
