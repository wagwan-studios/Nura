import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveCustomerAlert } from "./actions";
import { ResolveButton } from "./ResolveButton";
import { severityClass, severityIcon, timeAgo } from "@/lib/alerts-ui";

export default async function AlertsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const [unresolved, resolved] = await Promise.all([
    prisma.platformAlert.findMany({
      where: { organizationId, resolved: false },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      include: { relatedEntry: true, assignedTo: true },
    }),
    prisma.platformAlert.findMany({
      where: { organizationId, resolved: true },
      orderBy: { resolvedAt: "desc" },
      take: 6,
      include: { relatedEntry: true, assignedTo: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Alerts</h1>
        <p>Conflicts, gaps, and follow-ups Nura has noticed in your knowledge base.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Open Alerts</span>
          <span className="pill pill-muted">{unresolved.length}</span>
        </div>
        <div style={{ padding: 14 }}>
          {unresolved.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No open alerts. 🎉</p>}
          {unresolved.map((a) => (
            <div key={a.id} className={`alert-card ${severityClass(a.severity)}`} style={{ alignItems: "center" }}>
              <span className="alert-icon">{severityIcon(a.severity)}</span>
              <div style={{ flex: 1 }}>
                <div className="alert-title">{a.title}</div>
                <div className="alert-desc">{a.description}</div>
                <div className="alert-time">
                  {timeAgo(a.createdAt)}
                  {a.assignedTo ? ` · assigned to ${a.assignedTo.name}` : ""}
                  {a.relatedEntry ? (
                    <>
                      {" · "}
                      <Link href={`/dashboard/knowledge/${a.relatedEntry.id}`} style={{ color: "var(--orange)" }}>
                        {a.relatedEntry.title}
                      </Link>
                    </>
                  ) : ""}
                  {a.actionLabel ? ` · suggested: ${a.actionLabel}` : ""}
                </div>
              </div>
              <ResolveButton onResolve={resolveCustomerAlert.bind(null, a.id)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recently Resolved</span>
        </div>
        <div style={{ padding: "4px 16px" }}>
          {resolved.length === 0 && <p className="page-sub" style={{ padding: "12px 0" }}>Nothing resolved yet.</p>}
          {resolved.map((a) => (
            <div className="log-item" key={a.id}>
              <span className="log-icon" style={{ background: "var(--green-dim)", color: "var(--green)" }}>✓</span>
              <div className="log-text">
                <span>{a.title}</span>
              </div>
              <span className="log-time">{a.resolvedAt ? timeAgo(a.resolvedAt) : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
