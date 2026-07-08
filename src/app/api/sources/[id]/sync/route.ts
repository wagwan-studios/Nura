import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const source = await prisma.source.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        {
          ok: false,
          error: "Source not found",
        },
        { status: 404 }
      );
    }

    if (source.status === "SYNCING") {
      return NextResponse.json({
        ok: true,
        sourceId: source.id,
        background: true,
        alreadyRunning: true,
      });
    }

    await prisma.source.update({
      where: {
        id: source.id,
      },
      data: {
        status: "SYNCING",
      },
    });

    setTimeout(async () => {
      try {
        await prisma.source.update({
          where: {
            id: source.id,
          },
          data: {
            status: "CONNECTED",
            lastSyncAt: new Date(),
          },
        });
      } catch (error) {
        console.error("Background sync failed", error);
      }
    }, 3000);

    return NextResponse.json({
      ok: true,
      sourceId: source.id,
      background: true,
      alreadyRunning: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to start source sync",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}