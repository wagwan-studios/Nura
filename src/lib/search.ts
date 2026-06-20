import { prisma } from "@/lib/prisma";
import type { KnowledgeEntry, Source } from "@prisma/client";

export type SearchResult = KnowledgeEntry & { source: Source | null; score: number };

/**
 * Simple relevance scoring over title/summary/content/tags.
 * Keeps the MVP dependency-free; swap for pgvector embeddings as the corpus grows.
 */
export async function searchKnowledge(organizationId: string, query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  const entries = await prisma.knowledgeEntry.findMany({
    where: {
      organizationId,
      status: { not: "ARCHIVED" },
      OR: terms.map((term) => ({
        OR: [
          { title: { contains: term, mode: "insensitive" as const } },
          { summary: { contains: term, mode: "insensitive" as const } },
          { content: { contains: term, mode: "insensitive" as const } },
          { tags: { has: term } },
        ],
      })),
    },
    include: { source: true },
  });

  const scored = entries.map((entry) => {
    const haystacks = {
      title: entry.title.toLowerCase(),
      summary: entry.summary.toLowerCase(),
      content: entry.content.toLowerCase(),
      tags: entry.tags.map((t) => t.toLowerCase()),
    };

    let score = 0;
    for (const term of terms) {
      if (haystacks.title.includes(term)) score += 5;
      if (haystacks.summary.includes(term)) score += 3;
      if (haystacks.tags.some((t) => t.includes(term))) score += 4;
      if (haystacks.content.includes(term)) score += 1;
    }

    return { ...entry, score };
  });

  return scored.sort((a, b) => b.score - a.score).filter((e) => e.score > 0);
}
