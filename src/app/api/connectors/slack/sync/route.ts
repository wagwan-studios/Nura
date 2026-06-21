import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { ingestRawRecord } from "@/lib/knowledge/ingest";

async function slackFetch(path: string, token: string) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(
      `Slack API failed for ${path}: ${data.error || "unknown_error"}`
    );
  }

  return data;
}

function getSlackChannelName(channel: any) {
  if (channel.name) return channel.name;
  if (channel.is_im) return `dm-${channel.user || channel.id}`;
  if (channel.is_mpim) return `group-dm-${channel.id}`;
  return channel.id;
}

async function syncSlack(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const channelLimit = Math.min(
    Number(req.nextUrl.searchParams.get("channels") || "10"),
    50
  );

  const messageLimit = Math.min(
    Number(req.nextUrl.searchParams.get("messages") || "10"),
    50
  );

  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId,
      organizationId,
      provider: "SLACK",
      accessToken: {
        not: null,
      },
      revokedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      source: true,
    },
  });

  if (!account?.accessToken) {
    return NextResponse.json(
      { error: "Slack is not connected for this user" },
      { status: 404 }
    );
  }

  const source =
    account.source ??
    (await prisma.source.upsert({
      where: {
        id: `slack-${organizationId}-${userId}`,
      },
      update: {
        status: "CONNECTED",
      },
      create: {
        id: `slack-${organizationId}-${userId}`,
        type: "SLACK",
        name: "Slack",
        status: "CONNECTED",
        organizationId,
      },
    }));

  const accessToken = decryptToken(account.accessToken);

  const conversations = await slackFetch(
    `conversations.list?types=public_channel,private_channel,mpim,im&limit=${channelLimit}`,
    accessToken
  );

  const channels = Array.isArray(conversations.channels)
    ? conversations.channels
    : [];

  let recordsSynced = 0;
  let chunksCreated = 0;
  let messagesFetched = 0;

  for (const channel of channels) {
    if (channel.is_archived) continue;

    const channelName = getSlackChannelName(channel);

    const channelRecord = await ingestRawRecord({
      provider: "SLACK",
      recordType: "channel",
      externalId: `channel:${channel.id}`,
      title: `Slack Channel: ${channelName}`,
      content: `
Slack Channel: ${channelName}
Channel ID: ${channel.id}
Private: ${channel.is_private ? "Yes" : "No"}
Member: ${channel.is_member ? "Yes" : "No"}
Topic: ${channel.topic?.value ?? ""}
Purpose: ${channel.purpose?.value ?? ""}
      `,
      payload: channel,
      sourceId: source.id,
      userId,
      organizationId,
      visibility: "PERSONAL",
    });

    recordsSynced += 1;
    chunksCreated += channelRecord.chunksCreated;

    try {
      const history = await slackFetch(
        `conversations.history?channel=${channel.id}&limit=${messageLimit}`,
        accessToken
      );

      const messages = Array.isArray(history.messages) ? history.messages : [];

      for (const message of messages) {
        if (!message.text || message.subtype === "bot_message") continue;

        const messageRecord = await ingestRawRecord({
          provider: "SLACK",
          recordType: "message",
          externalId: `message:${channel.id}:${message.ts}`,
          title: `Slack message in ${channelName}`,
          content: `
Slack Channel: ${channelName}
Channel ID: ${channel.id}
Message User: ${message.user ?? "Unknown"}
Message Time: ${message.ts}
Message:
${message.text}
          `,
          payload: message,
          sourceId: source.id,
          userId,
          organizationId,
          visibility: "PERSONAL",
        });

        recordsSynced += 1;
        chunksCreated += messageRecord.chunksCreated;
        messagesFetched += 1;
      }
    } catch (error) {
      console.log("Slack history skipped:", {
        channel: channel.id,
        name: channelName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      status: "CONNECTED",
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    provider: "SLACK",
    sourceId: source.id,
    channelsFetched: channels.length,
    messagesFetched,
    recordsSynced,
    chunksCreated,
  });
}

export async function POST(req: NextRequest) {
  return syncSlack(req);
}

export async function GET(req: NextRequest) {
  return syncSlack(req);
}