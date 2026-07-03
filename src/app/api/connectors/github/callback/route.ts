import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { startSourceSyncInBackground } from "@/lib/connectors/background-sync";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
    console.log("GitHub OAuth error:", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?github=${error}`
    );
  }

  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?github=missing_code`
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.APP_URL}/api/connectors/github/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.log("GitHub token failed:", tokenData);

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?github=token_failed`
    );
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  const githubUser = await userRes.json();

  if (!githubUser?.id) {
    console.log("GitHub user failed:", githubUser);

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?github=user_failed`
    );
  }

  const source = await prisma.source.upsert({
    where: {
      id: `github-${organizationId}-${userId}`,
    },
    update: {
      status: "CONNECTED",
      name: githubUser.login ? `GitHub - ${githubUser.login}` : "GitHub",
    },
    create: {
      id: `github-${organizationId}-${userId}`,
      type: "GITHUB",
      name: "GitHub",
      status: "CONNECTED",
      organizationId,
    },
  });

  await prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: "GITHUB",
        providerAccountId: String(githubUser.id),
      },
    },
    update: {
      accessToken: encryptToken(tokenData.access_token),
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
       expiresAt: null,
      revokedAt: null,
      sourceId: source.id,
    },
    create: {
      userId,
      organizationId,
      provider: "GITHUB",
      providerAccountId: String(githubUser.id),
      providerEmail: githubUser.email,
      accessToken: encryptToken(tokenData.access_token),
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
      sourceId: source.id,
    },
  });

  try {
  startSourceSyncInBackground({
    sourceId: source.id,
    userId,
    organizationId,
    reason: "connect",
  });
} catch (error) {
  console.error("Auto-sync could not be started after connect:", error);
}

  return NextResponse.redirect(
    `${process.env.APP_URL}/dashboard/sources?github=connected`
  );
}
