import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";

async function ensurePayloadIndex(fieldName: string) {
  try {
    await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
      field_name: fieldName,
      field_schema: "keyword",
      wait: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("already exists") ||
      message.includes("Conflict") ||
      message.includes("409")
    ) {
      return;
    }

    throw error;
  }
}

export async function ensureQdrantCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === QDRANT_COLLECTION
  );

  if (!exists) {
    const size = Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536");

    await qdrant.createCollection(QDRANT_COLLECTION, {
      vectors: {
        size,
        distance: "Cosine",
      },
    });
  }

  await ensurePayloadIndex("organizationId");
  await ensurePayloadIndex("userId");
  await ensurePayloadIndex("visibility");
  await ensurePayloadIndex("sourceId");
  await ensurePayloadIndex("rawRecordId");
  await ensurePayloadIndex("provider");
  await ensurePayloadIndex("recordType");
}
// import { qdrant, QDRANT_COLLECTION } from "@/lib/qdrant/client";

// export async function ensureQdrantCollection() {
//   const collections = await qdrant.getCollections();

//   const exists = collections.collections.some(
//     (collection) => collection.name === QDRANT_COLLECTION
//   );

//   if (exists) return;

//   const size = Number(process.env.AI_EMBEDDING_DIMENSIONS || "1536");

//   await qdrant.createCollection(QDRANT_COLLECTION, {
//     vectors: {
//       size,
//       distance: "Cosine",
//     },
//   });
// }