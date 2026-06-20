import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/ai/provider";

export async function GET() {
  const embedding = await createEmbedding("Nura embedding dimension test");

  return NextResponse.json({
    dimension: embedding.length,
    preview: embedding.slice(0, 10),
  });
}