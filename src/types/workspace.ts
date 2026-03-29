import type { ChatMessage, ChatState, ChatType } from "@/types/chat";

export type PrivacyMode = "private" | "team";
export type SyncStatus = "synced" | "syncing" | "offline";

export interface AgentRuntimeState {
  id: string;
  name: string;
  status: "running" | "idle";
  task: string;
  provider: string;
  model: string;
}

export interface WorkspaceRuntimeState {
  currentProject: string;
  currentBranch: string;
  currentTask: string;
  activeProvider: string;
  activeBackend: string;
  privacyMode: PrivacyMode;
  syncStatus: SyncStatus;
  activeAgents: AgentRuntimeState[];
  currentConversationType: ChatType;
  currentChatSessionId: string;
}

export type ChatContextMap = Record<ChatType, ChatMessage[]>;

export interface WorkspaceChatViewModel {
  chatState: ChatState;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
}
