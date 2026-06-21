"use client";

import { useState } from "react";

export function SyncSourceButton({ sourceId }: { sourceId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function syncNow() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/sources/${sourceId}/sync`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Sync failed");
      }

      setMessage(
        `Synced. Records: ${data.result?.recordsSynced ?? 0}, Chunks: ${
          data.result?.chunksCreated ?? 0
        }`
      );

      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={syncNow}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? "Syncing..." : "Sync now"}
      </button>

      {message ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}