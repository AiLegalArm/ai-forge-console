import type { ChatType } from "@/types/chat";
import type { AuditorVerdict, FindingSeverity } from "@/types/audits";
import type { WorkflowTask, WorkflowApproval } from "@/types/workflow";
import type { GoNoGoStatus } from "@/types/release";

export type MemoryDomain =
  | "project"
  | "task"
  | "decision"
  | "provider"
  | "audit_release"
  | "chat_session";

export interface ProjectMemory {
  activeProjectId: string;
  projectName: string;
  projectPath?: string;
  repoStateSummary: string;
  discoveredInstructions: string[];
  commandRegistrySummary: {
    total: number;
    primary: number;
    generatedAtIso: string;
  };
  providerDefaults: {
    provider: "openrouter" | "ollama";
    model: string;
    deploymentMode: "local" | "cloud" | "hybrid";
  };
  localCloudPreference: "local" | "cloud" | "hybrid";
  knownConventions: string[];
  updatedAtIso: string;
}

export interface TaskMemoryEntry {
  taskId: string;
  taskTitle: string;
  status: WorkflowTask["status"];
  phase: WorkflowTask["phase"];
  outcomeSummary: string;
  blockerSummary: string[];
  approvals: Array<Pick<WorkflowApproval, "id" | "status" | "category" | "requestedAtIso">>;
  branchName?: string;
  linkedChatSessionId?: string;
  subtaskHistory: Array<{
    subtaskId: string;
    title: string;
    status: WorkflowTask["status"];
  }>;
  updatedAtIso: string;
}

export interface DecisionMemoryEntry {
  id: string;
  decisionType: "architecture" | "routing" | "provider_model" | "operator_override" | "release" | "audit_resolution";
  summary: string;
  rationale: string;
  linkedTaskId?: string;
  linkedChatSessionId?: string;
  linkedReleaseCandidateId?: string;
  createdAtIso: string;
}

export interface ProviderPreferenceMemory {
  preferredProvider: "openrouter" | "ollama";
  preferredModelByProvider: Record<"openrouter" | "ollama", string>;
  activeProviderContext: {
    provider: string;
    model: string;
    reason: string;
  };
  updatedAtIso: string;
}

export interface AuditReleaseMemory {
  findingsHistory: Array<{
    findingId: string;
    title: string;
    severity: FindingSeverity;
    status: "open" | "resolved" | "dismissed" | "acknowledged";
    taskId?: string;
    createdAtIso: string;
  }>;
  recurringBlockers: string[];
  resolvedFindings: string[];
  releaseDecisions: Array<{
    releaseCandidateId: string;
    status: GoNoGoStatus;
    summary: string;
    createdAtIso: string;
  }>;
  deployOutcomes: Array<{
    deploymentId: string;
    status: string;
    linkedTaskId?: string;
    createdAtIso: string;
  }>;
  incidents: string[];
  updatedAtIso: string;
}

export interface ChatSessionMemory {
  activeChatSessionId: string;
  activeChatType: ChatType;
  recentConversationSummaries: Array<{
    sessionId: string;
    summary: string;
    createdAtIso: string;
  }>;
  linkedTaskContext?: {
    taskId: string;
    title: string;
    status: WorkflowTask["status"];
  };
  linkedAgentContext?: {
    agentId?: string;
    role?: string;
  };
  activeProviderModelContext: {
    provider: string;
    model: string;
    backend: string;
  };
  recentProjectActions: string[];
  updatedAtIso: string;
}

export interface WorkspaceMemoryState {
  version: 1;
  project: ProjectMemory;
  tasks: TaskMemoryEntry[];
  decisions: DecisionMemoryEntry[];
  providerPreferences: ProviderPreferenceMemory;
  auditRelease: AuditReleaseMemory;
  chatSession: ChatSessionMemory;
}

export interface MemoryRetrieveRequest {
  projectId: string;
  taskId?: string;
  chatSessionId?: string;
  releaseCandidateId?: string;
  agentRole?: string;
  audience: "main_chat" | "agent" | "auditor" | "release";
}

export interface MemoryContextEnvelope {
  project: ProjectMemory;
  task?: TaskMemoryEntry;
  decisions: DecisionMemoryEntry[];
  provider: ProviderPreferenceMemory;
  auditRelease: Pick<AuditReleaseMemory, "recurringBlockers" | "resolvedFindings" | "releaseDecisions" | "incidents">;
  chat: ChatSessionMemory;
}

