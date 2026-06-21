import { SourceType } from "@prisma/client";

export type ConnectorSyncContext = {
  sourceId: string;
  userId: string;
  organizationId: string;
};

export type ConnectorSyncResult = {
  provider: SourceType;
  recordsSynced: number;
  chunksCreated: number;
  details?: Record<string, unknown>;
};

export type ConnectorAdapter = {
  type: SourceType;
  label: string;
  supportsAutoSync: boolean;
  sync: (context: ConnectorSyncContext) => Promise<ConnectorSyncResult>;
};