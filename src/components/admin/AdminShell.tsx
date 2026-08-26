import Link from "next/link";
import { AdminNavLink } from "./AdminNavLink";

/**
 * Back Office chrome: fixed sidebar plus top bar, per ADMIN-01-Dashboard.PNG.
 * Desktop-only for V1 (CLAUDE.md section 13).
 */
const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "gauge" },
  { href: "/admin/languages", label: "Languages", icon: "globe" },
  { href: "/admin/categories", label: "Categories", icon: "tag" },
  { href: "/admin/learning-entries", label: "Words & Phrases", icon: "chat" },
  { href: "/admin/homepage", label: "Homepage Content", icon: "home" },
  { href: "/admin/stories", label: "Stories & Voices", icon: "mic" },
  { href: "/admin/faqs", label: "Help & FAQ", icon: "chat" },
  { href: "/admin/chat", label: "My BhashaSetu", icon: "chat" },
  { href: "/admin/pages", label: "Pages", icon: "tag" },
  { href: "/admin/suggestions", label: "Suggested Words", icon: "tag" },
  { href: "/admin/media", label: "Media", icon: "image" },
] as const;

const ICONS: Record<string, string> = {
  gauge:
    "M12 3a9 9 0 019 9 8.96 8.96 0 01-1.5 5H4.5A8.96 8.96 0 013 12a9 9 0 019-9zm0 4l-3 5a3 3 0 006 0l-3-5z",
  globe:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.7 0 3.3 2.9 3.8 7H8.2C8.7 6.9 10.3 4 12 4zM4.3 11h2.9c.1-2.4.6-4.5 1.4-6A8 8 0 004.3 11zm0 2a8 8 0 004.3 6c-.8-1.5-1.3-3.6-1.4-6H4.3zm3.9 0h7.6c-.5 4.1-2.1 7-3.8 7s-3.3-2.9-3.8-7zm8.6 0h2.9a8 8 0 01-4.3 6c.8-1.5 1.3-3.6 1.4-6zm0-2c-.1-2.4-.6-4.5-1.4-6a8 8 0 014.3 6h-2.9z",
  tag: "M11 2H4a2 2 0 00-2 2v7l11 11 9-9L11 2zm-4 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z",
  chat: "M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4V5a2 2 0 010-2z",
  home: "M12 3l9 8h-3v10h-5v-6H11v6H6V11H3l9-8z",
  image:
    "M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 12l4-5 3 4 3-3 4 5H5zm3-7a2 2 0 110-4 2 2 0 010 4z",
  mic: "M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-4 4.9V19h3v2H8v-2h3v-3.1A5 5 0 017 11h2a3 3 0 006 0h2z",
};

export function AdminIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name] ?? ICONS.home} />
    </svg>
  );
}

export function AdminShell({
  title,
  email,
  children,
}: {
  title: string;
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__name">BHASHA SETU</div>
          <div className="admin-brand__tagline">
            Bridging Voices. Preserving Heritage.
          </div>
        </div>

        <nav className="admin-nav" aria-label="Back Office">
          {NAV.map((item) => (
            <AdminNavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </AdminNavLink>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <Link href="/" className="admin-visit" target="_blank">
            Visit Website
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-topbar__title">{title}</h1>
          <div className="admin-topbar__right">
            <div className="admin-user">
              <div className="admin-user__avatar" aria-hidden="true">
                {(email?.[0] ?? "A").toUpperCase()}
              </div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{email ?? "Admin"}</div>
                <div className="admin-user__role">Administrator</div>
              </div>
            </div>
            <form action="/admin/logout" method="POST">
              <button type="submit" className="admin-btn admin-btn--ghost">
                Log out
              </button>
            </form>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
