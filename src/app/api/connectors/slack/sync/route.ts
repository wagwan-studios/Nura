import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncAllConnectedSourcesToKnowledge } from "@/lib/connectors/sync-source";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await syncAllConnectedSourcesToKnowledge({
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
    });

    const slackResult = results.find((item: any) => item.type === "SLACK");

    return NextResponse.json({
      ok: true,
      provider: "SLACK",
      result: slackResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Slack sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}