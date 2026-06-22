"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeStatus, KnowledgeType, SourceType, AlertSeverity } from "@prisma/client";
import { extractKnowledge } from "@/lib/extraction";
import { detectContradictions } from "@/lib/contradictions";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createKnowledgeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const type = String(formData.get("type") ?? "PROCESS") as KnowledgeType;
  const status = String(formData.get("status") ?? "PUBLISHED") as KnowledgeStatus;
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;

  if (!title || !summary || !content) {
    throw new Error("Title, summary, and content are required");
  }

  const entry = await prisma.knowledgeEntry.create({
    data: {
      title,
      summary,
      content,
      type,
      status,
      tags,
      ownerId,
      organizationId: session.user.organizationId,
      authorId: session.user.id,
    },
  });

  revalidatePath("/dashboard/knowledge");
  redirect(`/dashboard/knowledge/${entry.id}`);
}

export async function updateKnowledgeEntry(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const type = String(formData.get("type") ?? "PROCESS") as KnowledgeType;
  const status = String(formData.get("status") ?? "PUBLISHED") as KnowledgeStatus;
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;

  await prisma.knowledgeEntry.update({
    where: { id, organizationId: session.user.organizationId },
    data: { title, summary, content, type, status, tags, ownerId },
  });

  revalidatePath("/dashboard/knowledge");
  revalidatePath(`/dashboard/knowledge/${id}`);
  redirect(`/dashboard/knowledge/${id}`);
}

export async function deleteKnowledgeEntry(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.knowledgeEntry.delete({
    where: { id, organizationId: session.user.organizationId },
  });

  revalidatePath("/dashboard/knowledge");
  redirect("/dashboard/knowledge");
}

export async function createSource(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "MANUAL") as SourceType;

  if (!name) throw new Error("Name is required");

  await prisma.source.create({
    data: {
      name,
      type,
      status: "CONNECTED",
      organizationId: session.user.organizationId,
    },
  });

  revalidatePath("/dashboard/sources");
}

export async function deleteSource(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.source.delete({
    where: { id, organizationId: session.user.organizationId },
  });

  revalidatePath("/dashboard/sources");
}

export async function ingestTranscript(sourceId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) throw new Error("Transcript text is required");

  const source = await prisma.source.findFirst({
    where: { id: sourceId, organizationId: session.user.organizationId },
  });
  if (!source) throw new Error("Source not found");

  const extracted = await extractKnowledge(text, source.name);

  for (const item of extracted) {
    const entry = await prisma.knowledgeEntry.create({
      data: {
        title: item.title,
        type: item.type,
        status: "DRAFT",
        summary: item.summary,
        content: item.content,
        tags: item.tags,
        organizationId: session.user.organizationId,
        sourceId: source.id,
        authorId: session.user.id,
        citations: {
          create: item.citations.map((c) => ({
            excerpt: c.excerpt,
            author: c.author,
            sourceId: source.id,
          })),
        },
      },
    });

    await detectContradictions(session.user.organizationId, entry);
  }

  await prisma.source.update({
    where: { id: source.id },
    data: { lastSyncAt: new Date() },
  });

  revalidatePath("/dashboard/sources");
  revalidatePath("/dashboard/knowledge");
  revalidatePath("/dashboard/alerts");
  redirect(`/dashboard/sources/${source.id}`);
}

export async function approveKnowledgeEntry(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.knowledgeEntry.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status: "PUBLISHED" },
  });

  revalidatePath("/dashboard/knowledge");
}

export async function rejectKnowledgeEntry(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.knowledgeEntry.delete({
    where: { id, organizationId: session.user.organizationId },
  });

  revalidatePath("/dashboard/knowledge");
}

export async function flagEntryForReview(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const entry = await prisma.knowledgeEntry.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!entry) throw new Error("Entry not found");

  const note = String(formData.get("note") ?? "").trim();

  await prisma.platformAlert.create({
    data: {
      severity: AlertSeverity.INFO,
      organizationId: session.user.organizationId,
      relatedEntryId: entry.id,
      assignedToId: entry.ownerId ?? entry.authorId ?? null,
      title: `Flagged for review: ${entry.title}`,
      description: note || `Flagged by ${session.user.name ?? session.user.email} for review.`,
      actionLabel: "Review entry",
    },
  });

  revalidatePath("/dashboard/alerts");
  redirect(`/dashboard/knowledge/${id}`);
}

export async function toggleOnboardingProgress(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const entryId = String(formData.get("entryId") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";

  if (completed) {
    await prisma.onboardingProgress.deleteMany({
      where: { userId: session.user.id, knowledgeEntryId: entryId },
    });
  } else {
    if (!session?.user?.id) {
  throw new Error("Unauthorized");
}

const userId = session.user.id;

await prisma.onboardingProgress.upsert({
  where: {
    userId_knowledgeEntryId: {
      userId,
      knowledgeEntryId: entryId,
    },
  },
  create: {
    userId,
    knowledgeEntryId: entryId,
  },
  update: {},
});
  }

  revalidatePath("/dashboard/onboarding");
}

export async function regenerateApiKey() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { apiKey: crypto.randomUUID() },
  });

  revalidatePath("/dashboard/agent-api");
}
