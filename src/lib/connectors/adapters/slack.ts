import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { ingestRawRecord } from "@/lib/knowledge/ingest";
import { ConnectorAdapter, ConnectorSyncContext } from "@/lib/connectors/types";

async function slackFetch(path: string, token: string) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Slack API failed for ${path}: ${data.error || "unknown_error"}`);
  }

  return data;
}

function getSlackChannelName(channel: any) {
  if (channel.name) return channel.name;
  if (channel.is_im) return `dm-${channel.user || channel.id}`;
  if (channel.is_mpim) return `group-dm-${channel.id}`;
  return channel.id;
}

export const slackAdapter: ConnectorAdapter = {
  type: "SLACK",
  label: "Slack",
  supportsAutoSync: true,

  async sync({ sourceId, userId, organizationId }: ConnectorSyncContext) {
    const account = await prisma.connectedAccount.findFirst({
      where: {
        userId,
        organizationId,
        provider: "SLACK",
        accessToken: { not: null },
        revokedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!account?.accessToken) {
      throw new Error("Slack account is not connected.");
    }

    const accessToken = decryptToken(account.accessToken);

    const channelLimit = Number(process.env.SLACK_SYNC_CHANNELS_LIMIT || "10");
    const messageLimit = Number(process.env.SLACK_SYNC_MESSAGES_LIMIT || "10");

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
        sourceId,
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
          if (!message.text) continue;

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
            sourceId,
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

    return {
      provider: "SLACK",
      recordsSynced,
      chunksCreated,
      details: {
        channelsFetched: channels.length,
        messagesFetched,
      },
    };
  },
};