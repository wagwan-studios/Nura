import { prisma } from "@/lib/prisma";
import { formatNumber } from "../lib";

const SOURCE_LABELS: Record<string, string> = {
  SLACK: "Slack", NOTION: "Notion", GMAIL: "Gmail", ZOOM: "Zoom", JIRA: "Jira", GITHUB: "GitHub",
};

export default async function AiMonitorPage() {
  const jobs = await prisma.aiJob.findMany();

  const total = jobs.length;
  const successCount = jobs.filter((j) => j.success).length;
  const totalCost = jobs.reduce((s, j) => s + j.costUsd, 0);
  const totalTokens = jobs.reduce((s, j) => s + (j.tokensUsed || 0), 0);
  const avgLatency = total > 0 ? Math.round(jobs.reduce((s, j) => s + j.latencyMs, 0) / total) : 0;

  const autoAcceptable = jobs.filter((j) => j.autoAccepted !== null);
  const autoAcceptedCount = autoAcceptable.filter((j) => j.autoAccepted).length;

  const byType = new Map<string, { total: number; success: number; latencySum: number }>();
  for (const j of jobs) {
    const e = byType.get(j.jobType) || { total: 0, success: 0, latencySum: 0 };
    e.total += 1;
    if (j.success) e.success += 1;
    e.latencySum += j.latencyMs;
    byType.set(j.jobType, e);
  }

  const extractionJobs = jobs.filter((j) => j.jobType === "extraction" && j.source);
  const bySource = new Map<string, { total: number; success: number }>();
  for (const j of extractionJobs) {
    const src = j.source as string;
    const e = bySource.get(src) || { total: 0, success: 0 };
    e.total += 1;
    if (j.success) e.success += 1;
    bySource.set(src, e);
  }

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">AI Monitor</div>
          <div className="page-sub">{formatNumber(total)} AI jobs processed across all tenants</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="stat-card green">
          <div className="stat-label">Success Rate</div>
          <div className="stat-val">{total > 0 ? ((successCount / total) * 100).toFixed(1) : "0"}%</div>
          <div className="stat-sub">{formatNumber(successCount)} / {formatNumber(total)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Avg Latency</div>
          <div className="stat-val">{avgLatency}ms</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-label">Auto-accept Rate</div>
          <div className="stat-val">{autoAcceptable.length > 0 ? ((autoAcceptedCount / autoAcceptable.length) * 100).toFixed(1) : "0"}%</div>
          <div className="stat-sub">{formatNumber(autoAcceptedCount)} / {formatNumber(autoAcceptable.length)}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">AI Spend</div>
          <div className="stat-val">${totalCost.toFixed(2)}</div>
          <div className="stat-sub">{formatNumber(totalTokens)} tokens</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Jobs by Type</span>
          </div>
          <div style={{ padding: 16 }}>
            {[...byType.entries()].map(([type, e]) => (
              <div className="ai-metric-row" key={type}>
                <span className="ai-metric-label" style={{ textTransform: "capitalize" }}>{type}</span>
                <div className="progress-mini">
                  <div className="progress-fill" style={{ width: `${(e.success / e.total) * 100}%`, background: "var(--green)" }} />
                </div>
                <span className="ai-metric-val">{formatNumber(e.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Extraction Accuracy by Source</span>
          </div>
          <div style={{ padding: 16 }}>
            {[...bySource.entries()].map(([src, e]) => {
              const rate = (e.success / e.total) * 100;
              return (
                <div className="ai-metric-row" key={src}>
                  <span className="ai-metric-label">{SOURCE_LABELS[src] || src}</span>
                  <div className="progress-mini">
                    <div className="progress-fill" style={{ width: `${rate}%`, background: rate >= 90 ? "var(--green)" : rate >= 80 ? "var(--yellow)" : "var(--red)" }} />
                  </div>
                  <span className="ai-metric-val">{rate.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
