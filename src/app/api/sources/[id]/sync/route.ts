import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncSourceToKnowledge } from "@/lib/connectors/sync-source";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncSourceToKnowledge({
      sourceId: id,
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
    });

    return NextResponse.json({
      ok: true,
      sourceId: id,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Source sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}