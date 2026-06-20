import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import type { KnowledgeEntry } from "@prisma/client";

/**
 * Looks for a published entry that conflicts with a newly created draft and, if
 * Claude flags one, creates a PlatformAlert routed to the conflicting entry's
 * owner/author. No-ops if ANTHROPIC_API_KEY isn't configured, mirroring the
 * extractKnowledge fallback.
 */
export async function detectContradictions(organizationId: string, newEntry: KnowledgeEntry) {
  const anthropic = getAnthropicClient();
  if (!anthropic) return;

  const candidates = await prisma.knowledgeEntry.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      id: { not: newEntry.id },
      OR: [{ type: newEntry.type }, { tags: { hasSome: newEntry.tags } }],
    },
    take: 5,
    include: { owner: true, author: true },
  });

  if (candidates.length === 0) return;

  const prompt = `You are Nura, a system that watches for contradictions in a company's institutional knowledge base.

New draft entry:
Title: ${newEntry.title}
Summary: ${newEntry.summary}
Content: ${newEntry.content}

Existing published entries to compare against:
${candidates.map((c, i) => `[${i}] Title: ${c.title}\nSummary: ${c.summary}`).join("\n\n")}

Does the new draft entry directly contradict the policy/process/decision described in any of the existing entries above (e.g. opposite rules, conflicting thresholds, contradictory requirements)? Respond with ONLY a JSON object: { "contradictsIndex": <index number or null>, "explanation": "<one sentence>" }`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return;

  let raw = block.text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  let parsed: { contradictsIndex: number | null; explanation?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (parsed.contradictsIndex === null || parsed.contradictsIndex === undefined) return;
  const candidate = candidates[parsed.contradictsIndex];
  if (!candidate) return;

  await prisma.platformAlert.create({
    data: {
      severity: "WARNING",
      organizationId,
      relatedEntryId: newEntry.id,
      assignedToId: candidate.ownerId ?? candidate.authorId ?? null,
      title: `Possible conflict: "${newEntry.title}" vs "${candidate.title}"`,
      description: parsed.explanation ?? `"${newEntry.title}" may contradict "${candidate.title}".`,
      actionLabel: "Review conflict",
    },
  });
}
