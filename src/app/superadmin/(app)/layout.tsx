import Link from "next/link";
import { redirect } from "next/navigation";
import { hqAuth, hqSignOut } from "@/auth-hq";
import { prisma } from "@/lib/prisma";
import { HQNavLink } from "./HQNavLink";
import { CommandPalette } from "./CommandPalette";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";

function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await hqAuth();
  if (!session?.user) {
    redirect("/superadmin/login");
  }

  const [tenantCount, onboardingCount, unresolvedAlerts, tenants] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { onboardingStage: { not: "ACTIVATED" } } }),
    prisma.platformAlert.count({ where: { resolved: false } }),
    prisma.organization.findMany({
      select: { id: true, name: true, slug: true, plan: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="hq-app">
      <header className="topbar">
        <Link href="/superadmin" className="topbar-logo">
          <span className="logo-dot" />
          Nura <span className="hq-badge">HQ</span>
        </Link>
        <div className="topbar-center">
          <CommandPaletteTrigger />
          <span className="sys-status">
            <span className="sys-dot" />
            All systems operational
          </span>
        </div>
        <div className="topbar-right">
          <Link href="/superadmin/alerts" className="topbar-icon" aria-label="Alerts">
            ⚠
            {unresolvedAlerts > 0 && <span className="alert-dot" />}
          </Link>
          <form
            action={async () => {
              "use server";
              await hqSignOut({ redirectTo: "/superadmin/login" });
            }}
          >
            <button className="me-chip" type="submit" title="Sign out">
              <span className="me-avatar">{initials(session.user.name, session.user.email)}</span>
              <span className="me-name">{session.user.name || session.user.email}</span>
            </button>
          </form>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section">Platform</div>
          <HQNavLink href="/superadmin" label="Overview" icon="◧" exact />
          <HQNavLink href="/superadmin/customers" label="All Customers" icon="▦" count={tenantCount} />
          <HQNavLink href="/superadmin/onboarding" label="Onboarding" icon="↗" count={onboardingCount} />
          <HQNavLink href="/superadmin/alerts" label="Alerts" icon="⚠" alert={unresolvedAlerts > 0} />

          <div className="sidebar-section">Revenue</div>
          <HQNavLink href="/superadmin/revenue" label="Revenue" icon="$" />
          <HQNavLink href="/superadmin/churn" label="Churn Risk" icon="▽" />

          <div className="sidebar-section">Operations</div>
          <HQNavLink href="/superadmin/integrations" label="Integration Health" icon="◎" />
          <HQNavLink href="/superadmin/ai-monitor" label="AI Monitor" icon="✦" />
          <HQNavLink href="/superadmin/flags" label="Feature Flags" icon="⚑" />
          <HQNavLink href="/superadmin/audit" label="Audit Log" icon="▤" />
          <HQNavLink href="/superadmin/api-usage" label="API Usage" icon="⌁" />

          <div className="sidebar-bottom">
            <div className="sidebar-ver">Nura HQ v1.0.0</div>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      <CommandPalette tenants={tenants} />
    </div>
  );
}
