"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  icon,
  label,
  exact,
  count,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
  count?: number;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`nav-item${active ? " active" : ""}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {!!count && <span className="nav-badge">{count}</span>}
    </Link>
  );
}
