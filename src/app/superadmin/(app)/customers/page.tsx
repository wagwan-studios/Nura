import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CustomerFilters } from "./CustomerFilters";
import { TenantDrawer } from "./TenantDrawer";
import { resyncIntegrations, startImpersonation, toggleSuspend } from "./actions";
import {
  formatCents,
  formatNumber,
  healthColor,
  planPillClass,
  statusLabel,
  statusPillClass,
  timeAgo,
} from "../lib";

export default async function AllCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string; org?: string }>;
}) {
  const { q, plan, status, org: orgId } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (plan) where.plan = plan;
  if (status) where.status = status;

  const orgs = await prisma.organization.findMany({
    where,
    orderBy: { mrr: "desc" },
  });

  let drawerOrg = null;
  let drawerAudit: { id: string; description: string; eventType: string; createdAt: Date; actor: string }[] = [];
  if (orgId) {
    drawerOrg = await prisma.organization.findUnique({ where: { id: orgId } });
    if (drawerOrg) {
      drawerAudit = await prisma.platformAuditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    }
  }

  const closeParams = new URLSearchParams();
  if (q) closeParams.set("q", q);
  if (plan) closeParams.set("plan", plan);
  if (status) closeParams.set("status", status);
  const closeHref = `/superadmin/customers${closeParams.toString() ? `?${closeParams.toString()}` : ""}`;

  function rowHref(id: string) {
    const p = new URLSearchParams(closeParams);
    p.set("org", id);
    return `/superadmin/customers?${p.toString()}`;
  }

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">All Customers</div>
          <div className="page-sub">{orgs.length} customers</div>
        </div>
        <CustomerFilters />
      </div>

      <div className="card">
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
                <th>Entries</th>
                <th>Queries/day</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={rowHref(o.id)} style={{ fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>
                      {o.name}
                    </Link>
                  </td>
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
                  <td>{formatNumber(o.entriesCount)}</td>
                  <td>{formatNumber(o.queriesPerDay)}</td>
                  <td>{o.lastActiveAt ? timeAgo(o.lastActiveAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOrg && (
        <TenantDrawer
          tenant={drawerOrg}
          audit={drawerAudit}
          closeHref={closeHref}
          onSuspendToggle={toggleSuspend.bind(null, drawerOrg.id)}
          onResync={resyncIntegrations.bind(null, drawerOrg.id)}
          onImpersonate={startImpersonation.bind(null, drawerOrg.id)}
        />
      )}
    </div>
  );
}
