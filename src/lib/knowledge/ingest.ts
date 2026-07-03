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

type PreparedChunk = {
  id: string;
  content: string;
  embedding: number[];
};

function validateEmbeddingDimension(vector: number[]) {
  const expected = Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536");

  if (vector.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${expected}, got ${vector.length}.`
    );
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function indexRawRecord(input: IngestInput, rawRecordId: string) {
  const chunks = chunkText(input.content);

  if (!chunks.length) {
    return {
      chunksCreated: 0,
      vectorIndexed: true,
    };
  }

  const preparedChunks: PreparedChunk[] = [];

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);
    validateEmbeddingDimension(embedding);

    preparedChunks.push({
      id: crypto.randomUUID(),
      content: chunk,
      embedding,
    });
  }

  const oldChunks = await prisma.knowledgeChunk.findMany({
    where: {
      rawRecordId,
    },
    select: {
      id: true,
    },
  });

  if (oldChunks.length > 0) {
    try {
      await qdrant.delete(QDRANT_COLLECTION, {
        points: oldChunks.map((chunk) => chunk.id),
      });
    } catch (error) {
      console.error("Qdrant old chunk delete failed, continuing:", {
        rawRecordId,
        error: getErrorMessage(error),
      });
    }
  }

  await prisma.knowledgeChunk.deleteMany({
    where: {
      rawRecordId,
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: preparedChunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      visibility: input.visibility ?? "PERSONAL",
      rawRecordId,
      sourceId: input.sourceId,
      userId: input.userId,
      organizationId: input.organizationId,
    })),
  });

  let vectorIndexed = true;

  try {
    await ensureQdrantCollection();

    await qdrant.upsert(QDRANT_COLLECTION, {
      wait: true,
      points: preparedChunks.map((chunk) => ({
        id: chunk.id,
        vector: chunk.embedding,
        payload: {
          chunkId: chunk.id,
          content: chunk.content,
          provider: input.provider,
          recordType: input.recordType,
          sourceId: input.sourceId,
          rawRecordId,
          userId: input.userId,
          organizationId: input.organizationId,
          visibility: input.visibility ?? "PERSONAL",
          title: input.title ?? null,
        },
      })),
    });
  } catch (error) {
    vectorIndexed = false;

    console.error("Qdrant vector upsert failed after chunks were saved:", {
      rawRecordId,
      sourceId: input.sourceId,
      provider: input.provider,
      recordType: input.recordType,
      error: getErrorMessage(error),
    });
  }

  return {
    chunksCreated: preparedChunks.length,
    vectorIndexed,
  };
}

export async function ingestRawRecord(input: IngestInput) {
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

  try {
    const indexResult = await indexRawRecord(input, rawRecord.id);

    return {
      rawRecord,
      chunksCreated: indexResult.chunksCreated,
      indexingFailed: false,
      vectorIndexed: indexResult.vectorIndexed,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("Knowledge indexing failed, raw record was still synced:", {
      rawRecordId: rawRecord.id,
      sourceId: input.sourceId,
      provider: input.provider,
      recordType: input.recordType,
      error: message,
    });

    return {
      rawRecord,
      chunksCreated: 0,
      indexingFailed: true,
      indexingError: message,
      vectorIndexed: false,
    };
  }
}