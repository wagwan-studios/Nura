import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { startSourceSyncInBackground } from "@/lib/connectors/background-sync";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
    console.log("Slack OAuth error:", {
      error,
      errorDescription,
    });

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?slack=${error}`
    );
  }

  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?slack=missing_code`
    );
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/connectors/slack/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  const slackUserToken = tokenData.authed_user?.access_token;
  const slackUserId = tokenData.authed_user?.id;
  const slackTeamId = tokenData.team?.id;

  if (!tokenData.ok || !slackUserToken) {
    console.log("Slack token failed:", tokenData);

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?slack=token_failed`
    );
  }

  const providerAccountId = slackUserId ?? slackTeamId;

  if (!providerAccountId) {
    console.log("Slack account failed:", tokenData);

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?slack=account_failed`
    );
  }

  const source = await prisma.source.upsert({
    where: {
      id: `slack-${organizationId}-${userId}`,
    },
    update: {
      status: "CONNECTED",
      name: tokenData.team?.name
      ? `Slack - ${tokenData.team.name}`
      : "Slack",
    },
    create: {
      id: `slack-${organizationId}-${userId}`,
      type: "SLACK",
      name: tokenData.team?.name
      ? `Slack - ${tokenData.team.name}`
      : "Slack",
      status: "CONNECTED",
      organizationId,
    },
  });

  await prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: "SLACK",
        providerAccountId,
      },
    },
    update: {
      accessToken: encryptToken(slackUserToken),
      refreshToken: tokenData.authed_user?.refresh_token
        ? encryptToken(tokenData.authed_user.refresh_token)
        : undefined,
      tokenType: tokenData.authed_user?.token_type ?? "user",
      scope: tokenData.authed_user?.scope ?? tokenData.scope,
      expiresAt: tokenData.authed_user?.expires_in
        ? new Date(Date.now() + tokenData.authed_user.expires_in * 1000)
        : null,
      revokedAt: null,
      sourceId: source.id,
    },
    create: {
      userId,
      organizationId,
      provider: "SLACK",
      providerAccountId,
      providerEmail: null,
      accessToken: encryptToken(slackUserToken),
      refreshToken: tokenData.authed_user?.refresh_token
        ? encryptToken(tokenData.authed_user.refresh_token)
        : null,
      tokenType: tokenData.authed_user?.token_type ?? "user",
      scope: tokenData.authed_user?.scope ?? tokenData.scope,
      expiresAt: tokenData.authed_user?.expires_in
        ? new Date(Date.now() + tokenData.authed_user.expires_in * 1000)
        : null,
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
  console.error("Slack auto-sync failed after connect:", error);
}

  return NextResponse.redirect(
    `${process.env.APP_URL}/dashboard/sources?slack=connected`
  );
}
// import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/auth";
// import { prisma } from "@/lib/prisma";
// import { encryptToken } from "@/lib/encryption";

// export async function GET(req: NextRequest) {
//   const error = req.nextUrl.searchParams.get("error");
//   const errorDescription = req.nextUrl.searchParams.get("error_description");

//   if (error) {
//     console.log("Slack OAuth error:", {
//       error,
//       errorDescription,
//     });

//     return NextResponse.redirect(
//       `${process.env.APP_URL}/dashboard/sources?slack=${error}`
//     );
//   }

//   const session = await auth();

//   if (!session?.user?.id || !session.user.organizationId) {
//     return NextResponse.redirect(`${process.env.APP_URL}/login`);
//   }

//   const userId = session.user.id as string;
//   const organizationId = session.user.organizationId as string;

//   const code = req.nextUrl.searchParams.get("code");

//   if (!code) {
//     return NextResponse.redirect(
//       `${process.env.APP_URL}/dashboard/sources?slack=missing_code`
//     );
//   }

//   const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: new URLSearchParams({
//       code,
//       client_id: process.env.SLACK_CLIENT_ID!,
//       client_secret: process.env.SLACK_CLIENT_SECRET!,
//       redirect_uri: `${process.env.APP_URL}/api/connectors/slack/callback`,
//     }),
//   });

//   const tokenData = await tokenRes.json();

//   if (!tokenData.ok || !tokenData.access_token) {
//     console.log("Slack token failed:", tokenData);

//     return NextResponse.redirect(
//       `${process.env.APP_URL}/dashboard/sources?slack=token_failed`
//     );
//   }

//   const providerAccountId =
//     tokenData.authed_user?.id ?? tokenData.team?.id;

//   if (!providerAccountId) {
//     console.log("Slack account failed:", tokenData);

//     return NextResponse.redirect(
//       `${process.env.APP_URL}/dashboard/sources?slack=account_failed`
//     );
//   }

//   const source = await prisma.source.upsert({
//     where: {
//       id: `slack-${organizationId}`,
//     },
//     update: {
//       status: "CONNECTED",
//       lastSyncAt: new Date(),
//       name: tokenData.team?.name ?? "Slack",
//     },
//     create: {
//       id: `slack-${organizationId}`,
//       type: "SLACK",
//       name: tokenData.team?.name ?? "Slack",
//       status: "CONNECTED",
//       organizationId,
//     },
//   });

//   await prisma.connectedAccount.upsert({
//     where: {
//       userId_provider_providerAccountId: {
//         userId,
//         provider: "SLACK",
//         providerAccountId,
//       },
//     },
//     update: {
//       accessToken: encryptToken(tokenData.access_token),
//       refreshToken: tokenData.refresh_token
//         ? encryptToken(tokenData.refresh_token)
//         : undefined,
//       tokenType: tokenData.token_type,
//       scope: tokenData.scope,
//       expiresAt: tokenData.expires_in
//         ? new Date(Date.now() + tokenData.expires_in * 1000)
//         : null,
//       sourceId: source.id,
//     },
//     create: {
//       userId,
//       organizationId,
//       provider: "SLACK",
//       providerAccountId,
//       providerEmail: null,
//       accessToken: encryptToken(tokenData.access_token),
//       refreshToken: tokenData.refresh_token
//         ? encryptToken(tokenData.refresh_token)
//         : null,
//       tokenType: tokenData.token_type,
//       scope: tokenData.scope,
//       expiresAt: tokenData.expires_in
//         ? new Date(Date.now() + tokenData.expires_in * 1000)
//         : null,
//       sourceId: source.id,
//     },
//   });

//   return NextResponse.redirect(
//     `${process.env.APP_URL}/dashboard/sources?slack=connected`
//   );
// }