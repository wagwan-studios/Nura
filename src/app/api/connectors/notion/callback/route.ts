import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getNotionBasicAuthHeader,
  getNotionRedirectUri,
} from "@/lib/connectors/notion";
import { startSourceSyncInBackground } from "@/lib/connectors/background-sync";

type NotionTokenResponse = {
  access_token: string;
  token_type: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_icon?: string | null;
  owner?: unknown;
  duplicated_template_id?: string | null;
};

type OAuthState = {
  userId: string;
  organizationId: string;
  provider: string;
  createdAt: number;
};

function decodeState(state: string) {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthState;
}

async function exchangeNotionCode(code: string) {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();
  const redirectUri = getNotionRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error("NOTION_CLIENT_ID or NOTION_CLIENT_SECRET is missing");
  }

  const encodedCredentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as NotionTokenResponse & {
    error?: string;
    error_description?: string;
    message?: string;
  };

  if (!res.ok) {
    console.error("Notion token exchange failed response:", {
      status: res.status,
      error: data.error,
      error_description: data.error_description,
      message: data.message,
      redirectUri,
      clientId,
      hasClientSecret: Boolean(clientSecret),
    });

    throw new Error(
      data.error_description ||
        data.message ||
        data.error ||
        "Notion token exchange failed"
    );
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
    process.env.AUTH_URL ||
    "http://127.0.0.1:3000";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?notion=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?notion=missing_code`
    );
  }

  try {
    const decodedState = decodeState(state);

    if (!decodedState.userId || !decodedState.organizationId) {
      throw new Error("Invalid Notion OAuth state");
    }

    const tokens = await exchangeNotionCode(code);

    let source = await prisma.source.findFirst({
      where: {
        organizationId: decodedState.organizationId,
        type: "NOTION",
      },
    });

    if (source) {
      source = await prisma.source.update({
        where: {
          id: source.id,
        },
        data: {
          name: "Notion",
          status: "CONNECTED",
        },
      });
    } else {
      source = await prisma.source.create({
        data: {
          organizationId: decodedState.organizationId,
          type: "NOTION",
          name: "Notion",
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
          provider: "NOTION",
          providerAccountId:
            tokens.workspace_id || tokens.bot_id || "notion-workspace",
          accessToken: tokens.access_token,
          refreshToken: null,
          scope: null,
          expiresAt: null,
          revokedAt: null,
        },
      });
    } else {
      await prisma.connectedAccount.create({
        data: {
          userId: decodedState.userId,
          organizationId: decodedState.organizationId,
          sourceId: source.id,
          provider: "NOTION",
          providerAccountId:
            tokens.workspace_id || tokens.bot_id || "notion-workspace",
          accessToken: tokens.access_token,
          refreshToken: null,
          scope: null,
          expiresAt: null,
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
      `${baseUrl}/dashboard/sources?notion=connected`
    );
  } catch (error) {
    console.error("Notion callback failed:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.redirect(
      `${baseUrl}/dashboard/sources?notion=callback_failed`
    );
  }
}