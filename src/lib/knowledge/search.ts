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
};

export async function searchKnowledge({
  query,
  userId,
  organizationId,
  limit = 8,
}: {
  query: string;
  userId: string;
  organizationId: string;
  limit?: number;
}) {
  await ensureQdrantCollection();

  const embedding = await createEmbedding(query);

  const result = await qdrant.search(QDRANT_COLLECTION, {
    vector: embedding,
    limit,
    with_payload: true,
    filter: {
      must: [
        {
          key: "organizationId",
          match: {
            value: organizationId,
          },
        },
      ],
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
    };
  });
}