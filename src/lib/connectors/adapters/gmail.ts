import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/encryption";
import { ingestRawRecord } from "@/lib/knowledge/ingest";
import { ConnectorAdapter, ConnectorSyncContext } from "@/lib/connectors/types";

async function refreshGmailAccessToken(account: any) {
  if (!account.refreshToken) {
    return decryptToken(account.accessToken);
  }

  if (account.expiresAt && new Date(account.expiresAt).getTime() > Date.now() + 60_000) {
    return decryptToken(account.accessToken);
  }

  const refreshToken = decryptToken(account.refreshToken);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(`Gmail refresh failed: ${data.error || "unknown_error"}`);
  }

  await prisma.connectedAccount.update({
    where: {
      id: account.id,
    },
    data: {
      accessToken: encryptToken(data.access_token),
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    },
  });

  return data.access_token as string;
}

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Gmail API failed for ${path}: ${data.error?.message || "unknown_error"}`
    );
  }

  return data;
}

function decodeBase64Url(value?: string) {
  if (!value) return "";

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function getHeader(headers: any[], name: string) {
  return (
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value || ""
  );
}

function extractEmailBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (Array.isArray(payload.parts)) {
    const plainPart = payload.parts.find(
      (part: any) => part.mimeType === "text/plain" && part.body?.data
    );

    if (plainPart) {
      return decodeBase64Url(plainPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (part: any) => part.mimeType === "text/html" && part.body?.data
    );

    if (htmlPart) {
      return decodeBase64Url(htmlPart.body.data)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

function cleanEmailText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, 12000);
}

export const gmailAdapter: ConnectorAdapter = {
  type: "GMAIL",
  label: "Gmail",
  supportsAutoSync: true,

  async sync({ sourceId, userId, organizationId }: ConnectorSyncContext) {
    const account = await prisma.connectedAccount.findFirst({
      where: {
        userId,
        organizationId,
        provider: "GMAIL",
        accessToken: {
          not: null,
        },
        revokedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!account?.accessToken) {
      throw new Error("Gmail account is not connected.");
    }

    const accessToken = await refreshGmailAccessToken(account);

    const limit = Math.min(
      Number(process.env.GMAIL_SYNC_MESSAGES_LIMIT || "30"),
      100
    );

    const listData = await gmailFetch(
      `users/me/messages?maxResults=${limit}&q=in:anywhere newer_than:30d`,
      accessToken
    );

    const messages = Array.isArray(listData.messages) ? listData.messages : [];

    let recordsSynced = 0;
    let chunksCreated = 0;

    for (const item of messages) {
      const messageData = await gmailFetch(
        `users/me/messages/${item.id}?format=full`,
        accessToken
      );

      const headers = messageData.payload?.headers || [];

      const subject = getHeader(headers, "Subject") || "No subject";
      const from = getHeader(headers, "From") || "Unknown sender";
      const to = getHeader(headers, "To") || "";
      const date = getHeader(headers, "Date") || "";
      const body = cleanEmailText(extractEmailBody(messageData.payload));

      if (!body && !messageData.snippet) continue;

      const emailText = `
Email Subject: ${subject}
From: ${from}
To: ${to}
Date: ${date}
Snippet: ${messageData.snippet || ""}

Body:
${body || messageData.snippet || ""}
      `;

      const result = await ingestRawRecord({
        provider: "GMAIL",
        recordType: "email",
        externalId: `gmail:${messageData.id}`,
        title: `Email: ${subject}`,
        content: emailText,
        payload: {
          id: messageData.id,
          threadId: messageData.threadId,
          labelIds: messageData.labelIds,
          snippet: messageData.snippet,
          subject,
          from,
          to,
          date,
          bodyPreview: body.slice(0, 1000),
        },
        sourceId,
        userId,
        organizationId,
        visibility: "PERSONAL",
      });

      recordsSynced += 1;
      chunksCreated += result.chunksCreated;
    }

    return {
      provider: "GMAIL",
      recordsSynced,
      chunksCreated,
      details: {
        messagesFetched: messages.length,
      },
    };
  },
};