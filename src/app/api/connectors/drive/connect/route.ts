import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleDriveAuthUrl } from "@/lib/connectors/google-drive";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL||process.env.APP_URL));
  }

  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      organizationId: session.user.organizationId,
      provider: "DRIVE",
      createdAt: Date.now(),
    })
  ).toString("base64url");

  return NextResponse.redirect(getGoogleDriveAuthUrl(state));
}