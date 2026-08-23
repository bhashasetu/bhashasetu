import Link from "next/link";

/**
 * Homepage hero/editorial content is CMS-managed (CLAUDE.md Section 4)
 * and belongs to a later phase (homepage modules). This bootstrap phase
 * provides only the fixed navigation entry point into the Learn page
 * so the vertical slice is reachable; no editorial copy is hardcoded here.
 */
export default function HomePage() {
  return (
    <main>
      <h1>Bhasha Setu</h1>
      <p>
        <Link href="/learn">Start Learning</Link>
      </p>
    </main>
  );
}
