/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

type SourceStatusItem = {
  sourceId: string;
  name?: string;
  type?: string;
  status?: string;
  lastSyncAt?: string | null;
  records?: number;
  chunks?: number;
};

type SourcesStatusResponse = {
  ok: boolean;
  sources: SourceStatusItem[];
};

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

function formatDateTime(value?: string | null) {
  if (!value) return "just now";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SyncToast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  if (!toast) return null;

  const accent =
    toast.type === "success"
      ? "#16a34a"
      : toast.type === "error"
        ? "#dc2626"
        : "#ff6a00";

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 9999,
        width: "min(390px, calc(100vw - 32px))",
        border: "1px solid rgba(0,0,0,0.12)",
        borderLeft: `5px solid ${accent}`,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 18px 45px rgba(0,0,0,0.16)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-semibold text-black">{toast.title}</p>
          <p className="m-0 mt-1 whitespace-pre-line text-sm leading-relaxed text-[#555]">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            border: "none",
            background: "transparent",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            color: "#777",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function SyncAllSourcesButton() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxPollCountRef = useRef(0);
  const baselineRef = useRef<Record<string, string | null>>({});

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    maxPollCountRef.current = 0;
  }

  async function fetchSourcesStatus() {
    const res = await fetch("/api/sources/status", {
      cache: "no-store",
    });

    const data: SourcesStatusResponse = await res.json();

    if (!res.ok) {
      throw new Error((data as any).message || "Could not check sync status");
    }

    return data.sources || [];
  }

  function getChangedSources(sources: SourceStatusItem[]) {
    return sources.filter((source) => {
      const previous = baselineRef.current[source.sourceId] || null;
      const latest = source.lastSyncAt || null;

      return latest && latest !== previous;
    });
  }

  async function checkStatus() {
    const sources = await fetchSourcesStatus();
    const sourceIds = Object.keys(baselineRef.current);

    const relevantSources = sources.filter((source) =>
      sourceIds.includes(source.sourceId)
    );

    const changedSources = getChangedSources(relevantSources);

    if (
      relevantSources.length > 0 &&
      changedSources.length === relevantSources.length
    ) {
      stopPolling();

      setSyncing(false);
      setLoading(false);
      setMessage("");

      const latestTime = changedSources
        .map((source) => source.lastSyncAt)
        .filter(Boolean)
        .sort()
        .at(-1);

      const totalRecords = changedSources.reduce(
        (sum, source) => sum + (source.records || 0),
        0
      );

      const totalChunks = changedSources.reduce(
        (sum, source) => sum + (source.chunks || 0),
        0
      );

      setToast({
        type: "success",
        title: "All sources sync finished",
        message: `Latest sync: ${formatDateTime(latestTime)}\nSources synced: ${
          changedSources.length
        }\nRecords: ${totalRecords} · Chunks: ${totalChunks}`,
      });

      return;
    }

    maxPollCountRef.current += 1;

    if (maxPollCountRef.current >= 60) {
      stopPolling();

      setSyncing(false);
      setLoading(false);
      setMessage("");

      setToast({
        type: "info",
        title: "Sync is still running",
        message:
          "Some sources are taking longer than expected. You can keep using Nura and check again later.",
      });
    }
  }

  function startPolling() {
    stopPolling();

    pollRef.current = setInterval(() => {
      checkStatus().catch((error) => {
        stopPolling();

        setSyncing(false);
        setLoading(false);
        setMessage("");

        setToast({
          type: "error",
          title: "Could not check sync status",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong while checking sync status.",
        });
      });
    }, 5000);
  }

  async function syncAll() {
    setLoading(true);
    setSyncing(true);
    setMessage("Syncing all connected sources in background...");
    setToast(null);

    try {
      const beforeSources = await fetchSourcesStatus();

      baselineRef.current = beforeSources.reduce<Record<string, string | null>>(
        (acc, source) => {
          acc[source.sourceId] = source.lastSyncAt || null;
          return acc;
        },
        {}
      );

      if (beforeSources.length === 0) {
        setLoading(false);
        setSyncing(false);
        setMessage("");

        setToast({
          type: "info",
          title: "No connected sources",
          message: "Connect a source first before running Sync All.",
        });

        return;
      }

      const res = await fetch("/api/sources/sync-all", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Sync all failed");
      }

      setMessage("Syncing all connected sources in background...");
      startPolling();
    } catch (error) {
      stopPolling();

      setLoading(false);
      setSyncing(false);
      setMessage("");

      setToast({
        type: "error",
        title: "Sync all could not start",
        message: error instanceof Error ? error.message : "Sync all failed.",
      });
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={syncAll}
          disabled={loading || syncing}
          className="btn btn-primary"
        >
          {syncing
            ? "Syncing..."
            : loading
              ? "Starting..."
              : "Sync all sources"}
        </button>

        {message ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {message}
          </p>
        ) : null}
      </div>

      <SyncToast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}