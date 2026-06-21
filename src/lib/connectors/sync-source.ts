import { prisma } from "@/lib/prisma";
import { getConnectorAdapter } from "@/lib/connectors/registry";

export async function syncSourceToKnowledge({
  sourceId,
  userId,
  organizationId,
}: {
  sourceId: string;
  userId: string;
  organizationId: string;
}) {
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

  const result = await adapter.sync({
    sourceId: source.id,
    userId,
    organizationId,
  });

  await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      status: "CONNECTED",
      lastSyncAt: new Date(),
    },
  });

  return result;
}

export async function syncAllConnectedSourcesToKnowledge({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const sources = await prisma.source.findMany({
    where: {
      organizationId,
      status: "CONNECTED",
      connectedAccounts: {
        some: {
          userId,
          accessToken: { not: null },
          revokedAt: null,
        },
      },
    },
  });

  const results = [];

  for (const source of sources) {
    const adapter = getConnectorAdapter(source.type);

    if (!adapter) {
      results.push({
        sourceId: source.id,
        type: source.type,
        ok: false,
        skipped: true,
        message: `No adapter for ${source.type}`,
      });

      continue;
    }

    try {
      const result = await syncSourceToKnowledge({
        sourceId: source.id,
        userId,
        organizationId,
      });

      results.push({
        sourceId: source.id,
        type: source.type,
        ok: true,
        result,
      });
    } catch (error) {
      results.push({
        sourceId: source.id,
        type: source.type,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}