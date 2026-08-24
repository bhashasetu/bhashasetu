"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bottom tab bar from MOBILE-05-LanguageSelection.PNG.
 * Navigation mechanics are code-managed (CLAUDE.md section 4), so the tabs are
 * not CMS-editable. Hidden above the mobile breakpoint.
 */
const TABS = [
  { href: "/", label: "Home", d: "M12 3l9 8h-3v10h-5v-6H11v6H6V11H3l9-8z" },
  { href: "/learn", label: "Learn", d: "M4 5a2 2 0 012-2h5v18H6a2 2 0 01-2-2V5zm9-2h5a2 2 0 012 2v14a2 2 0 01-2 2h-5V3z" },
  { href: "/languages", label: "Explore", d: "M11 3a8 8 0 105.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0011 3zm0 2a6 6 0 110 12 6 6 0 010-12z" },
  { href: "/play", label: "Play", d: "M7 7h10a5 5 0 015 5v1a4 4 0 01-7.2 2.4L14 14h-4l-.8 1.4A4 4 0 012 13v-1a5 5 0 015-5zm-1 4v2h2v-2H6zm10 0a1 1 0 100 2 1 1 0 000-2z" },
  { href: "/about", label: "About", d: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mtabs" aria-label="Primary">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mtab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={tab.d} />
            </svg>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
