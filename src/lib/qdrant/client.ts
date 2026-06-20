import { QdrantClient } from "@qdrant/js-client-rest";

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

if (!url) {
  throw new Error("QDRANT_URL is missing");
}

export const qdrant = new QdrantClient({
  url,
  apiKey: apiKey || undefined,
});

export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION || "nura_knowledge";