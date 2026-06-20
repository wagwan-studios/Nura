import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchKnowledge } from "@/lib/search";

/**
 * Agent API — AI agents call this before acting to retrieve relevant institutional
 * knowledge (processes, decisions, exceptions, policies) with source citations.
 *
 * Auth: Authorization: Bearer <organization apiKey> (see /dashboard/agent-api)
 * Body: { query: string, limit?: number }
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Authorization: Bearer <apiKey>" }, { status: 401 });
  }

  const organization = await prisma.organization.findUnique({ where: { apiKey } });
  if (!organization) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const limit = typeof body?.limit === "number" ? Math.min(Math.max(body.limit, 1), 20) : 5;

  if (!query) {
    return NextResponse.json({ error: "Body must include a non-empty 'query' field" }, { status: 400 });
  }

  const results = await searchKnowledge(organization.id, query);
  const top = results.slice(0, limit);

  await prisma.agentQueryLog.create({
    data: {
      query,
      resultIds: top.map((r) => r.id),
      organizationId: organization.id,
    },
  });

  return NextResponse.json({
    query,
    results: top.map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      summary: entry.summary,
      content: entry.content,
      tags: entry.tags,
      source: entry.source?.name ?? null,
      url: `/dashboard/knowledge/${entry.id}`,
    })),
  });
}
