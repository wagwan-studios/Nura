import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAskNuraAnswer,
  saveAskNuraConversationAndCache,
} from "@/lib/ask-nura/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "@/lib/knowledge/search";
import { generateChatAnswerWithUsage } from "@/lib/ai/provider";
import { planAskNuraQueryWithUsage } from "@/lib/ask-nura/query-planner";
import { estimateAiCostUsd, logAiJob } from "@/lib/ai/usage";


type PremiumSource = {
  number: number;
  id: string;
  sourceId: string | null;
  rawRecordId: string | null;
  similarity: number;
  preview: string;
  provider?: string | null;
  recordType?: string | null;
  title?: string | null;
  time?: string | null;
};

async function logAskNuraModelUsage({
  organizationId,
  jobType,
  provider,
  model,
  inputTokens,
  outputTokens,
  totalTokens,
  latencyMs,
  success = true,
}: {
  organizationId: string;
  jobType: "query_planner" | "ask_nura_answer";
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  success?: boolean;
}) {
  await logAiJob({
    organizationId,
    jobType,
    provider,
    model,
    latencyMs,
    success,
    tokensUsed: totalTokens || 0,
    costUsd: estimateAiCostUsd({
      provider,
      model,
      inputTokens,
      outputTokens,
    }),
  });
}

