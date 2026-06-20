import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function synthesizeAnswer(query: string, results: { title: string; summary: string; content: string }[]) {
  const anthropic = getAnthropicClient();
  if (!anthropic || results.length === 0) return null;

  const context = results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.summary}\n${r.content}`)
    .join("\n\n---\n\n");

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are Nura, a company memory assistant. Answer the question below using ONLY the provided institutional knowledge entries. Cite entries inline using [1], [2], etc. If the entries don't answer the question, say so.\n\nQuestion: ${query}\n\nKnowledge entries:\n${context}`,
      },
    ],
  });

  const text = message.content.find((block) => block.type === "text");
  return text && text.type === "text" ? text.text : null;
}
