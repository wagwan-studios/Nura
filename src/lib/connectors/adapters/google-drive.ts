import { prisma } from "@/lib/prisma";
import { ingestRawRecord } from "@/lib/knowledge/ingest";

type SyncInput = {
  sourceId: string;
  userId: string;
  organizationId: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
};

const DRIVE_FILES_LIMIT = Number(process.env.GOOGLE_DRIVE_SYNC_FILES_LIMIT || "50");

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
    throw new Error("Google Drive is not connected.");
  }

  return account;
}

async function driveFetch(accessToken: string, url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive API failed: ${text}`);
  }

  return res;
}

async function listDriveFiles(accessToken: string) {
  const params = new URLSearchParams({
    pageSize: String(DRIVE_FILES_LIMIT),
    fields:
      "files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress))",
    q: [
      "trashed = false",
      "(" +
        [
          "mimeType = 'application/vnd.google-apps.document'",
          "mimeType = 'text/plain'",
          "mimeType = 'text/markdown'",
          "mimeType = 'application/pdf'",
        ].join(" or ") +
        ")",
    ].join(" and "),
    orderBy: "modifiedTime desc",
  });

  const res = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  );

  const data = (await res.json()) as { files?: DriveFile[] };

  return data.files || [];
}

async function exportGoogleDoc(accessToken: string, fileId: string) {
  const res = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
  );

  return res.text();
}

async function downloadFileText(accessToken: string, fileId: string) {
  const res = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );

  const contentType = res.headers.get("content-type") || "";

  if (
    contentType.includes("text/plain") ||
    contentType.includes("text/markdown")
  ) {
    return res.text();
  }

  // PDF parsing should be added later.
  return "";
}

async function getDriveFileContent(accessToken: string, file: DriveFile) {
  if (file.mimeType === "application/vnd.google-apps.document") {
    return exportGoogleDoc(accessToken, file.id);
  }

  if (
    file.mimeType === "text/plain" ||
    file.mimeType === "text/markdown"
  ) {
    return downloadFileText(accessToken, file.id);
  }

  return "";
}

export const googleDriveAdapter = {
  type: "GOOGLE_DRIVE",
  supportsAutoSync: true,

  async sync({ sourceId, userId, organizationId }: SyncInput) {
    const account = await getConnectedAccount(sourceId, userId);
    const files = await listDriveFiles(account.accessToken);

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const content = await getDriveFileContent(account.accessToken, file);

        if (!content?.trim()) {
          skipped += 1;
          continue;
        }

        await ingestRawRecord({
          sourceId,
          organizationId,
          externalId: file.id,
          recordType: "drive_file",
          title: file.name,
          url: file.webViewLink || null,
          author:
            file.owners?.[0]?.emailAddress ||
            file.owners?.[0]?.displayName ||
            null,
          occurredAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
          content,
          metadata: {
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            owners: file.owners || [],
          },
          visibility: "ORG",
        });

        synced += 1;
      } catch (error) {
        failed += 1;

        console.error("Google Drive file sync failed:", {
          fileId: file.id,
          fileName: file.name,
          error: getErrorMessage(error),
        });
      }
    }

    return {
      recordsSynced: synced,
      recordsSkipped: skipped,
      recordsFailed: failed,
      filesSeen: files.length,
    };
  },
};