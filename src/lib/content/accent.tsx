import { Fragment } from "react";

/**
 * The approved references set part of a heading in the accent gold —
 * "Bridge to Our *Future*." on desktop, "our *languages*." on mobile.
 *
 * A heading is a single CMS text field, so the emphasised span is marked in
 * the content itself with *asterisks*, the same convention editors already
 * know from chat and markdown. Everything outside the asterisks renders
 * normally, and text with no asterisks renders unchanged — so this is safe
 * for every existing field.
 *
 * Only single emphasis runs are supported; nesting is not, by design.
 */
export function renderAccented(text: string | null | undefined) {
  if (!text) return null;

  const parts = text.split(/\*([^*]+)\*/g);
  // Odd indices are the captured groups, i.e. the emphasised runs.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span className="accent-text" key={i}>
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
