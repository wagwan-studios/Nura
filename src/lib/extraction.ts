import { getAnthropicClient } from "@/lib/anthropic";
import { KnowledgeType } from "@prisma/client";

export type ExtractedEntry = {
  title: string;
  type: KnowledgeType;
  summary: string;
  content: string;
  tags: string[];
  citations: { excerpt: string; author?: string }[];
};

const VALID_TYPES: KnowledgeType[] = ["PROCESS", "DECISION", "EXCEPTION", "POLICY"];

/**
 * Extracts structured knowledge entries from a raw transcript (Slack thread, email
 * chain, doc, etc.) using Claude. Falls back to a single raw draft entry when no
 * ANTHROPIC_API_KEY is configured, so the ingestion flow still works end to end in dev.
 */
export async function extractKnowledge(text: string, sourceName: string): Promise<ExtractedEntry[]> {
  const anthropic = getAnthropicClient();

  if (!anthropic) {
    return [
      {
        title: `Raw capture from ${sourceName}`,
        type: "PROCESS",
        summary: text.slice(0, 160).trim() + (text.length > 160 ? "…" : ""),
        content: text.trim(),
        tags: ["unprocessed"],
        citations: [{ excerpt: text.slice(0, 280).trim() }],
      },
    ];
  }

  const prompt = `You are Nura, a system that turns raw workplace conversations into structured institutional knowledge.

Read the transcript below from "${sourceName}" and extract any reusable processes, decisions, exceptions, or policies. For each one, produce a JSON object with:
- title: short, action-oriented title
- type: one of PROCESS, DECISION, EXCEPTION, POLICY
- summary: one sentence an AI agent or new hire could act on
- content: a markdown write-up with the full context, steps, and rationale
- tags: 2-5 lowercase keyword tags
- citations: array of { excerpt, author } pulled verbatim from the transcript that support this entry

If nothing reusable is in the transcript, return an empty array.

Respond with ONLY a JSON array, no other text.

Transcript:
${text}`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  let raw = block.text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object" && item.title && item.content)
      .map((item) => ({
        title: String(item.title),
        type: VALID_TYPES.includes(item.type) ? item.type : "PROCESS",
        summary: String(item.summary ?? item.title),
        content: String(item.content),
        tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 5) : [],
        citations: Array.isArray(item.citations)
          ? item.citations
              .filter((c: unknown) => c && typeof c === "object" && (c as { excerpt?: unknown }).excerpt)
              .map((c: { excerpt: string; author?: string }) => ({
                excerpt: String(c.excerpt),
                author: c.author ? String(c.author) : undefined,
              }))
          : [],
      }));
  } catch {
    return [];
  }
}
