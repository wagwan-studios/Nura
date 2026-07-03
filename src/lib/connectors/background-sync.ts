import {
  syncAllConnectedSourcesToKnowledge,
  syncSourceToKnowledge,
} from "@/lib/connectors/sync-source";

const runningSourceSyncs = new Set<string>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function runDetached(taskName: string, task: () => Promise<void>) {
  setTimeout(() => {
    task().catch((error) => {
      console.error(`${taskName} failed:`, {
        error: getErrorMessage(error),
      });
    });
  }, 0);
}

export function startSourceSyncInBackground({
  sourceId,
  userId,
  organizationId,
  reason = "manual",
}: {
  sourceId: string;
  userId: string;
  organizationId: string;
  reason?: "connect" | "manual" | "sync_all" | "nightly";
}) {
  const lockKey = `${organizationId}:${userId}:${sourceId}`;

  if (runningSourceSyncs.has(lockKey)) {
    return {
      started: false,
      alreadyRunning: true,
      sourceId,
      message: "Sync is already running for this source.",
    };
  }

  runningSourceSyncs.add(lockKey);

  runDetached(`Background source sync (${reason})`, async () => {
    const startedAt = Date.now();

    try {
      console.log("Background source sync started:", {
        sourceId,
        userId,
        organizationId,
        reason,
      });

      const result = await syncSourceToKnowledge({
        sourceId,
        userId,
        organizationId,
      });

      console.log("Background source sync completed:", {
        sourceId,
        userId,
        organizationId,
        reason,
        durationMs: Date.now() - startedAt,
        result,
      });
    } catch (error) {
      console.error("Background source sync failed:", {
        sourceId,
        userId,
        organizationId,
        reason,
        durationMs: Date.now() - startedAt,
        error: getErrorMessage(error),
      });
    } finally {
      runningSourceSyncs.delete(lockKey);
    }
  });

  return {
    started: true,
    alreadyRunning: false,
    sourceId,
    message: "Sync started in background.",
  };
}

export function startAllSourcesSyncInBackground({
  userId,
  organizationId,
  reason = "sync_all",
}: {
  userId: string;
  organizationId: string;
  reason?: "sync_all" | "nightly";
}) {
  runDetached(`Background sync all (${reason})`, async () => {
    const startedAt = Date.now();

    console.log("Background sync all started:", {
      userId,
      organizationId,
      reason,
    });

    const results = await syncAllConnectedSourcesToKnowledge({
      userId,
      organizationId,
    });

    console.log("Background sync all completed:", {
      userId,
      organizationId,
      reason,
      durationMs: Date.now() - startedAt,
      results,
    });
  });

  return {
    started: true,
    message: "All connected sources sync started in background.",
  };
}