import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?gmail=missing_client_id`
    );
  }

  const redirectUri = `${process.env.APP_URL}/api/connectors/gmail/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}