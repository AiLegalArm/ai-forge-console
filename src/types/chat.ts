export type ChatType = "main" | "agent" | "audit" | "review";

export type MessageRole = "user" | "orchestrator" | "agent" | "auditor" | "reviewer" | "system";

export type MessageStatus = "pending" | "streaming" | "completed" | "failed" | "needs_approval";

export interface ChatAttachment {
  id: string;
  name: string;
  kind: "file" | "diff" | "log" | "artifact";
  mimeType?: string;
  uploadState: "placeholder" | "uploaded" | "failed";
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  status: "requested" | "approved" | "rejected";
  requestedBy: string;
  requestedAtIso: string;
}

export interface ChatLinkedContext {
  taskId?: string;
  taskTitle?: string;
  agentId?: string;
  agentName?: string;
  auditFindingId?: string;
  auditFindingTitle?: string;
}

export interface ChatProviderMetadata {
  provider: string;
  model: string;
  backend: "local" | "cloud" | "ollama" | "hybrid";
  routingKey?: string;
  runtimeRegion?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  authorLabel?: string;
  content: string;
  createdAtIso: string;
  status: MessageStatus;
  attachments?: ChatAttachment[];
  approval?: ApprovalRequest;
  linked?: ChatLinkedContext;
  providerMeta?: ChatProviderMetadata;
}

export interface ChatSession {
  id: string;
  type: ChatType;
  title: string;
  isActive: boolean;
  providerMeta: ChatProviderMetadata;
  linked: ChatLinkedContext;
  lastMessageAtIso: string;
  unreadCount: number;
}

export interface ChatState {
  activeChatType: ChatType;
  sessions: ChatSession[];
  messagesBySessionId: Record<string, ChatMessage[]>;
  selectedSessionIdByType: Record<ChatType, string>;
  draftInputBySessionId: Record<string, string>;
  approvalRequestBySessionId: Record<string, ApprovalRequest | null>;
  attachmentPlaceholdersBySessionId: Record<string, ChatAttachment[]>;
  relatedContextBySessionId: Record<string, ChatLinkedContext>;
}
