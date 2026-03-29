import type {
  AgentBackendAvailability,
  AgentBackendCancellation,
  AgentBackendFailure,
  AgentBackendHealthState,
  AgentBackendRun,
  AgentBackendSession,
  AgentBackendTaskResult,
  LinkedExecutionRef,
} from "@/types/agent-backends";

export type ClineBackendState =
  | "not_installed"
  | "installed"
  | "configured"
  | "ready"
  | "unavailable"
  | "degraded"
  | "error";

export interface ClineBackendConfiguration {
  executablePath: string;
  runtimePath?: string;
  workingDirectory: string;
  configuredAt?: string;
  configState: "empty" | "partial" | "complete";
}

export interface ClineBackendAvailabilityState {
  state: ClineBackendState;
  isInstalled: boolean;
  isAvailable: boolean;
  health: AgentBackendHealthState;
  detail?: string;
  checkedAt: string;
}

export interface ClineBackendMetadata {
  runtimeName: "cline";
  runtimeVersion: string;
  transport: "stdio" | "extension-bridge";
  platform: "local-cli" | "extension-host";
}

export interface ClineTaskSessionReadiness {
  canCreateSession: boolean;
  canSubmitTask: boolean;
  canStreamProgress: boolean;
  canCancel: boolean;
  reason?: string;
}

export interface ClineConfigurationState {
  state: ClineBackendState;
  configured: boolean;
  detail?: string;
  lastTransitionAt: string;
}

export interface ClineBackendSnapshot {
  backendState: ClineBackendState;
  configuration: ClineBackendConfiguration;
  configurationState: ClineConfigurationState;
  availability: ClineBackendAvailabilityState;
  metadata: ClineBackendMetadata;
  readiness: ClineTaskSessionReadiness;
}

export interface ClineSession extends AgentBackendSession {
  backendId: "cline";
  metadata?: Record<string, string> & {
    executablePath: string;
    workingDirectory: string;
    configState: ClineBackendConfiguration["configState"];
    runtimeVersion: string;
  };
}

export interface ClineRun extends AgentBackendRun {
  backendId: "cline";
  metadata?: Record<string, string> & {
    taskId: string;
    title: string;
    cancellationReady: "true";
  };
}

export interface ClineRunLifecycle {
  run: ClineRun;
  progressEvents: Array<{ progress: number; message: string; timestamp: string }>;
  result?: AgentBackendTaskResult;
  failure?: AgentBackendFailure;
  cancellation?: AgentBackendCancellation;
  linked?: LinkedExecutionRef;
}

export function mapClineStateToAvailability(snapshot: ClineBackendSnapshot): AgentBackendAvailability {
  return {
    installed: snapshot.availability.isInstalled,
    configured: snapshot.configurationState.configured,
    status: snapshot.backendState,
    health: snapshot.availability.health,
    statusDetail:
      snapshot.availability.detail ??
      `state=${snapshot.backendState}; executable=${snapshot.configuration.executablePath}; cwd=${snapshot.configuration.workingDirectory}`,
    lastCheckedAt: snapshot.availability.checkedAt,
    localRuntimeAvailable: snapshot.availability.isAvailable,
    active: snapshot.backendState === "ready" || snapshot.backendState === "degraded",
    preferenceCandidateFor: snapshot.backendState === "ready" || snapshot.backendState === "degraded" ? ["code", "autonomous", "workspace"] : [],
  };
}
