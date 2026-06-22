import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/ai/provider";
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";
import { ensureQdrantCollection } from "@/lib/qdrant/setup";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.user.organizationId as string;

    const body = await req.json().catch(() => ({}));

    const limit = Math.min(Number(body.limit || 100), 500);
    const cursor = body.cursor ? String(body.cursor) : undefined;

    await ensureQdrantCollection();

    const chunks = await prisma.knowledgeChunk.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        id: "asc",
      },
      take: limit,
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
      include: {
        rawRecord: true,
      },
    });

    if (chunks.length === 0) {
      return NextResponse.json({
        ok: true,
        done: true,
        processed: 0,
        nextCursor: null,
      });
    }

    let processed = 0;

    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk.content);

      await qdrant.upsert(QDRANT_COLLECTION, {
        wait: true,
        points: [
          {
            id: chunk.id,
            vector: embedding,
            payload: {
              chunkId: chunk.id,
              content: chunk.content,
              sourceId: chunk.sourceId,
              rawRecordId: chunk.rawRecordId,
              userId: chunk.userId,
              organizationId: chunk.organizationId,
              visibility: chunk.visibility,
              provider: chunk.rawRecord?.provider ?? null,
              recordType: chunk.rawRecord?.recordType ?? null,
              title: chunk.rawRecord?.title ?? null,
            },
          },
        ],
      });

      processed += 1;
    }

    const nextCursor = chunks[chunks.length - 1]?.id || null;

    return NextResponse.json({
      ok: true,
      done: false,
      processed,
      nextCursor,
    });
  } catch (error) {
    console.error("Vector rebuild failed:", error);

    return NextResponse.json(
      {
        error: "Vector rebuild failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}