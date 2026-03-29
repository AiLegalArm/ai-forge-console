import type { ChatMessage, ChatState, ChatType } from "@/types/chat";
import type { AuditorControlState } from "@/types/audits";
import type { WorkflowState, WorkflowTask, WorkflowApproval } from "@/types/workflow";
import type { AgentRole, LocalInferenceRuntimeState, ProviderBackend, RoutingMode } from "@/types/local-inference";
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
  source: "local" | "git" | "manual";
  localPath?: string;
  repositoryUrl?: string;
  repositoryName?: string;
  branch: string;
  status: "active" | "idle" | "disconnected";
}

export interface WorkspaceRepositoryState {
  connected: boolean;
  url?: string;
  name?: string;
  branch?: string;
}

export interface WorkspaceRuntimeState {
  currentProject: string;
  currentBranch: string;
  currentTask: string;
  activeProvider: string;
  activeModel: string;
  providerSource: "openrouter" | "ollama";
  activeBackend: ProviderBackend;
  deploymentMode: "local" | "cloud" | "hybrid";
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
}

export type ChatContextMap = Record<ChatType, ChatMessage[]>;

export interface WorkspaceChatViewModel {
  chatState: ChatState;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
}
