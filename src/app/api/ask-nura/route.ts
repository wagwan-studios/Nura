import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAskNuraAnswer,
  saveAskNuraConversationAndCache,
} from "@/lib/ask-nura/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "@/lib/knowledge/search";
import { generateChatAnswer } from "@/lib/ai/provider";

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

function formatChunkForAi(chunk: any, index: number) {
  const content = chunk.content || "";

  return `Source ${index + 1}
Provider: ${chunk.provider ?? "Unknown"}
Record type: ${chunk.recordType ?? "Unknown"}
Title: ${chunk.title ?? "Untitled"}

Readable content:
${content}

Instruction:
Use the readable content to answer the user. Do not mention raw IDs unless needed.`;
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
  return NextResponse.json({
    answer: cached.answer,
    sources: cached.sources || [],
    cached: true,
  });
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

  return NextResponse.json({
    answer,
    sources: sourcesPayload,
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

const sourcesPayload = repoRecords.slice(0, 20).map((record, index) => ({
  number: index + 1,
  id: record.id,
  sourceId: record.sourceId,
  rawRecordId: record.id,
  similarity: 1,
  preview: (record.content || "").slice(0, 220),
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

return NextResponse.json({
  answer,
  sources: sourcesPayload,
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

return NextResponse.json({
  answer,
  sources: sourcesPayload,
  cached: false,
});
      }
    }

    const provider = detectProvider(question);
    const limit = Number(process.env.ASK_NURA_SEARCH_LIMIT || "20");

    const chunks = await searchKnowledge({
      query: question,
      userId,
      organizationId,
      provider,
      limit,
    });

    const context = chunks
  .map((chunk, index) => formatChunkForAi(chunk, index))
  .join("\n\n---\n\n");

    const answer = await generateChatAnswer([
      {
        role: "system",
        content:
  "You are Ask Nura, an internal company knowledge assistant. Answer in a clear, useful, human way using only the provided sources. Do not give incomplete one-line answers. If Slack messages are provided, summarize the actual messages, mention the sender when available, explain the main point, and group similar messages together. If GitHub records are provided, summarize repositories, commits, pull requests, or issues clearly. Never expose raw technical IDs unless the user specifically asks for IDs. If the context is limited, still provide the best useful summary from the available sources and mention that it is based on the indexed data.",
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

return NextResponse.json({
  answer,
  sources: sourcesPayload,
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
