import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ONBOARDING_STAGES, formatNumber, onboardingStageLabel, timeAgo } from "../lib";

export default async function OnboardingPipelinePage() {
  const orgs = await prisma.organization.findMany({
    where: { onboardingStage: { not: null } },
    orderBy: { stageEnteredAt: "asc" },
  });

  const byStage = new Map<string, typeof orgs>();
  for (const stage of ONBOARDING_STAGES) byStage.set(stage, []);
  for (const o of orgs) {
    if (o.onboardingStage) byStage.get(o.onboardingStage)?.push(o);
  }

  const total = orgs.length || 1;

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Onboarding Pipeline</div>
          <div className="page-sub">{orgs.length} tenants currently onboarding</div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 20 }}>
        {ONBOARDING_STAGES.map((stage) => {
          const tenants = byStage.get(stage) || [];
          return (
            <div className="pipeline-stage" key={stage}>
              <div className="pipeline-stage-label">
                {onboardingStageLabel(stage)} <span className="mono" style={{ color: "var(--faint)" }}>({tenants.length})</span>
              </div>
              {tenants.map((t) => (
                <Link key={t.id} href={`/superadmin/customers?org=${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="pipeline-card">
                    <div className="pipeline-card-name">{t.name}</div>
                    <div className="pipeline-card-meta">
                      {t.membersCount} members · entered {t.stageEnteredAt ? timeAgo(t.stageEnteredAt) : "—"}
                    </div>
                  </div>
                </Link>
              ))}
              {tenants.length === 0 && <div className="page-sub" style={{ fontSize: 11 }}>None</div>}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Drop-off Funnel</span>
        </div>
        <div style={{ padding: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Tenants</th>
                <th>% of pipeline</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ONBOARDING_STAGES.map((stage) => {
                const count = byStage.get(stage)?.length || 0;
                const pct = Math.round((count / total) * 100);
                return (
                  <tr key={stage}>
                    <td style={{ fontWeight: 500 }}>{onboardingStageLabel(stage)}</td>
                    <td>{formatNumber(count)}</td>
                    <td>{pct}%</td>
                    <td style={{ width: "40%" }}>
                      <div className="health-bar" style={{ width: "100%" }}>
                        <div className="health-fill" style={{ width: `${pct}%`, background: "var(--orange)" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
