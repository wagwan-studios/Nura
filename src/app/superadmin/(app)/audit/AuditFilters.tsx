"use client";

import { useRouter, useSearchParams } from "next/navigation";

const EVENT_TYPES = ["sync", "billing", "auth", "admin", "error", "kb"];

export function AuditFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/superadmin/audit?${next.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        className="input"
        placeholder="Search description..."
        defaultValue={params.get("q") || ""}
        onChange={(e) => update("q", e.target.value)}
        style={{ width: 220 }}
      />
      <select className="input" defaultValue={params.get("type") || ""} onChange={(e) => update("type", e.target.value)}>
        <option value="">All event types</option>
        {EVENT_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
