import { SourceType } from "@prisma/client";
import { ConnectorAdapter } from "@/lib/connectors/types";
import { githubAdapter } from "@/lib/connectors/adapters/github";
import { slackAdapter } from "@/lib/connectors/adapters/slack";
import { gmailAdapter } from "@/lib/connectors/adapters/gmail";

const adapters: ConnectorAdapter[] = [
  githubAdapter,
  slackAdapter,
  gmailAdapter,
];

export function getConnectorAdapter(type: SourceType) {
  return adapters.find((adapter) => adapter.type === type) ?? null;
}

export function getSupportedConnectorTypes() {
  return adapters.map((adapter) => adapter.type);
}

export function isSyncSupported(type: SourceType) {
  return Boolean(getConnectorAdapter(type));
}