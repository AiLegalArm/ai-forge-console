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

export interface TerminalOutputLine {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  text: string;
}

export interface TerminalCommand {
  id: string;
  command: string;
  cwd: string;
  state: "queued" | "running" | "completed" | "failed" | "approval_required";
  exitCode?: number;
  requiresApproval: boolean;
  linkedTaskId?: string;
  linkedChatSessionId?: string;
  failureReason?: string;
}

export interface TerminalSessionState {
  sessionId: string;
  workingDirectory: string;
  state: "ready" | "running" | "error";
  history: TerminalCommand[];
  output: TerminalOutputLine[];
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
