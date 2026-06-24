import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// import { deleteSource } from "@/lib/actions";
import { SourceIcon } from "@/components/SourceIcon";
import { SOURCE_ICON_BG } from "@/lib/ui";
import type { SourceType } from "@prisma/client";
import { RemoveSourceButton } from "./RemoveSourceButton";
import { SyncSourceButton } from "@/components/SyncSourceButton";
import { SyncAllSourcesButton } from "@/components/SyncAllSourcesButton";

const AVAILABLE_CONNECTORS: {
  type: SourceType;
  name: string;
  description: string;
  connectUrl: string | null;
}[] = [
  {
    type: "GMAIL",
    name: "Gmail",
    description: "Connect Gmail to sync emails and conversations.",
    connectUrl: "/api/connectors/gmail/connect",
  },
  {
    type: "GITHUB",
    name: "GitHub",
    description: "Connect GitHub to sync repositories, issues, and commits.",
    connectUrl: "/api/connectors/github/connect",
  },
  {
    type: "SLACK",
    name: "Slack",
    description: "Connect Slack to sync channels and team conversations.",
    connectUrl: "/api/connectors/slack/connect",
  },
  {
    type: "NOTION",
    name: "Notion",
    description: "Sync Notion pages, docs, and internal knowledge.",
    connectUrl: null,
  },
  {
    type: "JIRA",
    name: "Jira",
    description: "Sync Jira issues, comments, projects, and decisions.",
    connectUrl: null,
  },
  {
    type: "LINEAR",
    name: "Linear",
    description: "Sync Linear issues, projects, and engineering updates.",
    connectUrl: null,
  },
  {
    type: "CONFLUENCE",
    name: "Confluence",
    description: "Sync Confluence pages, spaces, and documentation.",
    connectUrl: null,
  },
  {
    type: "GDRIVE",
    name: "Google Drive",
    description: "Sync Google Docs, files, and shared folders.",
    connectUrl: null,
  },
  {
    type: "ZOOM",
    name: "Zoom",
    description: "Sync meeting transcripts, recordings, and summaries.",
    connectUrl: null,
  },
  {
    type: "HUBSPOT",
    name: "HubSpot",
    description: "Sync CRM notes, deals, contacts, and customer history.",
    connectUrl: null,
  },
  {
    type: "MANUAL",
    name: "Manual",
    description: "Add knowledge manually through uploads or text input.",
    connectUrl: null,
  },
];

export default async function SourcesPage() {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return null;
  }

  const userId = session.user.id as string;
  const organizationId = session.user.organizationId as string;

  const connectedSources = await prisma.source.findMany({
    where: {
      organizationId,
      status: "CONNECTED",
      connectedAccounts: {
        some: {
          userId,
          accessToken: {
            not: null,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      connectedAccounts: {
        where: {
          userId,
          accessToken: {
            not: null,
          },
        },
        select: {
          id: true,
          provider: true,
          providerEmail: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          entries: true,
          rawRecords: true,
          knowledgeChunks: true,
          connectedAccounts: true,
        },
      },
    },
  });
  //   const connectedSources = await prisma.source.findMany({
  //   where: {
  //     organizationId: session.user.organizationId,
  //     status: "CONNECTED",
  //     connectedAccounts: {
  //       some: {
  //         accessToken: {
  //           not: null,
  //         },
  //       },
  //     },
  //   },
  //   orderBy: {
  //     createdAt: "desc",
  //   },
  //   include: {
  //     _count: {
  //       select: {
  //         entries: true,
  //         connectedAccounts: true,
  //       },
  //     },
  //   },
  // });

  const availableConnectors = AVAILABLE_CONNECTORS.map((connector) => {
    const connectedSource = connector.connectUrl
      ? connectedSources.find((source) => source.type === connector.type)
      : null;

    return {
      ...connector,
      isConnected: Boolean(connector.connectUrl && connectedSource),
      sourceId: connectedSource?.id ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1>Sources</h1>
          <p>
            Connect the tools where HIQOR&apos;s team knowledge already lives.
          </p>
        </div>

        <SyncAllSourcesButton />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Add a source</span>
        </div>

        <div className="card-body">
          <div className="grid-3">
            {availableConnectors.map((connector) => (
              <div key={connector.type} className="integration-card">
                <div className="integration-header">
                  <div
                    className="integration-logo"
                    style={{
                      background:
                        SOURCE_ICON_BG[connector.type] ?? "var(--bg-warm)",
                    }}
                  >
                    <SourceIcon type={connector.type} className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="integration-name">{connector.name}</div>
                    <div className="integration-type">{connector.type}</div>
                  </div>

                  {connector.isConnected ? (
                    <span
                      className="pill pill-green"
                      style={{ marginLeft: "auto" }}
                    >
                      Connected
                    </span>
                  ) : connector.connectUrl ? (
                    <span className="pill" style={{ marginLeft: "auto" }}>
                      Not connected
                    </span>
                  ) : (
                    <span className="pill" style={{ marginLeft: "auto" }}>
                      Coming soon
                    </span>
                  )}
                </div>

                <div className="integration-meta">{connector.description}</div>

                <div className="integration-actions">
                  {connector.isConnected && connector.sourceId ? (
                    <Link
                      href={`/dashboard/sources/${connector.sourceId}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      View source
                    </Link>
                  ) : connector.connectUrl ? (
                    <Link
                      href={connector.connectUrl}
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      Connect now
                    </Link>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: "center" }}
                      disabled
                    >
                      Coming soon
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Connected sources</span>
        </div>

        <div className="card-body">
          {connectedSources.length === 0 ? (
            <div className="text-center" style={{ color: "var(--muted)" }}>
              No sources connected yet.
            </div>
          ) : (
            <div className="grid-3">
              {connectedSources.map((source) => (
                <div key={source.id} className="integration-card">
                  <div className="integration-header">
                    <div
                      className="integration-logo"
                      style={{
                        background:
                          SOURCE_ICON_BG[source.type] ?? "var(--bg-warm)",
                      }}
                    >
                      <SourceIcon type={source.type} className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/sources/${source.id}`}
                        className="integration-name"
                        style={{ display: "block" }}
                      >
                        {source.name}
                      </Link>
                      <div className="integration-type">{source.type}</div>
                    </div>

                    <span
                      className="pill pill-green"
                      style={{ marginLeft: "auto" }}
                    >
                      {source.status}
                    </span>
                  </div>

                  <div className="integration-meta">
                    {source._count.rawRecords} records ·{" "}
                    {source._count.knowledgeChunks} chunks
                    {/* {source._count.entries} entries */}
                    {source.lastSyncAt
                      ? ` · synced ${source.lastSyncAt.toLocaleDateString()}`
                      : ""}
                  </div>

                  <div className="integration-actions">
                    <Link
                      href={`/dashboard/sources/${source.id}`}
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      View
                    </Link>

                    <SyncSourceButton sourceId={source.id} />

                    <RemoveSourceButton sourceId={source.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