function normalizeProviderName(provider?: string | null) {
  if (!provider) return "Source";

  return provider
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRecordType(recordType?: string | null) {
  if (!recordType) return null;

  return recordType
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getConfidenceLabel({
  sources,
  queryConfidence,
}: {
  sources: PremiumSource[];
  queryConfidence?: number | null;
}) {
  const sourceCount = sources.length;

  const avgSimilarity =
    sourceCount > 0
      ? sources.reduce((sum, source) => sum + Number(source.similarity || 0), 0) /
        sourceCount
      : 0;

  if (sourceCount >= 8 || avgSimilarity >= 0.78) {
    return "High confidence";
  }

  if (sourceCount >= 2 || avgSimilarity >= 0.55 || Number(queryConfidence) >= 0.55) {
    return "Medium confidence";
  }

  if (sourceCount >= 1) {
    return "Low confidence";
  }

  return "Not enough context";
}

function getAnswerStatus(sources: PremiumSource[]) {
  if (sources.length >= 1) return "FOUND ANSWER";

  return "NOT ENOUGH CONTEXT";
}

function buildWhyNuraSaysThis({
  sources,
  queryPlan,
}: {
  sources: PremiumSource[];
  queryPlan?: any;
}) {
  if (!sources.length) {
    return "Nura could not find matching indexed evidence from the connected sources, so it cannot confidently prove this answer yet.";
  }

  const providers = Array.from(
    new Set(sources.map((source) => normalizeProviderName(source.provider)).filter(Boolean))
  );

  const recordTypes = Array.from(
    new Set(
      sources
        .map((source) => normalizeRecordType(source.recordType))
        .filter(Boolean)
    )
  );

  const providerText =
    providers.length === 1
      ? providers[0]
      : providers.length > 1
        ? providers.slice(0, -1).join(", ") + " and " + providers[providers.length - 1]
        : "connected sources";

  const recordText =
    recordTypes.length === 1
      ? recordTypes[0]
      : recordTypes.length > 1
        ? recordTypes.slice(0, -1).join(", ") + " and " + recordTypes[recordTypes.length - 1]
        : "records";

  const filters: string[] = [];

  if (queryPlan?.filters?.people?.length) {
    filters.push(`people: ${queryPlan.filters.people.join(", ")}`);
  }

  if (queryPlan?.filters?.repo) {
    filters.push(`repo: ${queryPlan.filters.repo}`);
  }

  if (queryPlan?.filters?.repos?.length) {
    filters.push(`repos: ${queryPlan.filters.repos.join(", ")}`);
  }

  if (queryPlan?.filters?.keyword) {
    filters.push(`keyword: ${queryPlan.filters.keyword}`);
  }

  const filterText = filters.length
    ? ` It also used the requested filters for ${filters.join("; ")}.`
    : "";

  return `Nura found ${sources.length} relevant indexed source${
    sources.length === 1 ? "" : "s"
  } from ${providerText}. The matched evidence includes ${recordText}, so the answer is based on actual connected company knowledge instead of a general AI guess.${filterText}`;
}

function buildMissingInfo({
  sources,
  queryPlan,
}: {
  sources: PremiumSource[];
  queryPlan?: any;
}) {
  if (!sources.length) {
    return "No matching indexed data was found. Sync the related sources or ask with more specific repo names, people, channels, emails, or dates.";
  }

  const missingParts: string[] = [];

  if (queryPlan?.providers?.length) {
    const foundProviders = new Set(
      sources.map((source) => String(source.provider || "").toUpperCase())
    );

    const missingProviders = queryPlan.providers.filter(
      (provider: string) => !foundProviders.has(String(provider).toUpperCase())
    );

    if (missingProviders.length) {
      missingParts.push(
        `No strong evidence was found from ${missingProviders.join(", ")} for this answer.`
      );
    }
  }

  if (sources.length >= 20) {
    missingParts.push(
      "Many records matched, so Nura summarized the most relevant patterns instead of listing every raw item."
    );
  }

  if (!missingParts.length) {
    missingParts.push(
      "Some details may be missing if a source was not recently synced or if older records were not indexed."
    );
  }

  return missingParts.join(" ");
}

function createAskNuraJsonResponse({
  answer,
  sources,
  queryPlan,
  cached = false,
}: {
  answer: string;
  sources: PremiumSource[];
  queryPlan?: any;
  cached?: boolean;
}) {
  const premium = buildPremiumAnswer({
    answer,
    sources,
    queryPlan,
  });

  return NextResponse.json({
    answer,
    premium,
    sources,
    cached,
  });
}

function detectProvider(question: string) {
  const q = question.toLowerCase();

  if (
    q.includes("github") ||
    q.includes("repo") ||
    q.includes("repository") ||
    q.includes("commit") ||
    q.includes("pull request") ||
    q.includes("pr ")
  ) {
    return "GITHUB";
  }

  if (
    q.includes("slack") ||
    q.includes("channel") ||
    q.includes("message") ||
    q.includes("thread")
  ) {
    return "SLACK";
  }
  if (
  q.includes("gmail") ||
  q.includes("email") ||
  q.includes("mail") ||
  q.includes("inbox")
) {
  return "GMAIL";
}

  return null;
}

function isGithubRepoListQuestion(question: string) {
  const q = question.toLowerCase();

  const isRepoQuestion =
    q.includes("github") ||
    q.includes("repo") ||
    q.includes("repository") ||
    q.includes("repositories");

  const isListIntent =
    q.includes("list") ||
    q.includes("connected") ||
    q.includes("show all") ||
    q.includes("what repositories are connected") ||
    q.includes("which repositories are connected");

  const isFilterQuestion =
    q.includes("typescript") ||
    q.includes("javascript") ||
    q.includes("php") ||
    q.includes("python") ||
    q.includes("use") ||
    q.includes("using") ||
    q.includes("built with") ||
    q.includes("language");

  return isRepoQuestion && isListIntent && !isFilterQuestion;
}

function isGithubRepoLanguageQuestion(question: string) {
  const q = question.toLowerCase();

  return (
    (q.includes("repo") || q.includes("repository") || q.includes("repositories")) &&
    (q.includes("typescript") ||
      q.includes("javascript") ||
      q.includes("php") ||
      q.includes("python") ||
      q.includes("laravel") ||
      q.includes("next") ||
      q.includes("react") ||
      q.includes("language") ||
      q.includes("use") ||
      q.includes("using") ||
      q.includes("built with"))
  );
}

function detectRequestedLanguage(question: string) {
  const q = question.toLowerCase();

  if (q.includes("typescript")) return "TypeScript";
  if (q.includes("javascript")) return "JavaScript";
  if (q.includes("php")) return "PHP";
  if (q.includes("python")) return "Python";

  return null;
}

function isSlackChannelListQuestion(question: string) {
  const q = question.toLowerCase();

  return (
    (q.includes("slack") || q.includes("channel")) &&
    (q.includes("which") ||
      q.includes("what") ||
      q.includes("list") ||
      q.includes("connected") ||
      q.includes("indexed") ||
      q.includes("show"))
  );
}

function formatChunkForAi(chunk: any) {
  const content = chunk.content || "";

  return `Evidence item
Provider: ${chunk.provider ?? "Unknown"}
Record type: ${chunk.recordType ?? "Unknown"}
Title: ${chunk.title ?? "Untitled"}

Readable content:
${content}

Instruction:
Use this evidence to answer the user. Do not mention evidence numbers, source numbers, raw IDs, vector IDs, or similarity scores. Source cards are shown separately in the UI.`;
}

function formatSourcePreview(content: string) {
  return content
    .replace(/Channel ID:\s*\S+/gi, "")
    .replace(/Message User:\s*\S+/gi, "")
    .replace(/Slack Channel:\s*dm-\S+/gi, "Slack DM")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function formatSlackTimeFromContent(content: string) {
  const oldMatch = content.match(/Message Time:\s*([0-9.]+)/i);
  const newMatch = content.match(/Time:\s*([^\n]+)/i);

  if (newMatch?.[1]) {
    const value = newMatch[1].trim();
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  if (oldMatch?.[1]) {
    const timestamp = Number(oldMatch[1].split(".")[0]) * 1000;

    if (timestamp && !Number.isNaN(timestamp)) {
      return new Date(timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  }

  return null;
}

function extractSlackMessage(content: string) {
  const match = content.match(/Message:\s*([\s\S]*)/i);
  return match?.[1]?.trim() || content;
}

// function isRecentGmailQuestion(question: string) {
//   const q = question.toLowerCase();

//   return (
//     (q.includes("gmail") ||
//       q.includes("email") ||
//       q.includes("mail") ||
//       q.includes("inbox")) &&
//     (q.includes("recent") ||
//       q.includes("latest") ||
//       q.includes("available") ||
//       q.includes("summarize") ||
//       q.includes("show"))
//   );
// }

// function extractEmailPreview(content: string) {
//   const subject = content.match(/Email Subject:\s*([^\n]+)/i)?.[1]?.trim();
//   const from = content.match(/From:\s*([^\n]+)/i)?.[1]?.trim();
//   const date = content.match(/Date:\s*([^\n]+)/i)?.[1]?.trim();
//   const snippet = content.match(/Snippet:\s*([^\n]+)/i)?.[1]?.trim();
//   const body = content.match(/Body:\s*([\s\S]*)/i)?.[1]?.trim();

//   return {
//     subject: subject || "No subject",
//     from: from || "Unknown sender",
//     date: date || null,
//     preview: (snippet || body || content).slice(0, 260),
//   };
// }
function isGmailQuestion(question: string) {
  const q = question.toLowerCase();

  return (
    q.includes("gmail") ||
    q.includes("email") ||
    q.includes("emails") ||
    q.includes("mail") ||
    q.includes("inbox")
  );
}

function isGmailSummaryQuestion(question: string) {
  const q = question.toLowerCase();

  return (
    isGmailQuestion(question) &&
    (q.includes("summarize") ||
      q.includes("summary") ||
      q.includes("recent") ||
      q.includes("latest") ||
      q.includes("show") ||
      q.includes("available") ||
      q.includes("from") ||
      q.includes("about") ||
      q.includes("mention") ||
      q.includes("mentions"))
  );
}

function extractGmailFilter(question: string) {
  const q = question.trim();

  const fromMatch = q.match(/\bfrom\s+(.+?)(?:\?|$)/i);
  const aboutMatch = q.match(/\babout\s+(.+?)(?:\?|$)/i);
  const mentionMatch = q.match(/\bmentions?\s+(.+?)(?:\?|$)/i);
  const subjectMatch = q.match(/\bsubject\s+(.+?)(?:\?|$)/i);

  if (fromMatch?.[1]) {
    return {
      type: "from",
      value: fromMatch[1].trim(),
    };
  }

  if (aboutMatch?.[1]) {
    return {
      type: "keyword",
      value: aboutMatch[1].trim(),
    };
  }

  if (mentionMatch?.[1]) {
    return {
      type: "keyword",
      value: mentionMatch[1].trim(),
    };
  }

  if (subjectMatch?.[1]) {
    return {
      type: "subject",
      value: subjectMatch[1].trim(),
    };
  }

  return null;
}

function parseEmailContent(content: string) {
  const subject = content.match(/Email Subject:\s*([^\n]+)/i)?.[1]?.trim();
  const from = content.match(/From:\s*([^\n]+)/i)?.[1]?.trim();
  const to = content.match(/To:\s*([^\n]+)/i)?.[1]?.trim();
  const date = content.match(/Date:\s*([^\n]+)/i)?.[1]?.trim();
  const snippet = content.match(/Snippet:\s*([^\n]+)/i)?.[1]?.trim();
  const body = content.match(/Body:\s*([\s\S]*)/i)?.[1]?.trim();

  return {
    subject: subject || "No subject",
    from: from || "Unknown sender",
    to: to || "",
    date: date || null,
    body: body || "",
    preview: (snippet || body || content).slice(0, 500),
  };
}

function emailMatchesFilter(record: any, filter: { type: string; value: string } | null) {
  if (!filter) return true;

  const content = String(record.content || "");
  const parsed = parseEmailContent(content);
  const value = filter.value.toLowerCase();

  if (filter.type === "from") {
    return parsed.from.toLowerCase().includes(value);
  }

  if (filter.type === "subject") {
    return parsed.subject.toLowerCase().includes(value);
  }

  return (
    parsed.subject.toLowerCase().includes(value) ||
    parsed.from.toLowerCase().includes(value) ||
    parsed.preview.toLowerCase().includes(value) ||
    parsed.body.toLowerCase().includes(value)
  );
}

function buildPremiumAnswer({
  answer,
  sources = [],
  queryPlan,
  confidence,
}: {
  answer: string;
  sources?: any[];
  queryPlan?: any;
  confidence?: number;
}) {
  const sourceCount = sources.length;

  const confidenceLabel =
    typeof confidence === "number"
      ? confidence >= 0.75
        ? "High confidence"
        : confidence >= 0.45
          ? "Medium confidence"
          : "Low confidence"
      : sourceCount >= 3
        ? "High confidence"
        : sourceCount >= 1
          ? "Medium confidence"
          : "Low confidence";

  const status =
    sourceCount > 0
      ? "FOUND ANSWER"
      : "NOT ENOUGH CONTEXT";

  const providers = Array.from(
    new Set(
      sources
        .map((source) => source.provider)
        .filter(Boolean)
    )
  );

  const why =
    sourceCount > 0
      ? `Nura used ${sourceCount} indexed source${sourceCount > 1 ? "s" : ""}${
          providers.length ? ` from ${providers.join(", ")}` : ""
        } to produce this answer. The response is based only on matched company knowledge and connected source data.`
      : "Nura could not find enough indexed evidence in your connected sources to confidently answer this.";

  const missingInfo =
    sourceCount > 0
      ? "If some work, messages, emails, or documents are missing, they may not be synced or indexed yet."
      : "No matching indexed source was found. Try syncing your sources or asking with more specific names, repos, channels, or dates.";

  return {
    status,
    confidence: confidenceLabel,
    answer,
    why,
    missingInfo,
    sources,
    sourceCount,
    intent: queryPlan?.intent || null,
    providers,
  };
}
function createPremiumResponse({
  answer,
  sources,
  queryPlan,
  cached = false,
}: {
  answer: string;
  sources: any[];
  queryPlan?: any;
  cached?: boolean;
}) {
  const premium = buildPremiumAnswer({
    answer,
    sources,
    queryPlan,
    confidence: queryPlan?.confidence,
  });

  return NextResponse.json({
    answer,
    premium,
    sources,
    cached,
    queryPlan,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const organizationId = session.user.organizationId as string;

    const body = await req.json();
    const question = String(body.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const cached = await getCachedAskNuraAnswer({
  question,
  userId,
  organizationId,
});

if (cached) {
  const cachedSources = Array.isArray(cached.sources)
    ? cached.sources
    : [];

  return createPremiumResponse({
    answer: cached.answer,
    sources: cachedSources,
    cached: true,
  });
}

const plannerStartedAt = Date.now();
const plannerResult = await planAskNuraQueryWithUsage(question);
const queryPlan = plannerResult.plan;

if (plannerResult.usage) {
  await logAskNuraModelUsage({
    organizationId,
    jobType: "query_planner",
    provider: plannerResult.usage.provider,
    model: plannerResult.usage.model,
    inputTokens: plannerResult.usage.inputTokens,
    outputTokens: plannerResult.usage.outputTokens,
    totalTokens: plannerResult.usage.totalTokens,
    latencyMs: Date.now() - plannerStartedAt,
    success: true,
  });
}

console.log("Ask Nura query plan:", queryPlan);

if (queryPlan.intent === "MULTI_SOURCE_WORK_SUMMARY") {
  const providerFilter = queryPlan.providers.length
    ? {
        provider: {
          in: queryPlan.providers,
        },
      }
    : {};

  const recordTypeFilter = queryPlan.recordTypes.length
    ? {
        recordType: {
          in: queryPlan.recordTypes,
        },
      }
    : {};

  const keywordValues = [
  queryPlan.filters.keyword,
  queryPlan.filters.person,
  queryPlan.filters.from,
  queryPlan.filters.sender,
  queryPlan.filters.mentionedPerson,
  ...(Array.isArray(queryPlan.filters.repo)
    ? queryPlan.filters.repo
    : queryPlan.filters.repo
      ? [queryPlan.filters.repo]
      : []),
  ...(queryPlan.filters.repos || []),
  ...(queryPlan.filters.people || []),
]
  .flat()
  .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const records = await prisma.rawSourceRecord.findMany({
    where: {
      userId,
      organizationId,
      ...providerFilter,
      ...recordTypeFilter,
      ...(keywordValues.length
        ? {
            OR: keywordValues.flatMap((value) => [
              {
                content: {
                  contains: value,
                  mode: "insensitive" as const,
                },
              },
              {
                title: {
                  contains: value,
                  mode: "insensitive" as const,
                },
              },
            ]),
          }
        : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 80,
  });

  const semanticChunks = await searchKnowledge({
    query: queryPlan.rewrittenQuestion || question,
    userId,
    organizationId,
    provider: null,
    limit: 25,
  });

  const directContext = records
    .map(
      (record) => `Evidence item
Provider: ${record.provider}
Type: ${record.recordType}
Title: ${record.title}
Content:
${record.content}`
    )
    .join("\n\n---\n\n");

  const semanticContext = semanticChunks
    .map((chunk) => formatChunkForAi(chunk))
    .join("\n\n---\n\n");

const answerStartedAt = Date.now();

const answerResult = await generateChatAnswerWithUsage([
    {
      role: "system",
      content: `You are Ask Nura, a premium internal work intelligence assistant.

Use only the provided sources. Do not invent data.

Do not dump raw records.
Do not list every commit, message, email, or document unless the user specifically asks for a full raw list.
If many records match, summarize the important patterns.

Return the answer in this structure:

## Executive summary
Give 3–6 concise bullets with the main findings.

## Completed work
List only the most important completed work. Group similar items together.

## Pending or follow-up
Mention unresolved tasks, production issues, closed-unmerged PRs, unclear ownership, or missing next steps.

## Why Nura says this
Explain which evidence patterns support the answer. Mention provider types like Slack, GitHub, Gmail, or documents.

## Missing information
Clearly say what was not found or what may be missing from synced/indexed data.

Rules:
- Keep the answer executive-friendly.
- Prefer intelligence summary over raw data.
- Do not expose raw IDs unless the user asks.
- If evidence is weak, say so clearly.`,
    },
    {
      role: "user",
      content: `User question:
${question}

Query plan:
${JSON.stringify(queryPlan, null, 2)}

Direct database records:
${directContext || "No direct records found."}

Semantic search chunks:
${semanticContext || "No semantic chunks found."}

Give a clear combined answer.`,
    },
  ]);

  const answer = answerResult.content;

await logAskNuraModelUsage({
  organizationId,
  jobType: "ask_nura_answer",
  provider: answerResult.provider,
  model: answerResult.model,
  inputTokens: answerResult.usage.inputTokens,
  outputTokens: answerResult.usage.outputTokens,
  totalTokens: answerResult.usage.totalTokens,
  latencyMs: Date.now() - answerStartedAt,
  success: true,
});

  const sourcesPayload = [
    ...records.slice(0, 30).map((record, index) => ({
      number: index + 1,
      id: record.id,
      sourceId: record.sourceId,
      rawRecordId: record.id,
      similarity: 1,
      provider: record.provider,
      recordType: record.recordType,
      title: record.title,
      preview: (record.content || "").replace(/\s+/g, " ").slice(0, 260),
      time: null,
    })),
    ...semanticChunks.slice(0, 15).map((chunk, index) => ({
      number: records.length + index + 1,
      id: chunk.id,
      sourceId: chunk.sourceId,
      rawRecordId: chunk.rawRecordId,
      similarity: chunk.similarity,
      provider: chunk.provider,
      recordType: chunk.recordType,
      title: chunk.title,
      preview: (chunk.content || "").replace(/\s+/g, " ").slice(0, 260),
      time: null,
    })),
  ];

  await saveAskNuraConversationAndCache({
    question,
    answer,
    sources: sourcesPayload,
    userId,
    organizationId,
    model: process.env.AI_CHAT_MODEL,
    provider: process.env.AI_PROVIDER,
  });

  return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
}

if (
  queryPlan.providers.includes("GMAIL") &&
  (queryPlan.intent === "GMAIL_SUMMARY" ||
    queryPlan.intent === "GMAIL_RECENT_EMAILS")
) {
  const emailRecords = await prisma.rawSourceRecord.findMany({
    where: {
      userId,
      organizationId,
      provider: "GMAIL",
      recordType: "email",
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100,
  });

  const filteredRecords = emailRecords
    .filter((record) => {
      const content = String(record.content || "").toLowerCase();

      const from = queryPlan.filters.from?.toLowerCase();
      const keyword = queryPlan.filters.keyword?.toLowerCase();

      if (from) {
        const fromLine =
          String(record.content || "")
            .match(/from:\s*([^\n]+)/i)?.[1]
            ?.toLowerCase() || "";

        return fromLine.includes(from);
      }

      if (keyword) {
        return content.includes(keyword);
      }

      return true;
    })
    .slice(0, 20);

  if (filteredRecords.length > 0) {
    const context = filteredRecords
      .map((record) => {
        return `Evidence item
Title: ${record.title}
Content:
${record.content}`;
      })
      .join("\n\n---\n\n");

   const answerStartedAt = Date.now();

const answerResult = await generateChatAnswerWithUsage([
      {
        role: "system",
        content:
          "You are Ask Nura. Summarize Gmail emails accurately using only the provided filtered emails. If the user asked for a specific sender or keyword, only summarize those matching emails. Mention sender, subject, date if available, and key points. Do not include unrelated emails.",
      },
      {
        role: "user",
        content: `User question:
${question}

Query plan:
${JSON.stringify(queryPlan, null, 2)}

Filtered Gmail emails:
${context}

Give a clear accurate answer.`,
      },
    ]);

    const answer = answerResult.content;

await logAskNuraModelUsage({
  organizationId,
  jobType: "ask_nura_answer",
  provider: answerResult.provider,
  model: answerResult.model,
  inputTokens: answerResult.usage.inputTokens,
  outputTokens: answerResult.usage.outputTokens,
  totalTokens: answerResult.usage.totalTokens,
  latencyMs: Date.now() - answerStartedAt,
  success: true,
});

    const sourcesPayload = filteredRecords.map((record, index) => ({
      number: index + 1,
      id: record.id,
      sourceId: record.sourceId,
      rawRecordId: record.id,
      similarity: 1,
      provider: "GMAIL",
      recordType: "email",
      title: record.title,
      preview: (record.content || "").replace(/\s+/g, " ").slice(0, 260),
      time: null,
    }));

    await saveAskNuraConversationAndCache({
      question,
      answer,
      sources: sourcesPayload,
      userId,
      organizationId,
      model: process.env.AI_CHAT_MODEL,
      provider: process.env.AI_PROVIDER,
    });

    return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
  }

  return createPremiumResponse({
  answer: queryPlan.filters.from
    ? `I could not find any indexed Gmail emails from ${queryPlan.filters.from}.`
    : queryPlan.filters.keyword
      ? `I could not find any indexed Gmail emails matching "${queryPlan.filters.keyword}".`
      : "I could not find any indexed Gmail emails.",
  sources: [],
  queryPlan,
  cached: false,
});
}

if (
  queryPlan.providers.includes("GITHUB") &&
  queryPlan.intent === "GITHUB_REPO_LANGUAGE"
) {
  const language = queryPlan.filters.language;

  const repoRecords = await prisma.rawSourceRecord.findMany({
    where: {
      userId,
      organizationId,
      provider: "GITHUB",
      recordType: "repository",
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 200,
  });

  const filteredRepos = repoRecords.filter((record) => {
    const payload = record.payload as any;
    const repoLanguage = String(payload?.language || "").toLowerCase();

    if (!language) return true;

    return repoLanguage === language.toLowerCase();
  });

  const answer =
    filteredRepos.length > 0
      ? `I found ${filteredRepos.length} repositories using ${language}:\n\n${filteredRepos
          .map((record, index) => {
            const payload = record.payload as any;
            const name =
              payload?.full_name || record.title || record.externalId;
            const repoLanguage = payload?.language || "Unknown";

            return `${index + 1}. ${name} — ${repoLanguage}`;
          })
          .join("\n")}`
      : `I could not find any indexed repositories using ${language}.`;

  const sourcesPayload = filteredRepos.slice(0, 20).map((record, index) => {
    const payload = record.payload as any;

    return {
      number: index + 1,
      id: record.id,
      sourceId: record.sourceId,
      rawRecordId: record.id,
      similarity: 1,
      provider: "GITHUB",
      recordType: "repository",
      title: payload?.full_name || record.title || record.externalId,
      preview: `Language: ${payload?.language || "Unknown"}. Description: ${
        payload?.description || "No description"
      }`,
      time: payload?.updated_at || null,
    };
  });

  await saveAskNuraConversationAndCache({
    question,
    answer,
    sources: sourcesPayload,
    userId,
    organizationId,
    model: process.env.AI_CHAT_MODEL,
    provider: process.env.AI_PROVIDER,
  });

  return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
}

if (isGmailSummaryQuestion(question)) {
  const gmailFilter = extractGmailFilter(question);

  const emailRecords = await prisma.rawSourceRecord.findMany({
    where: {
      userId,
      organizationId,
      provider: "GMAIL",
      recordType: "email",
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 100,
  });

  const filteredRecords = emailRecords
    .filter((record) => emailMatchesFilter(record, gmailFilter))
    .slice(0, 20);

  if (filteredRecords.length > 0) {
    const emailItems = filteredRecords.map((record) => {
      const parsed = parseEmailContent(record.content || "");

      return {
        ...parsed,
        record,
      };
    });

    const filterText = gmailFilter
      ? gmailFilter.type === "from"
        ? ` from ${gmailFilter.value}`
        : ` matching "${gmailFilter.value}"`
      : "";

    const context = emailItems
      .map(
        (email) => `Evidence item
Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
Date: ${email.date || "Unknown"}
Content:
${email.preview}`
      )
      .join("\n\n---\n\n");

    const answerStartedAt = Date.now();

const answerResult = await generateChatAnswerWithUsage([
      {
        role: "system",
        content:
          "You are Ask Nura. Summarize Gmail emails accurately using only the provided emails. If the user asked for emails from a specific person or matching a keyword, only summarize the filtered emails. Mention sender, subject, and key point. Do not summarize unrelated emails.",
      },
      {
        role: "user",
        content: `User question:
${question}

Filtered Gmail emails${filterText}:
${context}

Give a clear and accurate summary.`,
      },
    ]);

    const answer = answerResult.content;

await logAskNuraModelUsage({
  organizationId,
  jobType: "ask_nura_answer",
  provider: answerResult.provider,
  model: answerResult.model,
  inputTokens: answerResult.usage.inputTokens,
  outputTokens: answerResult.usage.outputTokens,
  totalTokens: answerResult.usage.totalTokens,
  latencyMs: Date.now() - answerStartedAt,
  success: true,
});

    const sourcesPayload = emailItems.map((email, index) => ({
      number: index + 1,
      id: email.record.id,
      sourceId: email.record.sourceId,
      rawRecordId: email.record.id,
      similarity: 1,
      provider: "GMAIL",
      recordType: "email",
      title: email.subject,
      preview: `From: ${email.from}. ${email.preview}`,
      time: email.date,
    }));

    await saveAskNuraConversationAndCache({
      question,
      answer,
      sources: sourcesPayload,
      userId,
      organizationId,
      model: process.env.AI_CHAT_MODEL,
      provider: process.env.AI_PROVIDER,
    });

   return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
  }

  if (gmailFilter) {
    return NextResponse.json({
      answer: `I could not find any indexed Gmail emails ${
        gmailFilter.type === "from"
          ? `from ${gmailFilter.value}`
          : `matching "${gmailFilter.value}"`
      }.`,
      sources: [],
      cached: false,
    });
  }
}

    /**
     * Direct answer for GitHub repo list.
     * This is better than vector search because repo listing is structured data.
     */
    if (isGithubRepoLanguageQuestion(question)) {
  const requestedLanguage = detectRequestedLanguage(question);

  const repoRecords = await prisma.rawSourceRecord.findMany({
    where: {
      userId,
      organizationId,
      provider: "GITHUB",
      recordType: "repository",
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 200,
  });

  const matchingRepos = repoRecords.filter((record) => {
    const payload = record.payload as any;
    const language = String(payload?.language || "").toLowerCase();
    const name = String(payload?.full_name || record.title || "").toLowerCase();
    const description = String(payload?.description || "").toLowerCase();

    if (requestedLanguage) {
      return language === requestedLanguage.toLowerCase();
    }

    return (
      language.includes("typescript") ||
      name.includes("typescript") ||
      description.includes("typescript")
    );
  });

  const repoItems = matchingRepos.map((record) => {
    const payload = record.payload as any;

    return {
      name: payload?.full_name || record.title || record.externalId,
      language: payload?.language || "Unknown",
      private: Boolean(payload?.private),
      defaultBranch: payload?.default_branch || "Unknown",
      description: payload?.description || "No description",
      updatedAt: payload?.updated_at || null,
      record,
    };
  });

  const languageLabel = requestedLanguage || "the requested language";

  const answer =
    repoItems.length > 0
      ? `I found ${repoItems.length} repositories that use ${languageLabel}:\n\n${repoItems
          .map(
            (repo, index) =>
              `${index + 1}. ${repo.name} — ${repo.language}${
                repo.private ? " — Private" : " — Public"
              }`
          )
          .join("\n")}`
      : `I could not find any indexed repositories using ${languageLabel}.`;

  const sourcesPayload = repoItems.slice(0, 20).map((repo, index) => ({
    number: index + 1,
    id: repo.record.id,
    sourceId: repo.record.sourceId,
    rawRecordId: repo.record.id,
    similarity: 1,
    provider: "GITHUB",
    recordType: "repository",
    title: repo.name,
    preview: `${repo.description}. Language: ${repo.language}. Branch: ${repo.defaultBranch}. Visibility: ${
      repo.private ? "Private" : "Public"
    }.`,
    time: repo.updatedAt
      ? new Date(repo.updatedAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null,
  }));

  await saveAskNuraConversationAndCache({
    question,
    answer,
    sources: sourcesPayload,
    userId,
    organizationId,
    model: process.env.AI_CHAT_MODEL,
    provider: process.env.AI_PROVIDER,
  });

  return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
}
    if (isGithubRepoListQuestion(question)) {
      const repoRecords = await prisma.rawSourceRecord.findMany({
        where: {
          userId,
          organizationId,
          provider: "GITHUB",
          recordType: "repository",
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 100,
      });

      if (repoRecords.length > 0) {
        const repoNames = repoRecords.map((record) => {
          const payload = record.payload as any;
          return payload?.full_name || record.title || record.externalId;
        });

        const answer = `I found ${repoNames.length} connected GitHub repositories:\n\n${repoNames
  .map((name, index) => `${index + 1}. ${name}`)
  .join("\n")}`;

const sourcesPayload = repoRecords.slice(0, 20).map((record, index) => {
  const payload = record.payload as any;

  return {
    number: index + 1,
    id: record.id,
    sourceId: record.sourceId,
    rawRecordId: record.id,
    similarity: 1,
    provider: "GITHUB",
    recordType: "repository",
    title: payload?.full_name || record.title || record.externalId,
    preview: (record.content || "").replace(/\s+/g, " ").slice(0, 260),
    time: payload?.updated_at || null,
  };
});

await saveAskNuraConversationAndCache({
  question,
  answer,
  sources: sourcesPayload,
  userId,
  organizationId,
  model: process.env.AI_CHAT_MODEL,
  provider: process.env.AI_PROVIDER,
});

return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
      }
    }

    /**
     * Direct answer for Slack channel list.
     */
    if (isSlackChannelListQuestion(question)) {
      const channelRecords = await prisma.rawSourceRecord.findMany({
        where: {
          userId,
          organizationId,
          provider: "SLACK",
          recordType: "channel",
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 100,
      });

      if (channelRecords.length > 0) {
        const channelNames = channelRecords.map((record) => {
          const payload = record.payload as any;
          return payload?.name || record.title || record.externalId;
        });

        const answer = `I found ${channelNames.length} indexed Slack channels:\n\n${channelNames
  .map((name, index) => `${index + 1}. ${name}`)
  .join("\n")}`;

const sourcesPayload = channelRecords.slice(0, 20).map((record, index) => {
  const content = record.content || "";

  return {
    number: index + 1,
    id: record.id,
    sourceId: record.sourceId,
    rawRecordId: record.id,
    similarity: 1,
    provider: record.provider,
    recordType: record.recordType,
    title: record.title || "Slack channel",
    preview: formatSourcePreview(content),
    time: null,
  };
});

await saveAskNuraConversationAndCache({
  question,
  answer,
  sources: sourcesPayload,
  userId,
  organizationId,
  model: process.env.AI_CHAT_MODEL,
  provider: process.env.AI_PROVIDER,
});

return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
      }
    }

    const provider = queryPlan.providers[0] || detectProvider(question);
    const limit = Number(process.env.ASK_NURA_SEARCH_LIMIT || "20");


    const chunks = await searchKnowledge({
      query: queryPlan.rewrittenQuestion || question,
      userId,
      organizationId,
      provider,
      limit,
    });

    const context = chunks
  .map((chunk) => formatChunkForAi(chunk))
  .join("\n\n---\n\n");

    const answerStartedAt = Date.now();

const answerResult = await generateChatAnswerWithUsage([
      {
        role: "system",
       content: `You are Ask Nura, a premium internal knowledge assistant.

Use only the provided sources. Do not invent facts.

Answer in this structure:

## Executive summary
Give the direct answer in concise bullets.

## Why Nura says this
Explain what source evidence supports the answer.

## Missing information
Mention what was not found or what may need syncing.

Rules:
- Do not dump raw records.
- Do not expose raw IDs unless asked.
- Keep it clean, useful, and executive-friendly.
- If no matching context exists, say that clearly.`,
      },
      {
        role: "user",
        content: `User question:
${question}

Available sources:
${context || "No matching knowledge found."}

Answer the question using the available sources.`,
      },
    ]);

    const answer = answerResult.content;

await logAskNuraModelUsage({
  organizationId,
  jobType: "ask_nura_answer",
  provider: answerResult.provider,
  model: answerResult.model,
  inputTokens: answerResult.usage.inputTokens,
  outputTokens: answerResult.usage.outputTokens,
  totalTokens: answerResult.usage.totalTokens,
  latencyMs: Date.now() - answerStartedAt,
  success: true,
});

    const sourcesPayload = chunks.map((chunk, index) => {
  const content = chunk.content || "";
  const isSlack = chunk.provider === "SLACK";

  return {
    number: index + 1,
    id: chunk.id,
    sourceId: chunk.sourceId,
    rawRecordId: chunk.rawRecordId,
    similarity: chunk.similarity,
    provider: chunk.provider,
    recordType: chunk.recordType,
    title: chunk.title || (isSlack ? "Slack message" : "Source"),
    preview: isSlack
      ? extractSlackMessage(content)
      : formatSourcePreview(content),
    time: isSlack ? formatSlackTimeFromContent(content) : null,
  };
});

await saveAskNuraConversationAndCache({
  question,
  answer,
  sources: sourcesPayload,
  userId,
  organizationId,
  model: process.env.AI_CHAT_MODEL,
  provider: process.env.AI_PROVIDER,
});

return createPremiumResponse({
  answer,
  sources: sourcesPayload,
  queryPlan,
  cached: false,
});
  } catch (error) {
    console.error("Ask Nura API error:", error);

    return NextResponse.json(
      {
        error: "Ask Nura failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
