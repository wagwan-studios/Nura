import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncAllConnectedSourcesToKnowledge } from "@/lib/connectors/sync-source";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await syncAllConnectedSourcesToKnowledge({
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
    });

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Sync all failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}