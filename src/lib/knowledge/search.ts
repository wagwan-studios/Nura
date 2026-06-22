import { createEmbedding } from "@/lib/ai/provider";
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";
import { ensureQdrantCollection } from "@/lib/qdrant/setup";

type QdrantPayload = {
  chunkId?: string;
  content?: string;
  sourceId?: string;
  rawRecordId?: string;
  userId?: string;
  organizationId?: string;
  visibility?: "PERSONAL" | "ORGANIZATION";
  provider?: string;
  recordType?: string;
  title?: string;
};

export async function searchKnowledge({
  query,
  userId,
  organizationId,
  provider,
  recordType,
  limit = 20,
}: {
  query: string;
  userId: string;
  organizationId: string;
  provider?: string | null;
  recordType?: string | null;
  limit?: number;
}) {
  await ensureQdrantCollection();

  const embedding = await createEmbedding(query);

  const mustFilters: any[] = [
    {
      key: "organizationId",
      match: {
        value: organizationId,
      },
    },
  ];

  if (provider) {
    mustFilters.push({
      key: "provider",
      match: {
        value: provider,
      },
    });
  }

  if (recordType) {
    mustFilters.push({
      key: "recordType",
      match: {
        value: recordType,
      },
    });
  }

  const result = await qdrant.search(QDRANT_COLLECTION, {
    vector: embedding,
    limit,
    with_payload: true,
    filter: {
      must: mustFilters,
      should: [
        {
          key: "userId",
          match: {
            value: userId,
          },
        },
        {
          key: "visibility",
          match: {
            value: "ORGANIZATION",
          },
        },
      ],
    },
  });

  return result.map((item) => {
    const payload = item.payload as QdrantPayload;

    return {
      id: String(item.id),
      content: payload.content || "",
      sourceId: payload.sourceId || null,
      rawRecordId: payload.rawRecordId || null,
      similarity: item.score || 0,
      provider: payload.provider || null,
      recordType: payload.recordType || null,
      title: payload.title || null,
    };
  });
}
