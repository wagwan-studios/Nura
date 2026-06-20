import { prisma } from "@/lib/prisma";
import { fixAllIntegrations } from "./actions";
import { FixAllButton } from "./FixAllButton";
import { timeAgo } from "../lib";

const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  SLACK: { label: "Slack", icon: "#", color: "#4A154B" },
  NOTION: { label: "Notion", icon: "N", color: "#000000" },
  GMAIL: { label: "Gmail", icon: "@", color: "#EA4335" },
  ZOOM: { label: "Zoom", icon: "Z", color: "#2D8CFF" },
  JIRA: { label: "Jira", icon: "J", color: "#0052CC" },
  GITHUB: { label: "GitHub", icon: "G", color: "#181717" },
};

export default async function IntegrationHealthPage() {
  const jobs = await prisma.aiJob.findMany({
    where: { jobType: "extraction", source: { not: null } },
  });

  const jiraAlert = await prisma.platformAlert.findFirst({
    where: { resolved: false, title: { contains: "Jira OAuth" } },
  });

  const bySource = new Map<string, { total: number; success: number; latencySum: number; orgs: Set<string>; last: Date }>();
  for (const job of jobs) {
    const src = job.source as string;
    const entry = bySource.get(src) || { total: 0, success: 0, latencySum: 0, orgs: new Set<string>(), last: job.createdAt };
    entry.total += 1;
    if (job.success) entry.success += 1;
    entry.latencySum += job.latencyMs;
    entry.orgs.add(job.organizationId);
    if (job.createdAt > entry.last) entry.last = job.createdAt;
    bySource.set(src, entry);
  }

  const sources = Object.keys(SOURCE_META).filter((s) => bySource.has(s));

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Integration Health</div>
          <div className="page-sub">Sync status across all third-party connectors</div>
        </div>
        {jiraAlert && <FixAllButton onFix={fixAllIntegrations} />}
      </div>

      <div className="card">
        <div className="table-wrap">
          {sources.map((src) => {
            const entry = bySource.get(src)!;
            const meta = SOURCE_META[src];
            const successRate = entry.success / entry.total;
            const isJiraDown = src === "JIRA" && !!jiraAlert;
            let status: { pill: string; label: string };
            if (isJiraDown) status = { pill: "pill-red", label: "Degraded" };
            else if (successRate >= 0.95) status = { pill: "pill-green", label: "Healthy" };
            else if (successRate >= 0.85) status = { pill: "pill-yellow", label: "Degraded" };
            else status = { pill: "pill-red", label: "Unhealthy" };

            return (
              <div className="int-row" key={src}>
                <div className="int-logo" style={{ background: meta.color }}>{meta.icon}</div>
                <div>
                  <div className="int-name">{meta.label}</div>
                  <div className="int-meta">
                    {entry.orgs.size} tenants · {(successRate * 100).toFixed(1)}% success · avg {Math.round(entry.latencySum / entry.total)}ms · last sync {timeAgo(entry.last)}
                  </div>
                </div>
                <div className="int-status">
                  <span className={`pill ${status.pill}`}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {jiraAlert && (
        <div className="alert-card critical" style={{ marginTop: 14 }}>
          <span className="alert-icon">✕</span>
          <div>
            <div className="alert-title">{jiraAlert.title}</div>
            <div className="alert-desc">{jiraAlert.description}</div>
          </div>
        </div>
      )}
    </div>
  );
}
