import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/ai/chunk";
import { createEmbedding } from "@/lib/ai/provider";
import { KnowledgeVisibility, SourceType } from "@prisma/client";
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";
import { ensureQdrantCollection } from "@/lib/qdrant/setup";

type IngestInput = {
  provider: SourceType;
  recordType: string;
  externalId: string;
  title?: string;
  content: string;
  payload: unknown;
  sourceId: string;
  userId: string;
  organizationId: string;
  visibility?: KnowledgeVisibility;
};

function validateEmbeddingDimension(vector: number[]) {
  const expected = Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536");

  if (vector.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${expected}, got ${vector.length}.`
    );
  }
}

export async function ingestRawRecord(input: IngestInput) {
  await ensureQdrantCollection();

  const rawRecord = await prisma.rawSourceRecord.upsert({
    where: {
      sourceId_externalId: {
        sourceId: input.sourceId,
        externalId: input.externalId,
      },
    },
    update: {
      provider: input.provider,
      recordType: input.recordType,
      title: input.title,
      content: input.content,
      payload: input.payload as any,
      syncedAt: new Date(),
    },
    create: {
      provider: input.provider,
      recordType: input.recordType,
      externalId: input.externalId,
      title: input.title,
      content: input.content,
      payload: input.payload as any,
      sourceId: input.sourceId,
      userId: input.userId,
      organizationId: input.organizationId,
    },
  });

  const oldChunks = await prisma.knowledgeChunk.findMany({
    where: {
      rawRecordId: rawRecord.id,
    },
    select: {
      id: true,
    },
  });

  if (oldChunks.length > 0) {
    await qdrant.delete(QDRANT_COLLECTION, {
      points: oldChunks.map((chunk) => chunk.id),
    });
  }

  await prisma.knowledgeChunk.deleteMany({
    where: {
      rawRecordId: rawRecord.id,
    },
  });

  const chunks = chunkText(input.content);

  for (const chunk of chunks) {
    const chunkId = crypto.randomUUID();
    const embedding = await createEmbedding(chunk);

    validateEmbeddingDimension(embedding);

    await prisma.knowledgeChunk.create({
      data: {
        id: chunkId,
        content: chunk,
        visibility: input.visibility ?? "PERSONAL",
        rawRecordId: rawRecord.id,
        sourceId: input.sourceId,
        userId: input.userId,
        organizationId: input.organizationId,
      },
    });

    await qdrant.upsert(QDRANT_COLLECTION, {
      wait: true,
      points: [
        {
          id: chunkId,
          vector: embedding,
          payload: {
            chunkId,
            content: chunk,
            provider: input.provider,
            recordType: input.recordType,
            sourceId: input.sourceId,
            rawRecordId: rawRecord.id,
            userId: input.userId,
            organizationId: input.organizationId,
            visibility: input.visibility ?? "PERSONAL",
            title: input.title ?? null,
          },
        },
      ],
    });
  }

  return {
    rawRecord,
    chunksCreated: chunks.length,
  };
}