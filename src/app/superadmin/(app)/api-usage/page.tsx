import { prisma } from "@/lib/prisma";
import { formatNumber, planPillClass, timeAgo } from "../lib";

function maskKey(key: string) {
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export default async function ApiUsagePage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { queriesPerDay: "desc" },
    include: {
      _count: { select: { agentLogs: true } },
      agentLogs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  const totalCalls = orgs.reduce((s, o) => s + o._count.agentLogs, 0);
  const totalQueries = orgs.reduce((s, o) => s + o.queriesPerDay, 0);

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">API Usage</div>
          <div className="page-sub">{formatNumber(totalCalls)} agent API calls logged · {formatNumber(totalQueries)} queries/day across tenants</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>API Key</th>
                <th>Agent API Calls</th>
                <th>Queries / day</th>
                <th>Last API Call</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>{o.name}</td>
                  <td><span className={`pill ${planPillClass(o.plan)}`}>{o.plan}</span></td>
                  <td className="mono">{maskKey(o.apiKey)}</td>
                  <td>{formatNumber(o._count.agentLogs)}</td>
                  <td>{formatNumber(o.queriesPerDay)}</td>
                  <td>{o.agentLogs[0] ? timeAgo(o.agentLogs[0].createdAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
