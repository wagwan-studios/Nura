import { NextResponse } from "next/server";
import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";
import { ensureQdrantCollection } from "@/lib/qdrant/setup";

export async function GET() {
  try {
    await ensureQdrantCollection();

    const collections = await qdrant.getCollections();
    const info = await qdrant.getCollection(QDRANT_COLLECTION);

    return NextResponse.json({
      ok: true,
      collection: QDRANT_COLLECTION,
      collections: collections.collections,
      info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}