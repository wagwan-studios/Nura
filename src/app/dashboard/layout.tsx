import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NavLink } from "./NavLink";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◧", exact: true },
  { href: "/dashboard/search", label: "Ask Nura", icon: "✦" },
  { href: "/dashboard/knowledge", label: "Knowledge Base", icon: "▤", countKey: "drafts" as const },
  { href: "/dashboard/gaps", label: "Knowledge Gaps", icon: "◌", countKey: "gaps" as const },
  { href: "/dashboard/alerts", label: "Alerts", icon: "▲", countKey: "alerts" as const },
  { href: "/dashboard/team", label: "Team", icon: "◉" },
  { href: "/dashboard/onboarding", label: "Onboarding", icon: "↗" },
  { href: "/dashboard/sources", label: "Sources", icon: "◎" },
  { href: "/dashboard/agent-api", label: "Agent API", icon: "⌁" },
];

function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const impersonating = (session.user as typeof session.user & { impersonating?: boolean; impersonatedOrgName?: string })
    .impersonating;
  const impersonatedOrgName = (session.user as typeof session.user & { impersonatedOrgName?: string }).impersonatedOrgName;

  const organizationId = session.user.organizationId;
  const [draftCount, alertCount, gapLogs] = await Promise.all([
    prisma.knowledgeEntry.count({ where: { organizationId, status: "DRAFT" } }),
    prisma.platformAlert.count({ where: { organizationId, resolved: false } }),
    prisma.queryLog.findMany({ where: { organizationId, resultCount: 0 }, select: { question: true } }),
  ]);
  const gapCount = new Set(gapLogs.map((g) => g.question.trim().toLowerCase())).size;
  const counts: Record<string, number> = { drafts: draftCount, alerts: alertCount, gaps: gapCount };

  return (
    <div className="nura-app">
      {impersonating && (
        <div className="hq-impersonate-banner">
          Viewing as {impersonatedOrgName} (impersonation session)
          <a href="/impersonate/exit">Exit impersonation</a>
        </div>
      )}
      <header className="topbar">
        <Link href="/dashboard" className="topbar-logo">
          <span className="logo-dot" />
          Nura
        </Link>
        <span className="topbar-badge">HIQOR</span>
        <div className="topbar-right">
          <button className="topbar-icon-btn" aria-label="Notifications">
            ◔
          </button>
          <div className="topbar-avatar">{initials(session.user.name, session.user.email)}</div>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section-label">Main</div>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              count={item.countKey ? counts[item.countKey] : undefined}
            />
          ))}
          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{initials(session.user.name, session.user.email)}</div>
              <div className="min-w-0">
                <div className="sidebar-user-name truncate">{session.user.name}</div>
                <div className="sidebar-user-role truncate">{session.user.email}</div>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="px-2 pt-1"
            >
              <button className="sidebar-signout">Sign out</button>
            </form>
          </div>
        </aside>
        <main className="main">
          <div className="screen-pad">{children}</div>
        </main>
      </div>
    </div>
  );
}
