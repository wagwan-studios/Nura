"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function CustomerFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("org");
    router.push(`/superadmin/customers?${next.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        className="input"
        placeholder="Search customers..."
        defaultValue={params.get("q") || ""}
        onChange={(e) => update("q", e.target.value)}
        style={{ width: 220 }}
      />
      <select className="input" defaultValue={params.get("plan") || ""} onChange={(e) => update("plan", e.target.value)}>
        <option value="">All plans</option>
        <option value="TRIAL">Trial</option>
        <option value="STARTER">Starter</option>
        <option value="GROWTH">Growth</option>
        <option value="SCALE">Scale</option>
      </select>
      <select className="input" defaultValue={params.get("status") || ""} onChange={(e) => update("status", e.target.value)}>
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="AT_RISK">At Risk</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>
  );
}
