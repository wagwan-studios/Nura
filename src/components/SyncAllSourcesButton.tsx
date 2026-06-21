"use client";

import { useState } from "react";

export function SyncAllSourcesButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function syncAll() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/sources/sync-all", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Sync all failed");
      }

      const successCount = data.results?.filter((item: any) => item.ok).length ?? 0;
      const failedCount = data.results?.filter((item: any) => !item.ok).length ?? 0;

      setMessage(`Synced sources: ${successCount}. Failed/skipped: ${failedCount}.`);

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync all failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={syncAll}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? "Syncing all..." : "Sync all sources"}
      </button>

      {message ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}