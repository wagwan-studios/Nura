import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.organizationId) {
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
        name: true,
        type: true,
        status: true,
        lastSyncAt: true,
        _count: {
          select: {
            rawRecords: true,
            knowledgeChunks: true,
          },
        },
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

    return NextResponse.json({
      ok: true,
      sourceId: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      lastSyncAt: source.lastSyncAt,
      records: source._count.rawRecords,
      chunks: source._count.knowledgeChunks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load source status",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
// import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { prisma } from "@/lib/prisma";

// export async function GET(
//   _req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
//     const session = await auth();

//     if (!session?.user?.id || !session.user.organizationId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const source = await prisma.source.findFirst({
//       where: {
//         id,
//         organizationId: session.user.organizationId as string,
//       },
//       select: {
//         id: true,
//         name: true,
//         type: true,
//         status: true,
//         lastSyncAt: true,
//         _count: {
//           select: {
//             rawRecords: true,
//             knowledgeChunks: true,
//           },
//         },
//       },
//     });

//     if (!source) {
//       return NextResponse.json({ error: "Source not found" }, { status: 404 });
//     }

//     return NextResponse.json({
//       ok: true,
//       sourceId: source.id,
//       name: source.name,
//       type: source.type,
//       status: source.status,
//       lastSyncAt: source.lastSyncAt,
//       records: source._count.rawRecords,
//       chunks: source._count.knowledgeChunks,
//     });
//   } catch (error) {
//     return NextResponse.json(
//       {
//         error: "Source status failed",
//         message: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }