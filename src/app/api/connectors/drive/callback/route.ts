import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleDriveRedirectUri } from "@/lib/connectors/google-drive";
import { startSourceSyncInBackground } from "@/lib/connectors/background-sync";

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type GoogleUserInfo = {
  email?: string;
  name?: string;
  picture?: string;
};

function decodeState(state: string) {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
    userId: string;
    organizationId: string;
    provider: string;
    createdAt: number;
  };
}

async function getGoogleTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: getGoogleDriveRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Google token exchange failed");
  }

  return data;
}

async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await res.json()) as GoogleUserInfo;

  if (!res.ok) {
    throw new Error("Could not fetch Google user info");
  }

  return data;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL || process.env.APP_URL ||
    url.origin;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?drive=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?drive=missing_code`
    );
  }

  try {
    const decodedState = decodeState(state);

    if (!decodedState.userId || !decodedState.organizationId) {
      throw new Error("Invalid OAuth state");
    }

    const tokens = await getGoogleTokens(code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    let source = await prisma.source.findFirst({
  where: {
    organizationId: decodedState.organizationId,
    type: "GOOGLE_DRIVE",
  },
});

if (source) {
  source = await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      name: "Google Drive",
      status: "CONNECTED",
    },
  });
} else {
  source = await prisma.source.create({
    data: {
      organizationId: decodedState.organizationId,
      type: "GOOGLE_DRIVE",
      name: "Google Drive",
      status: "CONNECTED",
    },
  });
}

   const existingAccount = await prisma.connectedAccount.findFirst({
  where: {
    userId: decodedState.userId,
    sourceId: source.id,
  },
});

if (existingAccount) {
  await prisma.connectedAccount.update({
    where: {
      id: existingAccount.id,
    },
    data: {
      provider: "GOOGLE_DRIVE",
      providerAccountId: googleUser.email || "google-drive",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || existingAccount.refreshToken,
      scope: tokens.scope || null,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      revokedAt: null,
    },
  });
} else {
  await prisma.connectedAccount.create({
    data: {
      userId: decodedState.userId,
      organizationId: decodedState.organizationId,
      sourceId: source.id,
      provider: "GOOGLE_DRIVE",
      providerAccountId: googleUser.email || "google-drive",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      scope: tokens.scope || null,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      revokedAt: null,
    },
  });
}

    startSourceSyncInBackground({
      sourceId: source.id,
      userId: decodedState.userId,
      organizationId: decodedState.organizationId,
      reason: "connect",
    });

    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?drive=connected`
    );
  } catch (error) {
    console.error("Google Drive callback failed:", error);

    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?drive=callback_failed`
    );
  }
}