"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon } from "./AdminShell";

export function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`admin-nav__link${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <AdminIcon name={icon} />
      <span>{children}</span>
    </Link>
  );
}
