export { timeAgo, severityIcon, severityClass } from "@/lib/alerts-ui";

export function formatCents(cents: number) {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

export function healthColor(score: number) {
  if (score >= 70) return "var(--green)";
  if (score >= 40) return "var(--yellow)";
  return "var(--red)";
}

export function planPillClass(plan: string) {
  switch (plan) {
    case "SCALE": return "pill-violet";
    case "GROWTH": return "pill-blue";
    case "STARTER": return "pill-green";
    case "TRIAL": return "pill-muted";
    default: return "pill-muted";
  }
}

export function statusPillClass(status: string) {
  switch (status) {
    case "ACTIVE": return "pill-green";
    case "AT_RISK": return "pill-yellow";
    case "SUSPENDED": return "pill-red";
    case "CANCELLED": return "pill-muted";
    default: return "pill-muted";
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case "AT_RISK": return "At Risk";
    case "ACTIVE": return "Active";
    case "SUSPENDED": return "Suspended";
    case "CANCELLED": return "Cancelled";
    default: return status;
  }
}

export function eventTypeIcon(eventType: string) {
  switch (eventType) {
    case "sync": return "↻";
    case "billing": return "$";
    case "auth": return "◆";
    case "admin": return "⚙";
    case "error": return "✕";
    case "kb": return "▤";
    default: return "•";
  }
}

export function eventTypeColor(eventType: string) {
  switch (eventType) {
    case "sync": return { bg: "var(--blue-dim)", color: "var(--blue)" };
    case "billing": return { bg: "var(--green-dim)", color: "var(--green)" };
    case "auth": return { bg: "var(--violet-dim)", color: "var(--violet)" };
    case "admin": return { bg: "var(--bg-3)", color: "var(--muted)" };
    case "error": return { bg: "var(--red-dim)", color: "var(--red)" };
    case "kb": return { bg: "var(--orange-dim)", color: "var(--orange)" };
    default: return { bg: "var(--bg-3)", color: "var(--muted)" };
  }
}

export const ONBOARDING_STAGES = ["SIGNED_UP", "CONNECTED_SOURCE", "INVITED_TEAM", "FIRST_QUERY", "ACTIVATED"] as const;

export function onboardingStageLabel(stage: string) {
  switch (stage) {
    case "SIGNED_UP": return "Signed Up";
    case "CONNECTED_SOURCE": return "Connected Source";
    case "INVITED_TEAM": return "Invited Team";
    case "FIRST_QUERY": return "First Query";
    case "ACTIVATED": return "Activated";
    default: return stage;
  }
}
