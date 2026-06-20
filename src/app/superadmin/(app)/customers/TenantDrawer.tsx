"use client";

import { useRouter } from "next/navigation";
import {
  eventTypeColor,
  eventTypeIcon,
  formatCents,
  formatNumber,
  healthColor,
  onboardingStageLabel,
  planPillClass,
  statusLabel,
  statusPillClass,
  timeAgo,
} from "../lib";

type AuditEntry = { id: string; description: string; eventType: string; createdAt: Date; actor: string };

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  mrr: number;
  entriesCount: number;
  queriesPerDay: number;
  membersCount: number;
  healthScore: number;
  createdAt: Date;
  lastActiveAt: Date | null;
  onboardingStage: string | null;
};

export function TenantDrawer({
  tenant,
  audit,
  closeHref,
  onSuspendToggle,
  onResync,
  onImpersonate,
}: {
  tenant: Tenant;
  audit: AuditEntry[];
  closeHref: string;
  onSuspendToggle: () => void;
  onResync: () => void;
  onImpersonate: () => void;
}) {
  const router = useRouter();

  return (
    <div className="modal-overlay open" onClick={() => router.push(closeHref)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="me-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{tenant.name}</div>
            <div className="page-sub" style={{ marginTop: 0 }}>
              {tenant.slug}.nura.ai · customer since {new Date(tenant.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span className={`pill ${planPillClass(tenant.plan)}`}>{tenant.plan}</span>
            <span className={`pill ${statusPillClass(tenant.status)}`}>{statusLabel(tenant.status)}</span>
          </div>
          <button className="modal-close" onClick={() => router.push(closeHref)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-stat">
              <div className="modal-stat-label">MRR</div>
              <div className="modal-stat-val">{formatCents(tenant.mrr)}/mo</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Health Score</div>
              <div className="modal-stat-val" style={{ color: healthColor(tenant.healthScore) }}>{tenant.healthScore}/100</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Knowledge Entries</div>
              <div className="modal-stat-val">{formatNumber(tenant.entriesCount)}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Queries / day</div>
              <div className="modal-stat-val">{formatNumber(tenant.queriesPerDay)}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Team Members</div>
              <div className="modal-stat-val">{tenant.membersCount}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-label">Last Active</div>
              <div className="modal-stat-val" style={{ fontSize: 13 }}>{tenant.lastActiveAt ? timeAgo(tenant.lastActiveAt) : "never"}</div>
            </div>
          </div>

          {tenant.onboardingStage && (
            <div className="card" style={{ marginBottom: 16, padding: "10px 14px" }}>
              <span className="pill pill-blue">Onboarding: {onboardingStageLabel(tenant.onboardingStage)}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onImpersonate}>Impersonate →</button>
            <button className="btn btn-secondary" onClick={onResync}>↻ Resync integrations</button>
            <button
              className={tenant.status === "SUSPENDED" ? "btn btn-secondary" : "btn btn-danger"}
              onClick={onSuspendToggle}
            >
              {tenant.status === "SUSPENDED" ? "Reactivate tenant" : "Suspend tenant"}
            </button>
          </div>

          <div className="card-title" style={{ marginBottom: 8 }}>Recent Activity</div>
          {audit.length === 0 && <div className="page-sub">No recent activity.</div>}
          {audit.map((log) => {
            const c = eventTypeColor(log.eventType);
            return (
              <div className="log-item" key={log.id}>
                <span className="log-icon" style={{ background: c.bg, color: c.color }}>{eventTypeIcon(log.eventType)}</span>
                <div className="log-text">{log.description}</div>
                <span className="log-time">{timeAgo(log.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
