import type { ProjectCommandCategory, ProjectCommandSource } from "@/types/project-commands";

export type HealthState = "healthy" | "degraded" | "down" | "unknown";

export type DesktopShellMode = "desktop" | "browser";
export type ExecutionMode = "local_first" | "hybrid" | "cloud_assisted";

export type LocalCapability =
  | "terminal_execution"
  | "file_modification"
  | "git_actions"
  | "provider_usage"
  | "ollama_usage"
  | "deploy_triggers";

export type ApprovalRisk = "low" | "medium" | "high" | "critical";

export interface CapabilityGate {
  capability: LocalCapability;
  enabled: boolean;
  requiresApproval: boolean;
  risk: ApprovalRisk;
  policyReason: string;
  linkedApprovalId?: string;
}

export interface LocalProjectContext {
  workspaceName: string;
  workspacePath: string;
  activeProjectRoot: string;
  projectInstructionsDetected: boolean;
  instructionSources: string[];
  commandRegistryLoaded: boolean;
  commandRegistryUpdatedAtIso?: string;
  gitBranch: string;
  hasLocalChanges: boolean;
  runtimeResourcesAvailable: boolean;
}

export interface RuntimeReadiness {
  localRuntime: HealthState;
  agentRuntime: HealthState;
  previewRuntime: HealthState;
  backendServices: HealthState;
  providers: HealthState;
  modelBackend: HealthState;
  releaseReadiness: "ready" | "blocked";
  releaseBlockReason?: string;
}

export type TerminalExecutionClassification = "safe_read_only" | "modifying" | "risky";
export type TerminalApprovalState = "not_required" | "required" | "pending" | "approved" | "denied";
export type TerminalExecutionFailureReason =
  | "none"
  | "invalid_working_directory"
  | "command_not_found"
  | "execution_failure"
  | "timeout"
  | "approval_denied"
  | "interrupted"
  | "runtime_unavailable";

export interface TerminalOutputLine {
  id: string;
  timestampIso: string;
  stream: "stdout" | "stderr" | "system";
  text: string;
  sessionId: string;
  commandId?: string;
}

export interface TerminalCommand {
  id: string;
  command: string;
  rawCommand: string;
  cwd: string;
  state: "queued" | "running" | "completed" | "failed" | "approval_required";
  exitCode?: number;
  requiresApproval: boolean;
  source?: ProjectCommandSource | "manual" | "git_workflow";
  sourceCommandId?: string;
  sourceCategory?: ProjectCommandCategory;
  linkedProjectId?: string;
  launchedAtIso?: string;
  linkedTaskId?: string;
  linkedChatSessionId?: string;
  failureReason?: TerminalExecutionFailureReason;
  failureDetail?: string;
  classification: TerminalExecutionClassification;
  approvalState: TerminalApprovalState;
  createdAtIso: string;
  startedAtIso?: string;
  completedAtIso?: string;
  updatedAtIso: string;
}

export type TerminalCommandHistoryEntry = TerminalCommand;
export type TerminalSessionExecutionState = "idle" | "queued" | "running" | "waiting_for_approval" | "failed";

export interface TerminalSession {
  id: string;
  linkedTaskId?: string;
  linkedChatSessionId?: string;
  workingDirectory: string;
  currentCommandId?: string;
  executionState: TerminalSessionExecutionState;
  failureState: TerminalExecutionFailureReason;
  commandHistory: TerminalCommandHistoryEntry[];
  outputLog: TerminalOutputLine[];
  createdAtIso: string;
  updatedAtIso: string;
}

export interface TerminalSessionState {
  sessionId: string;
  selectedSessionId: string;
  workingDirectory: string;
  state: "ready" | "running" | "error";
  history: TerminalCommand[];
  output: TerminalOutputLine[];
  sessions: TerminalSession[];
}

export interface LocalProviderState {
  providerId: string;
  type: "local" | "cloud";
  status: HealthState;
  endpoint: string;
}

export interface LocalShellSecurityState {
  safeDefaultsEnabled: boolean;
  providerSeparationEnabled: boolean;
  localCloudAwareness: boolean;
  privacyMode: "strict_local" | "balanced";
  autoRunRiskyActions: false;
}

export interface LocalShellWorkspaceState {
  desktopShellMode: DesktopShellMode;
  executionMode: ExecutionMode;
  runtime: RuntimeReadiness;
  project: LocalProjectContext;
  terminal: TerminalSessionState;
  providers: LocalProviderState[];
  capabilities: CapabilityGate[];
  security: LocalShellSecurityState;
}
