"use client";

import { useEffect, useRef, useState } from "react";

type SourceStatus = {
  ok: boolean;
  sourceId: string;
  name?: string;
  type?: string;
  status?: string;
  lastSyncAt?: string | null;
  records?: number;
  chunks?: number;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

type ToastState = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

function getApiErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const errorData = data as ApiErrorResponse;

    if (typeof errorData.message === "string") {
      return errorData.message;
    }

    if (typeof errorData.error === "string") {
      return errorData.error;
    }
  }

  return fallback;
}

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
    <div style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 9999,
        width: "min(360px, calc(100vw - 32px))",
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

export function SyncSourceButton({ sourceId }: { sourceId: string }) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxPollCountRef = useRef(0);
  const lastKnownSyncAtRef = useRef<string | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    maxPollCountRef.current = 0;
  }

  async function fetchStatus() {
    const res = await fetch(`/api/sources/${sourceId}/status`, {
      cache: "no-store",
    });

    const data = (await res.json()) as SourceStatus | ApiErrorResponse;

    if (!res.ok) {
      throw new Error(getApiErrorMessage(data, "Could not check sync status"));
    }

    return data as SourceStatus;
  }

  async function checkStatus() {
    const data = await fetchStatus();
    const latestSyncAt = data.lastSyncAt || null;
    const previousSyncAt = lastKnownSyncAtRef.current;

    if (latestSyncAt && latestSyncAt !== previousSyncAt) {
      stopPolling();

      setSyncing(false);
      setLoading(false);
      setMessage("");
      lastKnownSyncAtRef.current = latestSyncAt;

      setToast({
        type: "success",
        title: `${data.name || "Source"} sync finished`,
        message: `Latest sync: ${formatDateTime(latestSyncAt)}\nRecords: ${
          data.records ?? 0
        } · Chunks: ${data.chunks ?? 0}`,
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
          "This source is taking longer than expected. You can keep using Nura and check again later.",
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

  async function syncNow() {
    setLoading(true);
    setSyncing(true);
    setMessage("Syncing in background...");
    setToast(null);

    try {
      const currentStatus = await fetchStatus().catch(() => null);
      lastKnownSyncAtRef.current = currentStatus?.lastSyncAt || null;

      const res = await fetch(`/api/sources/${sourceId}/sync`, {
        method: "POST",
      });

      const data = (await res.json()) as ApiErrorResponse & {
        alreadyRunning?: boolean;
      };

      if (!res.ok) {
        throw new Error(getApiErrorMessage(data, "Sync failed"));
      }

      if (data.alreadyRunning) {
        setMessage("Sync is already running for this source.");
      } else {
        setMessage("Syncing in background...");
      }

      startPolling();
    } catch (error) {
      stopPolling();

      setLoading(false);
      setSyncing(false);
      setMessage("");

      setToast({
        type: "error",
        title: "Sync could not start",
        message: error instanceof Error ? error.message : "Sync failed.",
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
          onClick={syncNow}
          disabled={loading || syncing}
          className="btn btn-primary"
        >
          {syncing ? "Syncing..." : loading ? "Starting..." : "Sync now"}
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