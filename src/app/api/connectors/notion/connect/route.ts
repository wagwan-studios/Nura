import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotionAuthUrl } from "@/lib/connectors/notion";

export async function GET() {
  const session = await auth();

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL || process.env.APP_URL ||
    "http://127.0.0.1:3000";

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      organizationId: session.user.organizationId,
      provider: "NOTION",
      createdAt: Date.now(),
    })
  ).toString("base64url");

  return NextResponse.redirect(getNotionAuthUrl(state));
}