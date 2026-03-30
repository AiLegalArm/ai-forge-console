export type OllamaServiceState = "unknown" | "available" | "unavailable" | "starting" | "degraded" | "error";

export type ProviderBackend = "cloud" | "local" | "ollama" | "hybrid";
export type ModelProvider = "openrouter" | "ollama";

export type RoutingMode = "cloud_preferred" | "local_preferred" | "hybrid" | "local_only" | "sensitive_local_only";
export type AppRoutingModeProfile = "cheap_fast" | "balanced" | "quality_first" | "privacy_first" | "local_only";
export type RoutingPresetId =
  | "or_fast"
  | "or_balanced"
  | "or_deep"
  | "or_code_heavy"
  | "or_audit_strict"
  | "or_release_critical"
  | "ol_local_fast"
  | "ol_local_balanced"
  | "ol_local_private"
  | "ol_local_reviewer";

export type RoutingAgentId =
  | "planner"
  | "architect"
  | "frontend"
  | "backend"
  | "supabase"
  | "designer"
  | "browser"
  | "reviewer"
  | "deploy"
  | "domain"
  | "codeAuditor"
  | "securityAuditor"
  | "aiAuditor"
  | "promptAuditor"
  | "toolAuditor"
  | "gitAuditor"
  | "testAuditor"
  | "releaseAuditor";

export type PrivacyRoutingMode = "standard" | "sensitive" | "strict_local";

export type CostMode = "balanced" | "cost_aware" | "premium";

export type PerformanceMode = "balanced" | "latency_first" | "quality_first";

export type AgentRole =
  | "planner"
  | "architect"
  | "frontend"
  | "backend"
  | "worker"
  | "security_auditor"
  | "tool_auditor"
  | "git_auditor"
  | "test_auditor"
  | "release_auditor"
  | "prompt_auditor"
  | "code_auditor"
  | "ai_auditor"
  | "reviewer"
  | "orchestrator";

export type RoutingProfile =
  | "cheap_fast"
  | "balanced"
  | "deep_reasoning"
  | "code_heavy"
  | "audit_strict"
  | "release_critical"
  | "local_private";

export type TaskType =
  | "planning"
  | "architecture"
  | "frontend"
  | "backend"
  | "coding"
  | "review"
  | "audit"
  | "security"
  | "release";

export type ModelTier = "low" | "medium" | "high" | "premium";
export type ModelSpeedTier = "slow" | "balanced" | "fast";
export type ModelAvailability = "available" | "degraded" | "offline";

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
  lastModelRefreshIso: string | null;
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
  metadataCompleteness?: "runtime" | "placeholder";
  lastSeenIso?: string;
  status: "active" | "inactive";
}

export interface CloudProviderConfigState {
  provider: "openrouter";
  enabled: boolean;
  active: boolean;
  apiKeyConfigured: boolean;
  status: "connected" | "disconnected" | "degraded" | "error";
  baseUrl?: string;
  failureState?: string;
  lastHealthCheckIso: string | null;
}

export interface HybridModelRegistryEntry {
  id: string;
  provider: ModelProvider;
  providerModelId: string;
  displayName: string;
  costTier: ModelTier;
  qualityTier: ModelTier;
  speedTier: ModelSpeedTier;
  contextSuitability: ModelTier;
  codingSuitability: ModelTier;
  auditSuitability: ModelTier;
  reviewSuitability: ModelTier;
  structuredOutputSuitability: ModelTier;
  availability: ModelAvailability;
}

export interface RoutingInput {
  agentRole: AgentRole;
  taskType: TaskType;
  chatType?: "main" | "agent" | "audit" | "review";
  privacyMode: PrivacyRoutingMode;
  appModeProfile?: AppRoutingModeProfile;
  routingMode?: RoutingMode;
  preferredBackend?: ProviderBackend;
  preferredProvider?: ModelProvider;
  preferredModelId?: string;
  fallbackProvider?: ModelProvider;
  fallbackModelId?: string;
  openRouterAvailable?: boolean;
  ollamaAvailable?: boolean;
  localOnly?: boolean;
  releaseCritical?: boolean;
  auditorType?: "code" | "security" | "ai" | "prompt" | "tool" | "git" | "test" | "release";
  operatorOverride?: {
    provider?: ModelProvider;
    modelId?: string;
    allowFallback?: boolean;
  };
  fallbackRequired?: boolean;
  maxCostTier?: ModelTier;
  latencyPriority?: "low" | "medium" | "high";
}

export interface RoutingDecision {
  profile: RoutingProfile;
  selectedProvider: ModelProvider;
  selectedModelId: string | null;
  fallbackProvider: ModelProvider;
  fallbackModelId: string | null;
  usedFallback: boolean;
  deploymentTarget: "local" | "cloud";
  privacyAffected: boolean;
  costAffected: boolean;
  qualityAffected: boolean;
  overrideApplied: boolean;
  resolution: "resolved" | "error";
  errorCode?: "no_available_provider" | "no_available_model";
  reason: string;
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
  routingProfile?: RoutingProfile;
  preferredProvider?: ModelProvider;
  preferredModelId?: string;
  fallbackProvider?: ModelProvider;
  fallbackModelId?: string;
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
  appModeProfile: AppRoutingModeProfile;
  conversationOverrides: Record<string, RoutingMode>;
  agentAssignments: AgentBackendAssignment[];
  rules: RoutingRule[];
  presets: Record<RoutingPresetId, {
    provider: "openrouter" | "ollama";
    backend: ProviderBackend;
    profile: string;
    purpose: readonly string[];
  }>;
  agentRoutingDefaults: Record<RoutingAgentId, {
    primary?: RoutingPresetId;
    fallback?: RoutingPresetId;
    firstPass?: RoutingPresetId;
    finalPass?: RoutingPresetId;
  }>;
  appRoutingModes: Record<AppRoutingModeProfile, {
    planner: RoutingPresetId;
    workers: readonly RoutingPresetId[];
    reviewer: RoutingPresetId;
    auditorsFirstPass: readonly RoutingPresetId[];
    auditorsFinalPass: readonly RoutingPresetId[];
    release: RoutingPresetId;
    cloudAllowed: boolean;
  }>;
  runtimeDecisionsBySurface?: Record<string, RoutingDecision>;
}

export interface LocalInferenceRuntimeState {
  cloud: CloudProviderConfigState;
  ollama: OllamaConnectionState;
  hybridModelRegistry: HybridModelRegistryEntry[];
  modelRegistry: LocalModelRegistryEntry[];
  routing: BackendRoutingState;
  resources: LocalResourceState;
  scenarioLog: string[];
}
