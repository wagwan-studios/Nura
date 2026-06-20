import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

async function revokeGitHubToken(accessToken: string) {
  const basicAuth = Buffer.from(
    `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
  ).toString("base64");

  await fetch(
    `https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    }
  );
}

async function revokeSlackToken(accessToken: string) {
  await fetch("https://slack.com/api/auth.revoke", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: accessToken,
    }),
  });
}

async function revokeGoogleToken(token: string) {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token,
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.redirect(`${process.env.APP_URL}/login`);
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const formData = await req.formData();
  const sourceId = String(formData.get("sourceId") || "");

  if (!sourceId) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?disconnect=missing_source`
    );
  }

  // const source = await prisma.source.findFirst({
  //   where: {
  //     id: sourceId,
  //     organizationId,
  //   },
  //   include: {
  //     connectedAccounts: {
  //       where: {
  //         organizationId,
  //         accessToken: {
  //           not: null,
  //         },
  //       },
  //     },
  //   },
  // });
  const source = await prisma.source.findFirst({
  where: {
    id: sourceId,
    organizationId,
    connectedAccounts: {
      some: {
        userId,
      },
    },
  },
  include: {
    connectedAccounts: {
      where: {
        userId,
        organizationId,
        accessToken: {
          not: null,
        },
      },
    },
  },
});

  if (!source) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/sources?disconnect=not_found`
    );
  }

  for (const account of source.connectedAccounts) {
    try {
      if (!account.accessToken) {
        continue;
      }

      const accessToken = decryptToken(account.accessToken);

      const refreshToken = account.refreshToken
        ? decryptToken(account.refreshToken)
        : null;

      if (account.provider === "GITHUB") {
        await revokeGitHubToken(accessToken);
      }

      if (account.provider === "SLACK") {
        await revokeSlackToken(accessToken);
      }

      if (account.provider === "GMAIL") {
        await revokeGoogleToken(refreshToken ?? accessToken);
      }
    } catch (error) {
      console.log("Provider revoke failed. Soft disconnect will continue:", {
        provider: account.provider,
        accountId: account.id,
        error,
      });
    }
  }

  await prisma.connectedAccount.updateMany({
    where: {
      sourceId: source.id,
      userId,
      organizationId,
    },
    data: {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      revokedAt: new Date(),
    },
  });

  await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      status: "DISCONNECTED",
      lastSyncAt: null,
    },
  });

  return NextResponse.redirect(
    `${process.env.APP_URL}/dashboard/sources?disconnect=success`
  );
}