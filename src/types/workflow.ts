export type ActivitySeverity = "info" | "warning" | "critical";

export type AgentActivityEventType =
  | "task_received"
  | "planning_started"
  | "planning_completed"
  | "agent_assigned"
  | "execution_started"
  | "execution_update"
  | "waiting_for_approval"
  | "blocked"
  | "completed"
  | "failed"
  | "audit_triggered"
  | "review_triggered"
  | "deploy_triggered";

export interface AgentActivityEvent {
  id: string;
  type: AgentActivityEventType;
  title: string;
  details?: string;
  taskId?: string;
  chatId?: string;
  auditId?: string;
  agentId?: string;
  agentRole?: string;
  provider?: string;
  backend?: "local" | "cloud" | "ollama" | "hybrid";
  severity?: ActivitySeverity;
  importance?: 1 | 2 | 3 | 4 | 5;
  createdAtIso: string;
}

export type ApprovalCategory =
  | "git_push"
  | "auto_push_enablement"
  | "deploy"
  | "domain_assignment"
  | "destructive_file_operations"
  | "sensitive_provider_usage"
  | "release_go_no_go";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "dismissed";

export interface WorkflowApproval {
  id: string;
  category: ApprovalCategory;
  title: string;
  reason: string;
  status: ApprovalStatus;
  taskId?: string;
  chatId?: string;
  agentId?: string;
  requestedBy: string;
  requestedAtIso: string;
  expiresAtIso?: string;
}

export type TaskStatus = "queued" | "in_progress" | "blocked" | "awaiting_approval" | "completed" | "failed";

export type TaskPhase = "planning" | "implementation" | "audit" | "review" | "release";

export interface WorkflowTask {
  id: string;
  title: string;
  status: TaskStatus;
  ownerAgentId?: string;
  dependencyTaskIds: string[];
  linkedChatSessionId: string;
  linkedAuditId?: string;
  linkedReviewId?: string;
  branchName?: string;
  phase: TaskPhase;
  progressSummary: string;
  updatedAtIso: string;
}

export interface WorkflowState {
  tasks: WorkflowTask[];
  activityEvents: AgentActivityEvent[];
  approvals: WorkflowApproval[];
}
