/**
 * How a resolved asset should be drawn into whatever frame it lands in.
 *
 * Framing used to be decided once, at upload, by cropping the file to the
 * ratio of the first slot it was attached to. That threw pixels away and tied
 * the asset to that one ratio. It is now carried alongside the URL and applied
 * as CSS, so the same stored file frames correctly in every slot it appears in
 * and at every viewport — including slots that do not exist yet.
 */
export type Framing = {
  fit: "cover" | "contain";
  objectPosition: string;
};

/**
 * Spread onto a SlotMedia call to frame it by the asset's own settings:
 *
 *   <SlotMedia url={...} {...framing(media(slot))} />
 *
 * Returns nothing for an unresolved slot, so SlotMedia keeps its defaults and
 * an empty slot renders its placeholder exactly as before. Props written after
 * the spread still win, for the rare composition that needs to override an
 * asset's own framing on one surface.
 */
export function framing(
  resolved: Partial<Framing> | null | undefined
): Partial<Framing> {
  if (!resolved) return {};
  return { fit: resolved.fit, objectPosition: resolved.objectPosition };
}
