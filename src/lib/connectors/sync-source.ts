import { prisma } from "@/lib/prisma";
import { getConnectorAdapter } from "@/lib/connectors/registry";

type SourceSyncInput = {
  sourceId: string;
  userId: string;
  organizationId: string;
};

type SyncAllInput = {
  userId: string;
  organizationId: string;
  concurrency?: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isReconnectRequiredError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("invalid_grant") ||
    message.includes("token revoked") ||
    message.includes("refresh failed") ||
    message.includes("unauthorized") ||
    message.includes("access_denied")
  );
}

async function markSourceConnected(sourceId: string) {
  try {
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to mark source connected:", {
      sourceId,
      error: getErrorMessage(error),
    });
  }
}

async function markSourceError(sourceId: string) {
  try {
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: "ERROR",
      },
    });
  } catch (error) {
    console.error("Failed to mark source error:", {
      sourceId,
      error: getErrorMessage(error),
    });
  }
}

export async function syncSourceToKnowledge({
  sourceId,
  userId,
  organizationId,
}: SourceSyncInput) {
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      organizationId,
    },
  });

  if (!source) {
    throw new Error("Source not found.");
  }

  const adapter = getConnectorAdapter(source.type);

  if (!adapter) {
    throw new Error(`No sync adapter found for source type: ${source.type}`);
  }

  try {
    const result = await adapter.sync({
      sourceId: source.id,
      userId,
      organizationId,
    });

    await markSourceConnected(source.id);

    return {
      ok: true,
      ...result,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("Source sync failed:", {
      sourceId: source.id,
      type: source.type,
      error: message,
    });

    // Only mark source ERROR if real auth/token issue.
    // Do not disconnect/hide source because embedding/Qdrant failed.
    if (isReconnectRequiredError(error)) {
      await markSourceError(source.id);
    }

    throw error;
  }
}

async function runWithConcurrency<T, R>({
  items,
  concurrency,
  handler,
}: {
  items: T[];
  concurrency: number;
  handler: (item: T) => Promise<R>;
}) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;

      results[currentIndex] = await handler(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

export async function syncAllConnectedSourcesToKnowledge({
  userId,
  organizationId,
  concurrency = Number(process.env.SOURCE_SYNC_CONCURRENCY || "2"),
}: SyncAllInput) {
  const sources = await prisma.source.findMany({
    where: {
      organizationId,
      status: {
        in: ["CONNECTED", "ERROR"],
      },
      connectedAccounts: {
        some: {
          userId,
          accessToken: { not: null },
          revokedAt: null,
        },
      },
    },
  });

  return runWithConcurrency({
    items: sources,
    concurrency: Math.max(1, Math.min(concurrency, 5)),
    handler: async (source) => {
      const adapter = getConnectorAdapter(source.type);

      if (!adapter) {
        return {
          sourceId: source.id,
          type: source.type,
          ok: false,
          skipped: true,
          message: `No adapter for ${source.type}`,
        };
      }

      try {
        const result = await syncSourceToKnowledge({
          sourceId: source.id,
          userId,
          organizationId,
        });

        return {
          sourceId: source.id,
          type: source.type,
          ok: true,
          result,
        };
      } catch (error) {
        return {
          sourceId: source.id,
          type: source.type,
          ok: false,
          message: getErrorMessage(error),
        };
      }
    },
  });
}

export async function syncAllAutoSyncSources({
  concurrency = Number(process.env.SOURCE_SYNC_CONCURRENCY || "2"),
}: {
  concurrency?: number;
} = {}) {
  const sources = await prisma.source.findMany({
    where: {
      status: {
        in: ["CONNECTED", "ERROR"],
      },
      connectedAccounts: {
        some: {
          accessToken: { not: null },
          revokedAt: null,
        },
      },
    },
    include: {
      connectedAccounts: {
        where: {
          accessToken: { not: null },
          revokedAt: null,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  return runWithConcurrency({
    items: sources,
    concurrency: Math.max(1, Math.min(concurrency, 5)),
    handler: async (source) => {
      const account = source.connectedAccounts[0];
      const adapter = getConnectorAdapter(source.type);

      if (!account || !adapter?.supportsAutoSync) {
        return {
          sourceId: source.id,
          type: source.type,
          ok: false,
          skipped: true,
          message: "Auto sync is not available for this source.",
        };
      }

      try {
        const result = await syncSourceToKnowledge({
          sourceId: source.id,
          userId: account.userId,
          organizationId: source.organizationId,
        });

        return {
          sourceId: source.id,
          type: source.type,
          ok: true,
          result,
        };
      } catch (error) {
        return {
          sourceId: source.id,
          type: source.type,
          ok: false,
          message: getErrorMessage(error),
        };
      }
    },
  });
}
