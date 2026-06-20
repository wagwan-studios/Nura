export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function severityIcon(severity: string) {
  switch (severity) {
    case "CRITICAL": return "✕";
    case "WARNING": return "⚠";
    case "INFO": return "ℹ";
    default: return "•";
  }
}

export function severityClass(severity: string) {
  switch (severity) {
    case "CRITICAL": return "critical";
    case "WARNING": return "warning";
    case "INFO": return "info";
    default: return "info";
  }
}
