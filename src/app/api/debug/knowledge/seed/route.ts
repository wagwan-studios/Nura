import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ingestRawRecord } from "@/lib/knowledge/ingest";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const organizationId = session.user.organizationId as string;

    const source = await prisma.source.upsert({
      where: {
        id: `manual-test-${organizationId}-${userId}`,
      },
      update: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
        name: "Manual Test Knowledge",
      },
      create: {
        id: `manual-test-${organizationId}-${userId}`,
        type: "MANUAL",
        name: "Manual Test Knowledge",
        status: "CONNECTED",
        organizationId,
      },
    });

    const record1 = await ingestRawRecord({
      provider: "MANUAL",
      recordType: "test_note",
      externalId: "test-slack-access-rule",
      title: "Slack access rule",
      content: `
Nura Slack integration is user-level. Each user must connect their own Slack account.
A connected user can only read public channels, private channels, DMs, and group DMs where that Slack user has access.
One user cannot read another user's private Slack messages.
Slack data should be stored with PERSONAL visibility by default.
      `,
      payload: {
        test: true,
        topic: "slack",
      },
      sourceId: source.id,
      userId,
      organizationId,
      visibility: "PERSONAL",
    });

    const record2 = await ingestRawRecord({
      provider: "MANUAL",
      recordType: "test_note",
      externalId: "test-github-access-rule",
      title: "GitHub access rule",
      content: `
Nura GitHub integration is user-level. Each user must connect their own GitHub account.
The system can read repositories, commits, pull requests, issues, and comments only from repositories that the connected GitHub user can access.
This includes personal repositories and organization repositories where the GitHub user is a member or collaborator.
GitHub data should be stored with PERSONAL visibility by default.
      `,
      payload: {
        test: true,
        topic: "github",
      },
      sourceId: source.id,
      userId,
      organizationId,
      visibility: "PERSONAL",
    });

    const record3 = await ingestRawRecord({
      provider: "MANUAL",
      recordType: "company_policy",
      externalId: "test-company-policy",
      title: "Company knowledge policy",
      content: `
Shared company documentation can be stored with ORGANIZATION visibility.
Organization-level knowledge can be searched by all active users inside the same organization.
Personal connector data such as Slack DMs and GitHub private repositories should not be shared across users unless explicitly converted into organization knowledge.
      `,
      payload: {
        test: true,
        topic: "company-policy",
      },
      sourceId: source.id,
      userId,
      organizationId,
      visibility: "ORGANIZATION",
    });

    return NextResponse.json({
      ok: true,
      sourceId: source.id,
      records: [record1, record2, record3],
    });
  } catch (error) {
    console.error("Knowledge seed error:", error);

    return NextResponse.json(
      {
        error: "Knowledge seed failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}