import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";
import { syncSourceToKnowledge } from "@/lib/connectors/sync-source";

export async function GET(req: NextRequest) {
  try {
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/sources?gmail=${error}`
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
        `${process.env.APP_URL}/dashboard/sources?gmail=missing_code`
      );
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/sources?gmail=missing_google_env`
      );
    }

    const redirectUri = `${process.env.APP_URL}/api/connectors/gmail/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Gmail token exchange failed:", tokenData);

      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/sources?gmail=token_failed`
      );
    }

    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const profileData = await profileRes.json();

    if (!profileRes.ok) {
      console.error("Gmail profile failed:", profileData);

      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/sources?gmail=profile_failed`
      );
    }

    const source = await prisma.source.upsert({
      where: {
        id: `gmail-${organizationId}-${userId}`,
      },
      update: {
        status: "CONNECTED",
        name: "Gmail",
      },
      create: {
        id: `gmail-${organizationId}-${userId}`,
        type: "GMAIL",
        name: "Gmail",
        status: "CONNECTED",
        organizationId,
      },
    });

    await prisma.connectedAccount.upsert({
  where: {
    userId_provider_providerAccountId: {
      userId,
      provider: "GMAIL",
      providerAccountId: profileData.emailAddress,
    },
  },
  update: {
    providerEmail: profileData.emailAddress,
    accessToken: encryptToken(tokenData.access_token),
    refreshToken: tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : undefined,
    scope: tokenData.scope,
    tokenType: tokenData.token_type,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null,
    revokedAt: null,
    sourceId: source.id,
  },
  create: {
    provider: "GMAIL",
    providerAccountId: profileData.emailAddress,
    providerEmail: profileData.emailAddress,
    accessToken: encryptToken(tokenData.access_token),
    refreshToken: tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : null,
    scope: tokenData.scope,
    tokenType: tokenData.token_type,
    expiresAt: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null,
    userId,
    organizationId,
    sourceId: source.id,
  },
});

    try {
      await syncSourceToKnowledge({
        sourceId: source.id,
        userId,
        organizationId,
      });
    } catch (syncError) {
      console.error("Gmail auto-sync failed:", syncError);
    }

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?gmail=connected`
    );
  } catch (error) {
    console.error("Gmail callback failed:", error);

    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?gmail=callback_failed`
    );
  }
}