import { prisma } from "@/lib/prisma";
import { ingestRawRecord } from "@/lib/knowledge/ingest";
import { decryptToken } from "@/lib/encryption";
import type { ConnectorAdapter, ConnectorSyncContext } from "@/lib/connectors/types";
import { KnowledgeVisibility } from "@prisma/client";

type NotionSearchItem = {
  object: string;
  id: string;
  created_time?: string;
  last_edited_time?: string;
  url?: string;
  properties?: Record<string, NotionProperty>;
};

type NotionProperty = {
  id?: string;
  type?: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
};

type NotionRichText = {
  plain_text?: string;
};

type NotionBlock = {
  object: string;
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text?: NotionRichText[] };
  heading_1?: { rich_text?: NotionRichText[] };
  heading_2?: { rich_text?: NotionRichText[] };
  heading_3?: { rich_text?: NotionRichText[] };
  bulleted_list_item?: { rich_text?: NotionRichText[] };
  numbered_list_item?: { rich_text?: NotionRichText[] };
  to_do?: { rich_text?: NotionRichText[] };
  toggle?: { rich_text?: NotionRichText[] };
  quote?: { rich_text?: NotionRichText[] };
  callout?: { rich_text?: NotionRichText[] };
  code?: { rich_text?: NotionRichText[] };
};

const NOTION_VERSION = "2022-06-28";
const NOTION_SYNC_PAGES_LIMIT = Number(process.env.NOTION_SYNC_PAGES_LIMIT || "50");
const NOTION_BLOCK_DEPTH_LIMIT = Number(process.env.NOTION_BLOCK_DEPTH_LIMIT || "3");

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function getConnectedAccount(sourceId: string, userId: string) {
  const account = await prisma.connectedAccount.findFirst({
    where: {
      sourceId,
      userId,
      revokedAt: null,
      accessToken: {
        not: null,
      },
    },
  });

  if (!account?.accessToken) {
    throw new Error("Notion is not connected.");
  }

  return account;
}

async function notionFetch<T>(accessToken: string, url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = (await res.json()) as T & {
    object?: string;
    status?: number;
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message || data.code || "Notion API failed");
  }

  return data;
}

function richTextToPlainText(items?: NotionRichText[]) {
  return (items || [])
    .map((item) => item.plain_text || "")
    .join("")
    .trim();
}

function getBlockText(block: NotionBlock) {
  switch (block.type) {
    case "paragraph":
      return richTextToPlainText(block.paragraph?.rich_text);
    case "heading_1":
      return `# ${richTextToPlainText(block.heading_1?.rich_text)}`;
    case "heading_2":
      return `## ${richTextToPlainText(block.heading_2?.rich_text)}`;
    case "heading_3":
      return `### ${richTextToPlainText(block.heading_3?.rich_text)}`;
    case "bulleted_list_item":
      return `- ${richTextToPlainText(block.bulleted_list_item?.rich_text)}`;
    case "numbered_list_item":
      return `1. ${richTextToPlainText(block.numbered_list_item?.rich_text)}`;
    case "to_do":
      return `- [ ] ${richTextToPlainText(block.to_do?.rich_text)}`;
    case "toggle":
      return richTextToPlainText(block.toggle?.rich_text);
    case "quote":
      return `> ${richTextToPlainText(block.quote?.rich_text)}`;
    case "callout":
      return richTextToPlainText(block.callout?.rich_text);
    case "code":
      return richTextToPlainText(block.code?.rich_text);
    default:
      return "";
  }
}

function getPageTitle(page: NotionSearchItem) {
  const properties = page.properties || {};

  for (const property of Object.values(properties)) {
    if (property.type === "title") {
      const title = richTextToPlainText(property.title);
      if (title) return title;
    }
  }

  return "Untitled Notion Page";
}

async function searchNotionPages(accessToken: string) {
  const pages: NotionSearchItem[] = [];
  let cursor: string | undefined;

  while (pages.length < NOTION_SYNC_PAGES_LIMIT) {
    const data = await notionFetch<{
      results?: NotionSearchItem[];
      has_more?: boolean;
      next_cursor?: string | null;
    }>(accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({
        page_size: Math.min(100, NOTION_SYNC_PAGES_LIMIT - pages.length),
        start_cursor: cursor,
        filter: {
          property: "object",
          value: "page",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      }),
    });

    pages.push(...(data.results || []).filter((item) => item.object === "page"));

    if (!data.has_more || !data.next_cursor) break;

    cursor = data.next_cursor;
  }

  return pages.slice(0, NOTION_SYNC_PAGES_LIMIT);
}

async function getBlockChildren(
  accessToken: string,
  blockId: string,
  depth = 0
): Promise<string[]> {
  if (depth > NOTION_BLOCK_DEPTH_LIMIT) return [];

  const output: string[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      page_size: "100",
    });

    if (cursor) {
      params.set("start_cursor", cursor);
    }

    const data = await notionFetch<{
      results?: NotionBlock[];
      has_more?: boolean;
      next_cursor?: string | null;
    }>(
      accessToken,
      `https://api.notion.com/v1/blocks/${blockId}/children?${params.toString()}`
    );

    for (const block of data.results || []) {
      const text = getBlockText(block);

      if (text) {
        output.push(text);
      }

      if (block.has_children) {
        const childText = await getBlockChildren(accessToken, block.id, depth + 1);
        output.push(...childText);
      }
    }

    cursor = data.next_cursor || undefined;

    if (!data.has_more) break;
  } while (cursor);

  return output;
}

export const notionAdapter: ConnectorAdapter = {
  type: "NOTION",
  supportsAutoSync: true,
  label: "Notion",

  async sync({ sourceId, userId, organizationId }: ConnectorSyncContext) {
    const account = await getConnectedAccount(sourceId, userId);
    if (!account.accessToken) {
      throw new Error("Notion access token is missing. Please reconnect Notion.");
    }

    const accessToken = decryptToken(account.accessToken);
    const pages = await searchNotionPages(accessToken);

    let synced = 0;
    let skipped = 0;
    let failed = 0;
    let chunksCreated = 0;

    for (const page of pages) {
      try {
        const title = getPageTitle(page);
        const blocks = await getBlockChildren(accessToken, page.id);
        const content = blocks.join("\n").trim();

        if (!content) {
          skipped += 1;
          continue;
        }

        const result = await ingestRawRecord({
          provider: "NOTION",
          sourceId,
          userId,
          organizationId,
          externalId: page.id,
          recordType: "notion_page",
          title,
          content: `
Notion Page: ${title}
URL: ${page.url || "Unavailable"}
Created: ${page.created_time || "Unknown"}
Last edited: ${page.last_edited_time || "Unknown"}

${content}
          `,
          payload: {
            id: page.id,
            object: page.object,
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time,
            url: page.url,
          },
          visibility: KnowledgeVisibility.ORGANIZATION,
        });

        synced += 1;
        chunksCreated += result.chunksCreated;
      } catch (error) {
        failed += 1;

        console.error("Notion page sync failed:", {
          pageId: page.id,
          error: getErrorMessage(error),
        });
      }
    }

    return {
      provider: "NOTION",
      recordsSynced: synced,
      chunksCreated,
      details: {
        recordsSkipped: skipped,
        recordsFailed: failed,
        pagesSeen: pages.length,
      },
    };
  },
};
