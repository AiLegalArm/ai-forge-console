import type { ChatMessage, ChatState, ChatType } from "@/types/chat";
import type { AuditorControlState } from "@/types/audits";
import type { WorkflowState, WorkflowTask, WorkflowApproval } from "@/types/workflow";
import type { AgentRole, LocalInferenceRuntimeState, ProviderBackend, RoutingMode } from "@/types/local-inference";
import type { BrowserSession, DesignSession } from "@/types/agents";
import type { EvidenceFlowState } from "@/types/evidence";
import type { LocalShellWorkspaceState } from "@/types/local-shell";

export type PrivacyMode = "private" | "team";
export type SyncStatus = "disconnected" | "connected" | "syncing" | "dirty" | "up_to_date" | "conflict" | "blocked" | "error";

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

export interface WorkspaceRuntimeState {
  currentProject: string;
  currentBranch: string;
  currentTask: string;
  activeProvider: string;
  activeBackend: ProviderBackend;
  privacyMode: PrivacyMode;
  syncStatus: SyncStatus;
  activeAgents: AgentRuntimeState[];
  currentConversationType: ChatType;
  currentChatSessionId: string;
  currentPhase: WorkflowTask["phase"];
  currentTaskStatus: WorkflowTask["status"];
  pendingApprovals: WorkflowApproval[];
  workflow: WorkflowState;
  auditors: AuditorControlState;
  designSession: DesignSession;
  browserSession: BrowserSession;
  evidenceFlow: EvidenceFlowState;
  localInference: LocalInferenceRuntimeState;
  localShell: LocalShellWorkspaceState;
}

export type ChatContextMap = Record<ChatType, ChatMessage[]>;

export interface WorkspaceChatViewModel {
  chatState: ChatState;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
}
