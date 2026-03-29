import type { ChatMessage, ChatState, ChatType } from "@/types/chat";
import type { AuditorControlState } from "@/types/audits";
import type { WorkflowState, WorkflowTask, WorkflowApproval } from "@/types/workflow";
import type { AgentRole, AppRoutingModeProfile, LocalInferenceRuntimeState, ProviderBackend, RoutingMode } from "@/types/local-inference";
import type { OpenRouterExecutionState } from "@/lib/openrouter-provider-service";
import type { BrowserSession, DesignSession } from "@/types/agents";
import type { SyncStatus } from "@/types/contracts";
import type { EvidenceFlowState } from "@/types/evidence";
import type { LocalShellWorkspaceState } from "@/types/local-shell";
import type { GoNoGoStatus, ReleaseControlState } from "@/types/release";
import type { AuditorVerdict } from "@/types/audits";

export type PrivacyMode = "private" | "team";
export interface AgentRuntimeState {
  id: string;
  name: string;
  role?: AgentRole;
  status: "running" | "idle";
  task: string;
  provider: string;
  model: string;
  backend?: ProviderBackend;
  routingMode?: RoutingMode;
}

export interface WorkspaceProjectEntry {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  source: "local" | "git" | "manual";
  localPath?: string;
  projectRoot?: string;
  branch: string;
  status: "active" | "idle" | "disconnected";
  repository?: {
    connected: boolean;
    name?: string;
    url?: string;
    branch?: string;
    syncStatus?: "idle" | "syncing" | "up_to_date" | "behind";
  };
  provider?: {
    connected: boolean;
    source?: "openrouter" | "ollama";
  };
}

export interface WorkspaceRepositoryState {
  connected: boolean;
  url?: string;
  name?: string;
  branch?: string;
  syncStatus?: "idle" | "syncing" | "up_to_date" | "behind";
  connectionState?: "connected" | "disconnected";
}

export interface WorkspaceRuntimeState {
  currentProject: string;
  currentBranch: string;
  currentTask: string;
  activeProvider: string;
  activeModel: string;
  lastUsedModel: string;
  availableModels: Array<{ id: string; displayName: string }>;
  providerSource: "openrouter" | "ollama";
  activeBackend: ProviderBackend;
  deploymentMode: "local" | "cloud" | "hybrid";
  routingProfile: AppRoutingModeProfile;
  routingMode: RoutingMode;
  privacyMode: PrivacyMode;
  syncStatus: SyncStatus;
  activeAgents: AgentRuntimeState[];
  currentConversationType: ChatType;
  currentChatSessionId: string;
  currentPhase: WorkflowTask["phase"];
  currentTaskStatus: WorkflowTask["status"];
  activeAgentId?: string;
  currentReviewId?: string;
  currentReleaseCandidateId?: string;
  auditGateVerdict?: AuditorVerdict;
  releaseReadinessStatus: GoNoGoStatus;
  pendingApprovals: WorkflowApproval[];
  workflow: WorkflowState;
  auditors: AuditorControlState;
  designSession: DesignSession;
  browserSession: BrowserSession;
  evidenceFlow: EvidenceFlowState;
  releaseControl: ReleaseControlState;
  localInference: LocalInferenceRuntimeState;
  localShell: LocalShellWorkspaceState;
  projects: WorkspaceProjectEntry[];
  activeProjectId: string;
  repository: WorkspaceRepositoryState;
  providerExecutionState: OpenRouterExecutionState;
}

export type ChatContextMap = Record<ChatType, ChatMessage[]>;

export interface WorkspaceChatViewModel {
  chatState: ChatState;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
}
