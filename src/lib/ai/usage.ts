import { prisma } from "@/lib/prisma";

type LogAiJobInput = {
  organizationId: string;
  jobType:
    | "query_planner"
    | "ask_nura_answer"
    | "embedding"
    | "vector_rebuild"
    | "source_sync";
  provider?: string | null;
  model?: string | null;
  latencyMs?: number;
  success?: boolean;
  tokensUsed?: number;
  costUsd?: number;
};

export async function logAiJob(input: LogAiJobInput) {
  try {
    await prisma.aiJob.create({
      data: {
        organizationId: input.organizationId,
        jobType: input.jobType,
        source: [input.provider, input.model].filter(Boolean).join(":") || null,
        latencyMs: Math.max(0, Math.round(input.latencyMs || 0)),
        success: input.success ?? true,
        tokensUsed: Math.max(0, Math.round(input.tokensUsed || 0)),
        costUsd: Number(input.costUsd || 0),
      },
    });
  } catch (error) {
    console.error("Failed to log AI job:", {
      jobType: input.jobType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function estimateAiCostUsd({
  provider,
  model,
  inputTokens,
  outputTokens,
}: {
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const p = String(provider || "").toLowerCase();
  const m = String(model || "").toLowerCase();

  const input = Number(inputTokens || 0);
  const output = Number(outputTokens || 0);

  // Default safe estimate. Later you can replace with exact pricing table.
  let inputPerMillion = 0;
  let outputPerMillion = 0;

  if (p.includes("openrouter") || p.includes("openai-compatible")) {
    if (m.includes("gemini-2.5-flash")) {
      inputPerMillion = 0.3;
      outputPerMillion = 2.5;
    } else if (m.includes("gpt-4o-mini")) {
      inputPerMillion = 0.15;
      outputPerMillion = 0.6;
    } else {
      inputPerMillion = 0.2;
      outputPerMillion = 0.8;
    }
  }

  if (p.includes("groq")) {
    inputPerMillion = 0.05;
    outputPerMillion = 0.08;
  }

  if (p.includes("gemini")) {
    inputPerMillion = 0.3;
    outputPerMillion = 2.5;
  }

  return Number(
    ((input / 1_000_000) * inputPerMillion +
      (output / 1_000_000) * outputPerMillion).toFixed(8)
  );
}