import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  const appUrl = process.env.APP_URL;
  const githubClientId = process.env.GITHUB_CLIENT_ID;

  if (!appUrl || !githubClientId) {
    return NextResponse.json(
      { error: "Missing APP_URL or GITHUB_CLIENT_ID env variable" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: githubClientId,
    redirect_uri: `${appUrl}/api/connectors/github/callback`,
    scope: "read:user user:email repo",
    state: session.user.id,
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
}