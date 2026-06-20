"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = { id: string; name: string; slug: string; plan: string };

const PAGES = [
  { label: "Overview", href: "/superadmin", icon: "◧" },
  { label: "All Customers", href: "/superadmin/customers", icon: "▦" },
  { label: "Onboarding Pipeline", href: "/superadmin/onboarding", icon: "↗" },
  { label: "Alerts", href: "/superadmin/alerts", icon: "⚠" },
  { label: "Revenue", href: "/superadmin/revenue", icon: "$" },
  { label: "Churn Risk", href: "/superadmin/churn", icon: "▽" },
  { label: "Integration Health", href: "/superadmin/integrations", icon: "◎" },
  { label: "AI Monitor", href: "/superadmin/ai-monitor", icon: "✦" },
  { label: "Feature Flags", href: "/superadmin/flags", icon: "⚑" },
  { label: "Audit Log", href: "/superadmin/audit", icon: "▤" },
  { label: "API Usage", href: "/superadmin/api-usage", icon: "⌁" },
];

export function CommandPalette({ tenants }: { tenants: Tenant[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSel(0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageMatches = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q)).map((p) => ({
      type: "page" as const,
      label: p.label,
      href: p.href,
      icon: p.icon,
      meta: "Page",
    }));
    const tenantMatches = tenants
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        type: "tenant" as const,
        label: t.name,
        href: `/superadmin/customers?org=${t.id}`,
        icon: "◆",
        meta: t.plan,
      }));
    return [...pageMatches, ...tenantMatches];
  }, [query, tenants]);

  useEffect(() => {
    setSel(0);
  }, [query]);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-box" onClick={(e) => e.stopPropagation()}>
        <input
          className="cmdk-input"
          placeholder="Search pages, customers..."
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[sel]) go(results[sel].href);
            }
          }}
        />
        <div className="cmdk-results">
          {results.length === 0 && <div className="cmdk-empty">No results</div>}
          {results.map((r, i) => (
            <a
              key={`${r.type}-${r.href}-${r.label}`}
              className={`cmdk-item${i === sel ? " sel" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={(e) => {
                e.preventDefault();
                go(r.href);
              }}
              href={r.href}
            >
              <span className="nav-icon">{r.icon}</span>
              <span>{r.label}</span>
              <span className="cmdk-item-meta">{r.meta}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
