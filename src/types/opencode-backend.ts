import type { AgentBackendOperationMode, AgentBackendStatus, LinkedExecutionRef } from "@/types/agent-backends";

export type OpenCodeBackendState = AgentBackendStatus;

export interface OpenCodeModelSelectionPlaceholders {
  chatModel?: string;
  codingModel?: string;
  reasoningModel?: string;
}

export interface OpenCodeStatusHealthMetadata {
  detail?: string;
  lastHealthCheckAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface OpenCodeLocalRuntimeAvailability {
  installed: boolean;
  available: boolean;
  checkedAt?: string;
  reason?: string;
}

export interface OpenCodeBackendConfiguration {
  executablePath: string;
  workingDirectory: string;
  backendMode: AgentBackendOperationMode;
  modelSelection: OpenCodeModelSelectionPlaceholders;
  statusMetadata: OpenCodeStatusHealthMetadata;
  localRuntime: OpenCodeLocalRuntimeAvailability;
}

export interface OpenCodeLinkedRefs extends LinkedExecutionRef {
  agentId?: string;
}

export interface OpenCodeSessionContext {
  sessionId: string;
  linked?: OpenCodeLinkedRefs;
  startedAt: string;
}

export interface OpenCodeTaskEnvelope {
  runId: string;
  sessionId: string;
  taskId: string;
  title: string;
  prompt: string;
  linked?: OpenCodeLinkedRefs;
  submittedAt: string;
}

export interface OpenCodeProgressUpdate {
  runId: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface OpenCodeCompletionRecord {
  runId: string;
  status: "completed" | "failed" | "cancelled";
  summary?: string;
  output?: string;
  failedCode?: string;
  completedAt: string;
}
