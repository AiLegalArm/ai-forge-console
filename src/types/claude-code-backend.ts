import type {
  AgentBackendAvailability,
  AgentBackendFailure,
  AgentBackendRun,
  AgentBackendSession,
  AgentBackendStatus,
  AgentBackendTaskResult,
  LinkedExecutionRef,
} from "@/types/agent-backends";

export type ClaudeCodeBackendState =
  | "not_installed"
  | "installed"
  | "configured"
  | "ready"
  | "unavailable"
  | "degraded"
  | "error";

export interface ClaudeCodeConfiguration {
  executablePath: string;
  workingDirectory: string;
  configuredAt?: string;
  environment?: Record<string, string>;
}

export interface ClaudeCodeRuntimeMetadata {
  runtimeName: "claude-code";
  runtimeVersion: string;
  platform: string;
  transport: "stdio";
}

export interface ClaudeCodeConfigurationState {
  state: ClaudeCodeBackendState;
  configured: boolean;
  detail?: string;
  lastTransitionAt: string;
}

export interface ClaudeCodeAvailabilityState {
  state: ClaudeCodeBackendState;
  isInstalled: boolean;
  isAvailable: boolean;
  health: AgentBackendAvailability["health"];
  detail?: string;
  checkedAt: string;
}

export interface ClaudeCodeTaskSessionReadiness {
  canCreateSession: boolean;
  canSubmitTask: boolean;
  canStreamProgress: boolean;
  canCancel: boolean;
  reason?: string;
}

export interface ClaudeCodeBackendSnapshot {
  backendState: ClaudeCodeBackendState;
  configuration: ClaudeCodeConfiguration;
  configurationState: ClaudeCodeConfigurationState;
  availability: ClaudeCodeAvailabilityState;
  metadata: ClaudeCodeRuntimeMetadata;
  readiness: ClaudeCodeTaskSessionReadiness;
}

export interface ClaudeCodeSession extends AgentBackendSession {
  backendId: "claude_code";
  metadata: Record<string, string> & {
    workingDirectory: string;
    executablePath: string;
    runtimeVersion: string;
  };
}

export interface ClaudeCodeRun extends AgentBackendRun {
  backendId: "claude_code";
  metadata?: Record<string, string> & {
    taskTitle: string;
    startedBy: "provider_hub" | "agent_studio";
  };
}

export interface ClaudeCodeRunProgress {
  runId: string;
  sessionId: string;
  progress: number;
  message: string;
  timestamp: string;
  linked?: LinkedExecutionRef;
}

export interface ClaudeCodeRunCompletion {
  result: AgentBackendTaskResult;
  linked?: LinkedExecutionRef;
}

export interface ClaudeCodeRunFailure {
  failure: AgentBackendFailure;
  linked?: LinkedExecutionRef;
}

export function mapClaudeStateToBackendStatus(state: ClaudeCodeBackendState): AgentBackendStatus {
  switch (state) {
    case "not_installed":
      return "not_configured";
    case "installed":
      return "not_configured";
    case "configured":
      return "configured";
    case "ready":
      return "available";
    case "unavailable":
      return "unavailable";
    case "degraded":
      return "degraded";
    case "error":
      return "error";
  }
}
