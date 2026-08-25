import { parseVideoUrl } from "@/lib/media/video-embed";

/**
 * Server-rendered counterpart to MediaSlotImage.
 *
 * MediaSlotImage fetches its URL from an API route inside useEffect, so no
 * media URL ever appears in the server-rendered HTML — invisible to search
 * crawlers and to the Open Graph scrapers that never run JavaScript. This
 * component takes an already-resolved URL (see resolveSlotUrls) and emits the
 * same markup and class names, so existing CSS applies unchanged while the
 * <img src> is present in the initial response.
 *
 * A slot with no approved asset still holds its exact space: the placeholder
 * uses the slot's aspect ratio so the layout never shifts or collapses when
 * media is later attached in the Back Office.
 */
function ratioToPadding(aspectRatio?: string | null): string | undefined {
  if (!aspectRatio) return undefined;
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) return undefined;
  return `${(h / w) * 100}%`;
}

export function SlotMedia({
  url,
  sourceUrl,
  altText,
  aspectRatio,
  label,
  mediaType = "image",
  className,
  priority = false,
  fit = "cover",
  objectPosition,
}: {
  /** Resolved signed URL, or null while the slot is still empty. */
  url: string | null;
  /**
   * For a hosted video (YouTube/Vimeo) there is no stored object; this is the
   * address it lives at. Storage on this plan caps a file at 50 MB, so a
   * full-length interview is linked rather than uploaded.
   */
  sourceUrl?: string | null;
  altText?: string;
  aspectRatio?: string | null;
  /** Short human label for the empty state, e.g. "Warli illustration". */
  label?: string;
  mediaType?: string;
  className?: string;
  /** Set on the one above-the-fold image so it is not lazy-loaded. */
  priority?: boolean;
  /**
   * How the image fills its frame.
   *
   * "cover" is right for a photograph, which should fill the frame with no
   * gaps and may be cropped to do it. It is wrong for a cut-out on a
   * transparent background: the subject does not reach the edges of its own
   * file, so pinning the frame to a corner leaves the subject floating away
   * from that corner — the frame is aligned and the artwork is not.
   *
   * "contain" shows the whole subject, and objectPosition then anchors it
   * where the composition wants it, so the transparent margin collapses
   * against the edges instead of pushing the subject inward.
   */
  fit?: "cover" | "contain";
  /** e.g. "bottom right". Pairs with fit="contain" to anchor a cut-out. */
  objectPosition?: string;
}) {
  const paddingBottom = ratioToPadding(aspectRatio);
  const frameStyle: React.CSSProperties = paddingBottom
    ? { position: "relative", width: "100%", paddingBottom }
    : { position: "relative", width: "100%", height: "100%" };

  const fillStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };

  const frameClass = className ? `media-slot ${className}` : "media-slot";

  const embed = sourceUrl ? parseVideoUrl(sourceUrl) : null;
  if (embed) {
    return (
      <div className={frameClass} style={frameStyle}>
        <iframe
          src={embed.embedUrl}
          title={altText || label || "Video"}
          style={{ ...fillStyle, border: 0 }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={frameClass} style={frameStyle}>
        <div
          className="media-slot__empty"
          style={fillStyle}
          role="img"
          aria-label={altText || label || "Media coming soon"}
        >
          <span className="media-slot__label">{label || altText}</span>
        </div>
      </div>
    );
  }

  if (mediaType === "audio") {
    // Audio has no frame to fill; render the control inline.
    return (
      <audio className="media-slot-audio" controls preload="none" src={url}>
        {altText}
      </audio>
    );
  }

  return (
    <div className={frameClass} style={frameStyle}>
      {mediaType === "video" ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={altText}
          style={{ ...fillStyle, objectFit: "cover" }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={altText || ""}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          style={{ ...fillStyle, objectFit: fit, objectPosition }}
        />
      )}
    </div>
  );
}
