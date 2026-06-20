"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HQNavLink({
  href,
  icon,
  label,
  exact,
  count,
  alert,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
  count?: number;
  alert?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`nav-item${active ? " active" : ""}`}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {typeof count === "number" && count > 0 && <span className="nav-count">{count}</span>}
      {alert && <span className="nav-alert" />}
    </Link>
  );
}
