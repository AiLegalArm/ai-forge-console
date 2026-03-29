import type { ChatMessage, ChatTab } from "@/data/mock-chat";

export type PrivacyMode = "private" | "team";
export type SyncStatus = "synced" | "syncing" | "offline";

export interface AgentRuntimeState {
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
  currentConversationType: ChatTab;
}

export type ChatContextMap = Record<ChatTab, ChatMessage[]>;
