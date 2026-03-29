export type OllamaServiceState = "unknown" | "available" | "unavailable" | "starting" | "degraded" | "error";

export type ProviderBackend = "cloud" | "local" | "ollama" | "hybrid";

export type RoutingMode = "cloud_preferred" | "local_preferred" | "hybrid" | "local_only" | "sensitive_local_only";

export type PrivacyRoutingMode = "standard" | "sensitive" | "strict_local";

export type CostMode = "balanced" | "cost_aware" | "premium";

export type PerformanceMode = "balanced" | "latency_first" | "quality_first";

export type AgentRole =
  | "planner"
  | "worker"
  | "prompt_auditor"
  | "code_auditor"
  | "ai_auditor"
  | "reviewer"
  | "orchestrator";

export type ModelWeightClass = "tiny" | "small" | "medium" | "large" | "xlarge";

export type ModelPurposeTag =
  | "general"
  | "planning"
  | "coding"
  | "review"
  | "audit"
  | "reasoning"
  | "privacy"
  | "fast_pass";

export type ModelCapabilityTag =
  | "planning"
  | "coding"
  | "reviewing"
  | "auditing"
  | "prompt_analysis"
  | "tool_reasoning"
  | "structured_output"
  | "long_context"
  | "lightweight_fast_pass"
  | "privacy_sensitive_local_use";

export interface OllamaConnectionState {
  serviceState: OllamaServiceState;
  runtimeAvailable: boolean;
  connectionHealthy: boolean;
  lastHealthCheckIso: string | null;
  selectedModelId: string | null;
  failureState?: string;
  offlineReason?: string;
}

export interface LocalModelRegistryEntry {
  id: string;
  name: string;
  displayName: string;
  weightClass: ModelWeightClass;
  estimatedSizeGb: number;
  localAvailability: "available" | "pulling" | "missing";
  purposeTags: ModelPurposeTag[];
  capabilityTags: ModelCapabilityTag[];
  recommendedAgentRoles: AgentRole[];
  latencyMsP50?: number;
  tokensPerSecond?: number;
  memoryCostGb?: number;
  status: "active" | "inactive";
}

export interface RoutingRule {
  id: string;
  scope: "global" | "conversation" | "agent" | "task";
  scopeRefId: string;
  preferredBackend: ProviderBackend;
  fallbackBackend: ProviderBackend;
  privacyMode: PrivacyRoutingMode;
  costMode: CostMode;
  performanceMode: PerformanceMode;
  allowedBackends: ProviderBackend[];
}

export interface AgentBackendAssignment {
  agentId: string;
  agentRole: AgentRole;
  routingMode: RoutingMode;
  preferredBackend: ProviderBackend;
  fallbackBackend: ProviderBackend;
  assignedModelId?: string;
  allowUserOverride: boolean;
}

export interface LocalResourceState {
  maxConcurrentJobs: number;
  activeJobs: number;
  queuedJobs: number;
  queue: Array<{ id: string; taskLabel: string; agentRole: AgentRole; status: "queued" | "running" }>;
  resourcePressure: "low" | "medium" | "high";
  degradedMode: boolean;
  autoFallbackReady: boolean;
}

export interface BackendRoutingState {
  activeMode: RoutingMode;
  conversationOverrides: Record<string, RoutingMode>;
  agentAssignments: AgentBackendAssignment[];
  rules: RoutingRule[];
}

export interface LocalInferenceRuntimeState {
  ollama: OllamaConnectionState;
  modelRegistry: LocalModelRegistryEntry[];
  routing: BackendRoutingState;
  resources: LocalResourceState;
  scenarioLog: string[];
}
