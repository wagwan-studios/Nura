import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startAllSourcesSyncInBackground } from "@/lib/connectors/background-sync";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = startAllSourcesSyncInBackground({
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
      reason: "sync_all",
    });

    return NextResponse.json({
      ok: true,
      background: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Sync all could not be started",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}