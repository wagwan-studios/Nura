import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

async function slackFetch(path: string, token: string) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId: session.user.id as string,
      organizationId: session.user.organizationId as string,
      provider: "SLACK",
      accessToken: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "Slack is not connected for this user" },
      { status: 404 }
    );
  }

  const accessToken = decryptToken(account.accessToken);

  const authTest = await slackFetch("auth.test", accessToken);

  const conversations = await slackFetch(
    "conversations.list?types=public_channel,private_channel,mpim,im&limit=20",
    accessToken
  );

  const channelId = req.nextUrl.searchParams.get("channel");

  let history = null;

  if (channelId) {
    history = await slackFetch(
      `conversations.history?channel=${channelId}&limit=10`,
      accessToken
    );
  }

  return NextResponse.json({
    connectedAccount: {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      providerEmail: account.providerEmail,
      scope: account.scope,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    },
    authTest,
    conversations: conversations.ok
      ? conversations.channels?.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          isChannel: channel.is_channel,
          isGroup: channel.is_group,
          isIm: channel.is_im,
          isMpim: channel.is_mpim,
          isPrivate: channel.is_private,
          isMember: channel.is_member,
        }))
      : conversations,
    history,
  });
}