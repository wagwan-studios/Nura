import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function normalizeQuestion(question: string) {
  return question
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "");
}

export function createQuestionHash(question: string) {
  const normalized = normalizeQuestion(question);

  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export async function getOrganizationSourceVersion(organizationId: string) {
  const latestSource = await prisma.source.findFirst({
    where: {
      organizationId,
      status: "CONNECTED",
      lastSyncAt: {
        not: null,
      },
    },
    orderBy: {
      lastSyncAt: "desc",
    },
    select: {
      lastSyncAt: true,
    },
  });

  return latestSource?.lastSyncAt || null;
}

export async function getCachedAskNuraAnswer({
  question,
  userId,
  organizationId,
}: {
  question: string;
  userId: string;
  organizationId: string;
}) {
  const questionHash = createQuestionHash(question);
  const currentSourceVersion = await getOrganizationSourceVersion(organizationId);

  const cache = await prisma.askNuraCache.findUnique({
    where: {
      organizationId_userId_questionHash: {
        organizationId,
        userId,
        questionHash,
      },
    },
  });

  if (!cache) return null;

  if (cache.expiresAt && cache.expiresAt < new Date()) {
    return null;
  }

  if (
    currentSourceVersion &&
    cache.sourceVersion &&
    cache.sourceVersion < currentSourceVersion
  ) {
    return null;
  }

  await prisma.askNuraCache.update({
    where: {
      id: cache.id,
    },
    data: {
      hitCount: {
        increment: 1,
      },
    },
  });

  return cache;
}

export async function saveAskNuraConversationAndCache({
  question,
  answer,
  sources,
  userId,
  organizationId,
  model,
  provider,
}: {
  question: string;
  answer: string;
  sources: unknown;
  userId: string;
  organizationId: string;
  model?: string;
  provider?: string;
}) {
  const normalizedQuestion = normalizeQuestion(question);
  const questionHash = createQuestionHash(question);
  const sourceVersion = await getOrganizationSourceVersion(organizationId);

  const conversation = await prisma.askNuraConversation.create({
    data: {
      title: question.slice(0, 120),
      userId,
      organizationId,
      messages: {
        create: [
          {
            role: "user",
            content: question,
            userId,
            organizationId,
          },
          {
            role: "assistant",
            content: answer,
            sources: sources as any,
            metadata: {
              model,
              provider,
              cached: false,
            },
            userId,
            organizationId,
          },
        ],
      },
    },
  });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + Number(process.env.ASK_NURA_CACHE_HOURS || "24"));

  await prisma.askNuraCache.upsert({
    where: {
      organizationId_userId_questionHash: {
        organizationId,
        userId,
        questionHash,
      },
    },
    update: {
      question,
      normalizedQuestion,
      answer,
      sources: sources as any,
      model,
      provider,
      sourceVersion,
      expiresAt,
      conversationId: conversation.id,
    },
    create: {
      question,
      normalizedQuestion,
      questionHash,
      answer,
      sources: sources as any,
      model,
      provider,
      sourceVersion,
      expiresAt,
      conversationId: conversation.id,
      userId,
      organizationId,
    },
  });

  return conversation;
}