import { prisma } from "@/lib/prisma";
import { eventTypeColor, eventTypeIcon, formatCents, planPillClass, statusLabel, statusPillClass, timeAgo } from "../lib";

const PLAN_ORDER = ["TRIAL", "STARTER", "GROWTH", "SCALE"] as const;
const PLAN_COLORS: Record<string, string> = {
  TRIAL: "var(--faint)",
  STARTER: "var(--green)",
  GROWTH: "var(--blue)",
  SCALE: "var(--violet)",
};

export default async function RevenuePage() {
  const [orgs, billingEvents] = await Promise.all([
    prisma.organization.findMany({ orderBy: { mrr: "desc" } }),
    prisma.billingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { organization: { select: { name: true } } },
    }),
  ]);

  const totalMrr = orgs.reduce((sum, o) => sum + o.mrr, 0);
  const mrrByPlan = new Map<string, { total: number; count: number }>();
  for (const plan of PLAN_ORDER) mrrByPlan.set(plan, { total: 0, count: 0 });
  for (const o of orgs) {
    const entry = mrrByPlan.get(o.plan) || { total: 0, count: 0 };
    entry.total += o.mrr;
    entry.count += 1;
    mrrByPlan.set(o.plan, entry);
  }
  const maxPlanMrr = Math.max(...PLAN_ORDER.map((p) => mrrByPlan.get(p)?.total || 0), 1);

  const newMrr = billingEvents.filter((b) => b.eventType === "new").reduce((s, b) => s + b.amountCents, 0);
  const expansionMrr = billingEvents.filter((b) => b.eventType === "upgrade").reduce((s, b) => s + b.amountCents, 0);
  const lostMrr = billingEvents
    .filter((b) => b.eventType === "downgrade" || b.eventType === "cancel")
    .reduce((s, b) => s + Math.abs(b.amountCents), 0);

  const topCustomers = orgs.slice(0, 8);
  const arpu = orgs.length > 0 ? Math.round(totalMrr / orgs.length) : 0;

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Revenue</div>
          <div className="page-sub">MRR breakdown across {orgs.length} customers</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-card green">
          <div className="stat-label">Total MRR</div>
          <div className="stat-val">{formatCents(totalMrr)}</div>
          <div className="stat-delta delta-flat">ARR ≈ {formatCents(totalMrr * 12)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">New MRR</div>
          <div className="stat-val">{formatCents(newMrr)}</div>
          <div className="stat-delta delta-up">from new signups</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-label">Expansion MRR</div>
          <div className="stat-val">{formatCents(expansionMrr)}</div>
          <div className="stat-delta delta-up">from upgrades</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Lost MRR</div>
          <div className="stat-val">{formatCents(lostMrr)}</div>
          <div className="stat-delta delta-down">downgrades &amp; cancellations</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">MRR by Plan</span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="big-chart">
              {PLAN_ORDER.map((plan) => {
                const entry = mrrByPlan.get(plan) || { total: 0, count: 0 };
                const heightPct = Math.max((entry.total / maxPlanMrr) * 100, 2);
                return (
                  <div className="big-col" key={plan}>
                    <div className="mono" style={{ fontSize: 10 }}>{formatCents(entry.total)}</div>
                    <div className="big-bar" style={{ height: `${heightPct}%`, background: PLAN_COLORS[plan] }} />
                    <div className="big-label">{plan} ({entry.count})</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Key Metrics</span>
          </div>
          <div style={{ padding: 16 }}>
            <div className="ai-metric-row">
              <span className="ai-metric-label">Average revenue per customer</span>
              <span className="ai-metric-val">{formatCents(arpu)}</span>
            </div>
            <div className="ai-metric-row">
              <span className="ai-metric-label">Paying customers</span>
              <span className="ai-metric-val">{orgs.filter((o) => o.mrr > 0).length}</span>
            </div>
            <div className="ai-metric-row">
              <span className="ai-metric-label">Trial customers</span>
              <span className="ai-metric-val">{orgs.filter((o) => o.plan === "TRIAL").length}</span>
            </div>
            <div className="ai-metric-row">
              <span className="ai-metric-label">At-risk MRR</span>
              <span className="ai-metric-val" style={{ color: "var(--yellow)" }}>
                {formatCents(orgs.filter((o) => o.status === "AT_RISK").reduce((s, o) => s + o.mrr, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Customers by MRR</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>MRR</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.name}</td>
                    <td><span className={`pill ${planPillClass(o.plan)}`}>{o.plan}</span></td>
                    <td><span className={`pill ${statusPillClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                    <td>{formatCents(o.mrr)}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Billing Events</span>
          </div>
          <div style={{ padding: "4px 16px" }}>
            {billingEvents.map((b) => {
              const c = eventTypeColor("billing");
              const sign = b.amountCents >= 0 ? "+" : "-";
              return (
                <div className="log-item" key={b.id}>
                  <span className="log-icon" style={{ background: c.bg, color: c.color }}>{eventTypeIcon("billing")}</span>
                  <div className="log-text">
                    <strong>{b.organization?.name}</strong> <span>
                      {b.eventType.replace("_", " ")}
                      {b.planFrom && b.planTo ? ` (${b.planFrom} → ${b.planTo})` : b.planTo ? ` (${b.planTo})` : ""}
                      {" — "}{sign}{formatCents(Math.abs(b.amountCents))}
                    </span>
                  </div>
                  <span className="log-time">{timeAgo(b.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
