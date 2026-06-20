import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractKnowledge } from "@/lib/extraction";
import { detectContradictions } from "@/lib/contradictions";

/**
 * Webhook-style ingestion endpoint. Authenticate with the organization's API key
 * (Authorization: Bearer <apiKey>, found on /dashboard/agent-api) so Slack apps,
 * email forwarders, etc. can push raw transcripts directly.
 *
 * Body: { text: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Authorization: Bearer <apiKey>" }, { status: 401 });
  }

  const organization = await prisma.organization.findUnique({ where: { apiKey } });
  if (!organization) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const source = await prisma.source.findFirst({
    where: { id: sourceId, organizationId: organization.id },
  });
  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Body must include a non-empty 'text' field" }, { status: 400 });
  }

  const extracted = await extractKnowledge(text, source.name);

  const created = [];
  for (const item of extracted) {
    const entry = await prisma.knowledgeEntry.create({
      data: {
        title: item.title,
        type: item.type,
        status: "DRAFT",
        summary: item.summary,
        content: item.content,
        tags: item.tags,
        organizationId: organization.id,
        sourceId: source.id,
        citations: {
          create: item.citations.map((c) => ({
            excerpt: c.excerpt,
            author: c.author,
            sourceId: source.id,
          })),
        },
      },
    });
    await detectContradictions(organization.id, entry);
    created.push({ id: entry.id, title: entry.title, type: entry.type });
  }

  await prisma.source.update({ where: { id: source.id }, data: { lastSyncAt: new Date() } });

  return NextResponse.json({ ok: true, created });
}
