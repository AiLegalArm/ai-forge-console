export type AgentBackendId = "opencode" | "codex" | "claude_code" | "cline";

export type AgentBackendStatus =
  | "not_configured"
  | "configured"
  | "available"
  | "unavailable"
  | "degraded"
  | "error";

export type AgentBackendHealthState = "unknown" | "healthy" | "degraded" | "unhealthy" | "error";

export type AgentBackendOperationMode = "local" | "cloud" | "hybrid";

export interface AgentBackendCapabilities {
  localCliExecution: boolean;
  multiFileEditing: boolean;
  taskExecution: boolean;
  terminalToolUse: boolean;
  streamingProgress: boolean;
  approvalIntegration: boolean;
  operationModes: AgentBackendOperationMode[];
  promptSystemConfig: boolean;
}

export interface AgentBackendMetadata {
  displayName: string;
  description: string;
  homepage?: string;
  version?: string;
  owner?: string;
  tags?: string[];
}

export interface AgentBackendAvailability {
  installed: boolean;
  configured: boolean;
  status: AgentBackendStatus;
  health: AgentBackendHealthState;
  statusDetail?: string;
  lastCheckedAt?: string;
}

export interface LinkedExecutionRef {
  sessionId?: string;
  runId?: string;
  taskId?: string;
  chatSessionId?: string;
  chatMessageId?: string;
}

export interface AgentBackendApprovalRequest {
  id: string;
  title: string;
  reason: string;
  actionType: "shell" | "filesystem" | "network" | "tool";
  requestedAt: string;
  metadata?: Record<string, string>;
}

export interface AgentBackendApprovalResponse {
  approvalRequestId: string;
  approved: boolean;
  respondedAt: string;
  note?: string;
}

export interface AgentBackendSession {
  id: string;
  backendId: AgentBackendId;
  createdAt: string;
  updatedAt: string;
  status: "created" | "active" | "idle" | "closing" | "closed" | "error";
  linked?: LinkedExecutionRef;
  metadata?: Record<string, string>;
}

export interface AgentBackendTaskSubmission {
  taskId: string;
  title: string;
  prompt: string;
  linked?: LinkedExecutionRef;
  systemPrompt?: string;
  metadata?: Record<string, string>;
}

export interface AgentBackendRun {
  id: string;
  backendId: AgentBackendId;
  sessionId: string;
  status: "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  linked?: LinkedExecutionRef;
}

export interface AgentBackendTaskResult {
  runId: string;
  status: "completed" | "failed" | "cancelled";
  summary?: string;
  output?: string;
  linked?: LinkedExecutionRef;
  completedAt: string;
}

export interface AgentBackendFailure {
  backendId: AgentBackendId;
  runId?: string;
  code: string;
  message: string;
  recoverable: boolean;
  occurredAt: string;
}

export interface AgentBackendCancellation {
  runId: string;
  reason?: string;
  cancelledAt: string;
}

export type AgentBackendEventType =
  | "session.updated"
  | "run.updated"
  | "run.progress"
  | "run.approval_required"
  | "run.result"
  | "run.failure"
  | "run.cancelled";

export interface AgentBackendEvent {
  id: string;
  backendId: AgentBackendId;
  type: AgentBackendEventType;
  timestamp: string;
  sessionId?: string;
  runId?: string;
  progress?: number;
  message?: string;
  approvalRequest?: AgentBackendApprovalRequest;
  result?: AgentBackendTaskResult;
  failure?: AgentBackendFailure;
  cancellation?: AgentBackendCancellation;
  linked?: LinkedExecutionRef;
}

export type AgentBackendEventStreamMode = "stream" | "poll";

export interface AgentBackendContract {
  readonly id: AgentBackendId;
  readonly metadata: AgentBackendMetadata;
  readonly capabilities: AgentBackendCapabilities;
  getAvailability: () => Promise<AgentBackendAvailability>;
  createSession: (linked?: LinkedExecutionRef) => Promise<AgentBackendSession>;
  closeSession: (sessionId: string) => Promise<void>;
  submitTask: (sessionId: string, task: AgentBackendTaskSubmission) => Promise<AgentBackendRun>;
  getRun: (runId: string) => Promise<AgentBackendRun | null>;
  getRunResult: (runId: string) => Promise<AgentBackendTaskResult | null>;
  listEvents: (sessionId: string, cursor?: string) => Promise<{ events: AgentBackendEvent[]; nextCursor?: string }>;
  eventStreamMode: AgentBackendEventStreamMode;
  cancelRun: (runId: string, reason?: string) => Promise<AgentBackendCancellation>;
  respondToApproval: (response: AgentBackendApprovalResponse) => Promise<void>;
}

export interface AgentBackendSummary {
  id: AgentBackendId;
  metadata: AgentBackendMetadata;
  capabilities: AgentBackendCapabilities;
  availability: AgentBackendAvailability;
  eventStreamMode: AgentBackendEventStreamMode;
}
