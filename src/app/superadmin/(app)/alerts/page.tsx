import { prisma } from "@/lib/prisma";
import { resolveAlert } from "./actions";
import { ResolveButton } from "./ResolveButton";
import { severityClass, severityIcon, timeAgo } from "../lib";

export default async function AlertsPage() {
  const [unresolved, resolved] = await Promise.all([
    prisma.platformAlert.findMany({
      where: { resolved: false },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      include: { organization: { select: { name: true } } },
    }),
    prisma.platformAlert.findMany({
      where: { resolved: true },
      orderBy: { resolvedAt: "desc" },
      take: 6,
      include: { organization: { select: { name: true } } },
    }),
  ]);

  const critical = unresolved.filter((a) => a.severity === "CRITICAL");
  const warning = unresolved.filter((a) => a.severity === "WARNING");
  const info = unresolved.filter((a) => a.severity === "INFO");

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Alerts</div>
          <div className="page-sub">{unresolved.length} open · {critical.length} critical, {warning.length} warning, {info.length} info</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 14 }}>
        <div className="stat-card red">
          <div className="stat-label">Critical</div>
          <div className="stat-val">{critical.length}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Warning</div>
          <div className="stat-val">{warning.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Info</div>
          <div className="stat-val">{info.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <span className="card-title">Open Alerts</span>
        </div>
        <div style={{ padding: 14 }}>
          {unresolved.length === 0 && <div className="page-sub">No open alerts. 🎉</div>}
          {unresolved.map((a) => (
            <div key={a.id} className={`alert-card ${severityClass(a.severity)}`} style={{ alignItems: "center" }}>
              <span className="alert-icon">{severityIcon(a.severity)}</span>
              <div style={{ flex: 1 }}>
                <div className="alert-title">{a.title}</div>
                <div className="alert-desc">{a.description}</div>
                <div className="alert-time">{a.organization?.name ? `${a.organization.name} · ` : ""}{timeAgo(a.createdAt)}{a.actionLabel ? ` · suggested: ${a.actionLabel}` : ""}</div>
              </div>
              <ResolveButton onResolve={resolveAlert.bind(null, a.id)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recently Resolved</span>
        </div>
        <div style={{ padding: "4px 16px" }}>
          {resolved.length === 0 && <div className="page-sub" style={{ padding: "12px 0" }}>Nothing resolved yet.</div>}
          {resolved.map((a) => (
            <div className="log-item" key={a.id}>
              <span className="log-icon" style={{ background: "var(--green-dim)", color: "var(--green)" }}>✓</span>
              <div className="log-text">
                <strong>{a.organization?.name || "Platform"}</strong> <span>{a.title}</span>
              </div>
              <span className="log-time">{a.resolvedAt ? timeAgo(a.resolvedAt) : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
