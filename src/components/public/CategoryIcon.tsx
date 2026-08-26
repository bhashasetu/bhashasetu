/**
 * The little mark beside a category name.
 *
 * categories.icon_name has existed since the first migration and nothing has
 * ever rendered it. The names an editor can choose map to marks here rather
 * than to an icon library: the set is small, closed and part of the design, so
 * a second dependency would buy nothing (CLAUDE.md section 23).
 *
 * An unknown or empty name renders the neutral mark rather than nothing, so a
 * category an editor invents still looks deliberate.
 */
const PATHS: Record<string, string> = {
  // Nature & Environment — a leaf.
  leaf: "M20 4C10 4 4 9 4 17c0 1 .1 2 .3 3l1.9-.5C6.1 18.7 6 17.9 6 17c0-1.2.2-2.3.6-3.3C9 15.6 12.6 16 15 14c3-2.5 5-6 5-10zM4.6 20.4l-1.2 1.2 1.4 1.4 1.2-1.2c1.6 1 3.5 1.2 5.3.6l-.6-1.9c-1.3.4-2.7.3-3.9-.4l3.6-3.6-1.4-1.4-4.4 4.4z",
  // Greetings — a raised hand.
  hand: "M13 2a1.5 1.5 0 011.5 1.5V11h1V5.5a1.5 1.5 0 013 0v8.9l1.6-2.7a1.5 1.5 0 012.6 1.5l-3.3 5.7A6 6 0 0114.2 22H12a7 7 0 01-7-7V9.5a1.5 1.5 0 013 0V13h1V3.5A1.5 1.5 0 0110.5 2 1.5 1.5 0 0112 3.5V11h1V3.5A1.5 1.5 0 0113 2z",
  // Relationships — two figures.
  people: "M9 12a4 4 0 100-8 4 4 0 000 8zm7 0a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0v1H2v-1zm15.5-5A5.5 5.5 0 0122 20v1h-4.2v-1c0-1.9-.7-3.6-1.8-5h1.5z",
  // Food — a bowl.
  bowl: "M3 11h18a9 9 0 01-9 9 9 9 0 01-9-9zm9-8c1.7 0 3 1.3 3 3 0 .7-.2 1.3-.6 1.8l-1.6-1.2c.1-.2.2-.4.2-.6a1 1 0 00-2 0h-2c0-1.7 1.3-3 3-3z",
  // Body — a figure.
  body: "M12 2a2 2 0 110 4 2 2 0 010-4zM8 7h8a1 1 0 011 1v6h-2v8h-2v-8h-2v8H9v-8H7V8a1 1 0 011-1z",
  // Questions — a question mark.
  question: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 15.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5zM12 6a3.5 3.5 0 013.5 3.5c0 1.6-.9 2.3-1.8 2.9-.7.5-1.2.8-1.2 1.6h-2c0-1.9 1-2.6 1.9-3.2.7-.5 1.1-.8 1.1-1.3A1.5 1.5 0 0012 8a1.5 1.5 0 00-1.5 1.5h-2A3.5 3.5 0 0112 6z",
  // Phrases — a speech bubble.
  speech: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z",
  // General, and anything unrecognised — a simple tag.
  tag: "M10 3H4a1 1 0 00-1 1v6l10 10 7-7L10 3zm-3 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z",
};

export function CategoryIcon({
  name,
  size = 14,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const path = (name && PATHS[name]) || PATHS.tag;
  return (
    <svg
      className="ex-cat-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
