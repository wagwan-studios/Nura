import { prisma } from "@/lib/prisma";
import { sendCheckinEmail } from "./actions";
import { SendCheckinButton } from "./SendCheckinButton";
import { formatCents, formatNumber, healthColor, planPillClass, statusLabel, statusPillClass, timeAgo } from "../lib";

export default async function ChurnRiskPage() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [{ status: "AT_RISK" }, { healthScore: { lt: 50 } }],
    },
    orderBy: { healthScore: "asc" },
  });

  const atRiskMrr = orgs.reduce((s, o) => s + o.mrr, 0);

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Churn Risk</div>
          <div className="page-sub">{orgs.length} tenants flagged — {formatCents(atRiskMrr)}/mo at risk</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 14 }}>
        <div className="stat-card red">
          <div className="stat-label">Tenants at risk</div>
          <div className="stat-val">{orgs.length}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">MRR at risk</div>
          <div className="stat-val">{formatCents(atRiskMrr)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Avg health score</div>
          <div className="stat-val">
            {orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.healthScore, 0) / orgs.length) : "—"}
          </div>
        </div>
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
                <th>Queries/day</th>
                <th>Last Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
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
                  <td>{formatNumber(o.queriesPerDay)}</td>
                  <td>{o.lastActiveAt ? timeAgo(o.lastActiveAt) : "never"}</td>
                  <td>
                    <SendCheckinButton onSend={sendCheckinEmail.bind(null, o.id)} />
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={8} className="page-sub" style={{ padding: "16px 0" }}>No tenants currently at risk. 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
