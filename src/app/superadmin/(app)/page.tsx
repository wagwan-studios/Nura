import Link from "next/link";
import { hqAuth } from "@/auth-hq";
import { prisma } from "@/lib/prisma";
import {
  eventTypeColor,
  eventTypeIcon,
  formatCents,
  formatNumber,
  healthColor,
  planPillClass,
  severityClass,
  severityIcon,
  statusLabel,
  statusPillClass,
  timeAgo,
} from "./lib";

export default async function SuperAdminOverviewPage() {
  const session = await hqAuth();

  const [orgs, unresolvedAlerts, recentAudit, totalQueries] = await Promise.all([
    prisma.organization.findMany({ orderBy: { mrr: "desc" } }),
    prisma.platformAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { organization: { select: { name: true } } },
    }),
    prisma.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { organization: { select: { name: true } } },
    }),
    prisma.organization.aggregate({ _sum: { queriesPerDay: true } }),
  ]);

  const totalMrr = orgs.reduce((sum, o) => sum + o.mrr, 0);
  const activeCount = orgs.filter((o) => o.status === "ACTIVE").length;
  const atRiskCount = orgs.filter((o) => o.status === "AT_RISK").length;
  const trialCount = orgs.filter((o) => o.plan === "TRIAL").length;
  const topCustomers = orgs.slice(0, 6);

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Overview</div>
          <div className="page-sub">Welcome back, {session?.user?.name || session?.user?.email}. Here&apos;s what&apos;s happening across Nura.</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-card green">
          <div className="stat-label">Monthly Recurring Revenue</div>
          <div className="stat-val">{formatCents(totalMrr)}</div>
          <div className="stat-delta delta-up">↑ across {orgs.length} customers</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Active Customers</div>
          <div className="stat-val">{activeCount}</div>
          <div className="stat-delta delta-flat">{trialCount} on trial</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">At Risk</div>
          <div className="stat-val">{atRiskCount}</div>
          <div className="stat-delta delta-down">needs attention</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Queries / day</div>
          <div className="stat-val">{formatNumber(totalQueries._sum.queriesPerDay || 0)}</div>
          <div className="stat-delta delta-flat">across all tenants</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Open Alerts</span>
            <Link href="/superadmin/alerts" className="btn btn-ghost">View all →</Link>
          </div>
          <div style={{ padding: 14 }}>
            {unresolvedAlerts.length === 0 && <div className="page-sub">No open alerts. 🎉</div>}
            {unresolvedAlerts.map((a) => (
              <div key={a.id} className={`alert-card ${severityClass(a.severity)}`}>
                <span className="alert-icon">{severityIcon(a.severity)}</span>
                <div style={{ flex: 1 }}>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-desc">{a.description}</div>
                  <div className="alert-time">{a.organization?.name ? `${a.organization.name} · ` : ""}{timeAgo(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <Link href="/superadmin/audit" className="btn btn-ghost">View all →</Link>
          </div>
          <div style={{ padding: "4px 16px" }}>
            {recentAudit.map((log) => {
              const c = eventTypeColor(log.eventType);
              return (
                <div className="log-item" key={log.id}>
                  <span className="log-icon" style={{ background: c.bg, color: c.color }}>{eventTypeIcon(log.eventType)}</span>
                  <div className="log-text">
                    <strong>{log.organization?.name || "Platform"}</strong> <span>{log.description}</span>
                  </div>
                  <span className="log-time">{timeAgo(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Customers by MRR</span>
          <Link href="/superadmin/customers" className="btn btn-ghost">View all →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>MRR</th>
                <th>Health</th>
                <th>Members</th>
                <th>Queries/day</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>{o.name}</td>
                  <td><span className={`pill ${planPillClass(o.plan)}`}>{o.plan}</span></td>
                  <td><span className={`pill ${statusPillClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                  <td>{formatCents(o.mrr)}/mo</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="health-bar">
                        <div className="health-fill" style={{ width: `${o.healthScore}%`, background: healthColor(o.healthScore) }} />
                      </div>
                      <span className="mono">{o.healthScore}</span>
                    </div>
                  </td>
                  <td>{o.membersCount}</td>
                  <td>{formatNumber(o.queriesPerDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
