import type { ProviderBackend } from "@/types/local-inference";

export type SyncStatus =
  | "disconnected"
  | "connected"
  | "syncing"
  | "dirty"
  | "up_to_date"
  | "conflict"
  | "blocked"
  | "error";

export type EntityLinkRef = {
  taskId?: string;
  subtaskId?: string;
  chatSessionId?: string;
  executionContextId?: string;
  branchName?: string;
  reviewId?: string;
  releaseCandidateId?: string;
  agentId?: string;
  findingId?: string;
  evidenceIds?: string[];
};

export type RuntimeProviderBackend = ProviderBackend;
