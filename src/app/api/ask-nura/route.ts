import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchKnowledge } from "@/lib/knowledge/search";
import { generateChatAnswer } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const question = String(body.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const chunks = await searchKnowledge({
      query: question,
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
      limit: 8,
    });

    const context = chunks
      .map((chunk, index) => {
        return `Source ${index + 1}:\n${chunk.content}`;
      })
      .join("\n\n");

    const answer = await generateChatAnswer([
      {
        role: "system",
        content:
          "You are Ask Nura, an internal company knowledge assistant. Answer only using the provided context. If the context does not contain the answer, say you could not find enough information in the connected knowledge base.",
      },
      {
        role: "user",
        content: `Context:\n${
          context || "No matching knowledge found."
        }\n\nQuestion:\n${question}`,
      },
    ]);

    return NextResponse.json({
      answer,
      sources: chunks.map((chunk, index) => ({
        number: index + 1,
        id: chunk.id,
        sourceId: chunk.sourceId,
        rawRecordId: chunk.rawRecordId,
        similarity: chunk.similarity,
        preview: chunk.content.slice(0, 220),
      })),
    });
  } catch (error) {
    console.error("Ask Nura API error:", error);

    return NextResponse.json(
      {
        error: "Ask Nura failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
// import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { searchKnowledge } from "@/lib/knowledge/search";
// import { generateChatAnswer } from "@/lib/ai/provider";

// export async function POST(req: NextRequest) {
//   const session = await auth();

//   if (!session?.user?.id || !session.user.organizationId) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const body = await req.json();
//   const question = String(body.question || "").trim();

//   if (!question) {
//     return NextResponse.json(
//       { error: "Question is required" },
//       { status: 400 }
//     );
//   }

//   const chunks = await searchKnowledge({
//     query: question,
//     userId: session.user.id as string,
//     organizationId: session.user.organizationId as string,
//     limit: 8,
//   });

//   const context = chunks
//     .map((chunk, index) => {
//       return `Source ${index + 1}:\n${chunk.content}`;
//     })
//     .join("\n\n");

//   const answer = await generateChatAnswer([
//     {
//       role: "system",
//       content:
//         "You are Ask Nura, an internal company knowledge assistant. Answer only using the provided context. If the context does not contain the answer, say you could not find enough information in the connected knowledge base.",
//     },
//     {
//       role: "user",
//       content: `Context:\n${context || "No matching knowledge found."}\n\nQuestion:\n${question}`,
//     },
//   ]);

//   return NextResponse.json({
//     answer,
//     sources: chunks.map((chunk, index) => ({
//       number: index + 1,
//       id: chunk.id,
//       sourceId: chunk.sourceId,
//       rawRecordId: chunk.rawRecordId,
//       similarity: chunk.similarity,
//       preview: chunk.content.slice(0, 220),
//     })),
//   });
// }