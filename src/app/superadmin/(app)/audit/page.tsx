import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuditFilters } from "./AuditFilters";
import { eventTypeColor, eventTypeIcon, timeAgo } from "../lib";

const PAGE_SIZE = 15;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q, type, page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (q) where.description = { contains: q, mode: "insensitive" };
  if (type) where.eventType = type;

  const [logs, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { organization: { select: { name: true } } },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    params.set("page", String(p));
    return `/superadmin/audit?${params.toString()}`;
  }

  return (
    <div className="screen">
      <div className="page-row">
        <div>
          <div className="page-title">Audit Log</div>
          <div className="page-sub">{total} events</div>
        </div>
        <AuditFilters />
      </div>

      <div className="card">
        <div style={{ padding: "4px 16px" }}>
          {logs.map((log) => {
            const c = eventTypeColor(log.eventType);
            return (
              <div className="log-item" key={log.id}>
                <span className="log-icon" style={{ background: c.bg, color: c.color }}>{eventTypeIcon(log.eventType)}</span>
                <div className="log-text">
                  <strong>{log.organization?.name || "Platform"}</strong> <span>{log.description}</span>
                  {" "}<span className="pill pill-muted" style={{ marginLeft: 6, textTransform: "uppercase" }}>{log.eventType}</span>
                  {" "}<span style={{ color: "var(--faint)" }}>· by {log.actor}</span>
                </div>
                <span className="log-time">{timeAgo(log.createdAt)}</span>
              </div>
            );
          })}
          {logs.length === 0 && <div className="page-sub" style={{ padding: "16px 0" }}>No matching events.</div>}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              className={`btn ${p === pageNum ? "btn-primary" : "btn-secondary"}`}
              style={{ minWidth: 32, justifyContent: "center" }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
