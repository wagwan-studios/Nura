import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startSourceSyncInBackground } from "@/lib/connectors/background-sync";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const source = await prisma.source.findFirst({
      where: {
        organizationId: session.user.organizationId as string,
        type: "SLACK",
        connectedAccounts: {
          some: {
            userId: session.user.id as string,
            accessToken: { not: null },
            revokedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Slack source is not connected." },
        { status: 404 }
      );
    }

    const result = startSourceSyncInBackground({
      sourceId: source.id,
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
      reason: "manual",
    });

    return NextResponse.json({
      ok: true,
      provider: "SLACK",
      background: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Slack sync could not be started",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}