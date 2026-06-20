import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SourceIcon } from "@/components/SourceIcon";
import { TYPE_PILL, TYPE_ICON_BG, SOURCE_ICON_BG } from "@/lib/ui";

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [entryCount, sourceCount, byType, recent, sources] = await Promise.all([
    prisma.knowledgeEntry.count({ where: { organizationId } }),
    prisma.source.count({ where: { organizationId } }),
    prisma.knowledgeEntry.groupBy({
      by: ["type"],
      where: { organizationId },
      _count: true,
    }),
    prisma.knowledgeEntry.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { source: true },
    }),
    prisma.source.findMany({
      where: { organizationId },
      include: { _count: { select: { entries: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const typeCounts: Record<string, number> = { PROCESS: 0, DECISION: 0, EXCEPTION: 0, POLICY: 0 };
  for (const b of byType) typeCounts[b.type] = b._count;
  const maxSourceEntries = Math.max(1, ...sources.map((s) => s._count.entries));

  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Overview</h1>
          <p>A snapshot of HIQOR&apos;s captured institutional knowledge.</p>
        </div>
        <Link href="/dashboard/search" className="btn btn-primary">
          ✦ Ask Nura
        </Link>
      </div>

      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-card-label">Knowledge entries</div>
          <div className="stat-card-val">{entryCount}</div>
          <div className="stat-card-sub">across {sourceCount} connected sources</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Processes</div>
          <div className="stat-card-val">{typeCounts.PROCESS}</div>
          <div className="stat-card-delta"><span className="pill pill-blue">PROCESS</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Decisions</div>
          <div className="stat-card-val">{typeCounts.DECISION}</div>
          <div className="stat-card-delta"><span className="pill pill-violet">DECISION</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Policies &amp; exceptions</div>
          <div className="stat-card-val">{typeCounts.POLICY + typeCounts.EXCEPTION}</div>
          <div className="stat-card-delta">
            <span className="pill pill-green">POLICY {typeCounts.POLICY}</span>
            <span className="pill pill-orange">EXCEPTION {typeCounts.EXCEPTION}</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recently updated</span>
            <Link href="/dashboard/knowledge" className="btn btn-ghost">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="card-body text-sm" style={{ color: "var(--muted)" }}>
              No knowledge captured yet.{" "}
              <Link href="/dashboard/knowledge/new" style={{ color: "var(--orange)" }}>
                Add your first entry
              </Link>
              .
            </div>
          ) : (
            <div className="card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {recent.map((entry) => {
                const colors = TYPE_ICON_BG[entry.type] ?? TYPE_ICON_BG.PROCESS;
                return (
                  <div key={entry.id} className="activity-item">
                    <div className="activity-icon" style={{ background: colors.bg, color: colors.fg }}>
                      {entry.type === "PROCESS" ? "▤" : entry.type === "DECISION" ? "◆" : entry.type === "EXCEPTION" ? "!" : "✓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/knowledge/${entry.id}`} className="activity-text" style={{ display: "block", fontWeight: 600 }}>
                        {entry.title}
                      </Link>
                      <div className="activity-text" style={{ color: "var(--muted)" }}>
                        {entry.summary}
                      </div>
                      <div className="activity-time">
                        {entry.source ? `${entry.source.name} · ` : ""}
                        {entry.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`pill ${TYPE_PILL[entry.type] ?? "pill-muted"}`}>{entry.type}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Knowledge by source</span>
            <Link href="/dashboard/sources" className="btn btn-ghost">Manage</Link>
          </div>
          <div className="card-body">
            {sources.slice(0, 6).map((source) => (
              <div key={source.id} className="progress-wrap">
                <div className="progress-label">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <SourceIcon type={source.type} className="source-chip-icon" />
                    {source.name}
                  </span>
                  <span>{source._count.entries}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(source._count.entries / maxSourceEntries) * 100}%`,
                      background: "var(--orange)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
