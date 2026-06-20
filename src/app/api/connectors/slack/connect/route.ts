import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  const scopes = [
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
    "users:read",
    "team:read",
    "files:read",
  ];

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/connectors/slack/callback`,
    user_scope: scopes.join(","),
    state: session.user.id,
  });

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}