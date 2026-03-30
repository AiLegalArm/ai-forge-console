import type { AuditGateDecision, AuditorType, AuditorVerdict } from "@/types/audits";
import type { RuntimeProviderBackend, SyncStatus } from "@/types/contracts";

export type ActivitySeverity = "info" | "warning" | "critical";

export type AgentActivityEventType =
  | "task_received"
  | "subtask_created"
  | "delegation_proposed"
  | "delegation_assigned"
  | "delegation_accepted"
  | "delegation_blocked"
  | "delegation_rejected"
  | "subtask_state_changed"
  | "subtask_completed"
  | "result_aggregated"
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
  | "design_session_started"
  | "design_finding_logged"
  | "browser_scenario_started"
  | "browser_step_passed"
  | "browser_step_failed"
  | "evidence_attached"
  | "review_triggered"
  | "deploy_triggered"
  | "command_proposed"
  | "command_execution_requested"
  | "command_executed"
  | "command_blocked";

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
  backend?: RuntimeProviderBackend;
  severity?: ActivitySeverity;
  importance?: 1 | 2 | 3 | 4 | 5;
  createdAtIso: string;
}

export type ApprovalCategory =
  | "git_push"
  | "push_approval"
  | "auto_push_enablement"
  | "deploy"
  | "production_deploy_approval"
  | "domain_assignment"
  | "domain_assignment_approval"
  | "release_go_no_go"
  | "release_approval"
  | "destructive_file_operations"
  | "sensitive_provider_usage"
  | "agent_command_execution";

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
  linkedAgentCommandRequestId?: string;
}


export type AgentCommandOrigin =
  | "user_triggered_command"
  | "agent_suggested_command"
  | "agent_approved_to_run_command"
  | "blocked_command_request";

export type AgentCommandSafetyLevel = "safe" | "caution" | "risky";
export type AgentCommandApprovalRequirement = "not_required" | "required" | "policy_blocked";
export type AgentCommandExecutionState =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "executed"
  | "rejected"
  | "blocked"
  | "expired"
  | "abandoned";
export type AgentCommandResultState = "none" | "success" | "failed" | "blocked" | "rejected" | "expired" | "abandoned";

export interface AgentCommandRequest {
  id: string;
  origin: AgentCommandOrigin;
  linkedAgentId: string;
  linkedTaskId: string;
  linkedChatId: string;
  commandId: string;
  rawCommand: string;
  commandSource: string;
  reason: string;
  intent: string;
  safetyLevel: AgentCommandSafetyLevel;
  approvalRequirement: AgentCommandApprovalRequirement;
  executionState: AgentCommandExecutionState;
  resultState: AgentCommandResultState;
  linkedApprovalId?: string;
  linkedTerminalCommandId?: string;
  requestedAtIso: string;
  updatedAtIso: string;
  executedAtIso?: string;
}

export type GitHubConnectionState = SyncStatus;

export type TaskBranchLifecycle =
  | "no_branch"
  | "branch_planned"
  | "branch_created"
  | "local_changes"
  | "committed"
  | "pushed"
  | "review_opened"
  | "merged"
  | "rejected";

export type GitHubSyncMode = "manual" | "auto_commit" | "auto_push";
export type TaskReviewMode = "chat_review" | "pull_request" | "hybrid";

export type CommitStatus = "idle" | "drafted" | "committed" | "failed";
export type PushStatus = "idle" | "approval_required" | "ready" | "pushed" | "blocked" | "failed";

export interface StagedChangesSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
  notablePaths: string[];
  hasUncommittedChanges: boolean;
}

export interface CommitEntry {
  sha: string;
  title: string;
  createdAtIso: string;
  author: string;
  taskId?: string;
}

export interface CommitWorkflowState {
  stagedChanges: StagedChangesSummary;
  draftMessage: string;
  status: CommitStatus;
  latestCommit?: CommitEntry;
  pendingError?: string;
}

export interface PushWorkflowState {
  status: PushStatus;
  requiresApproval: boolean;
  linkedApprovalId?: string;
  lastPushedAtIso?: string;
  behindRemoteByCommits?: number;
  pendingError?: string;
}

export interface RepoBranchState {
  localBranchName: string;
  remoteBranchName?: string;
  trackingStatus: "not_tracking" | "tracking" | "ahead" | "behind" | "diverged";
  aheadBy: number;
  behindBy: number;
}

export interface PullRequestReviewFinding {
  id: string;
  source: "security" | "qa" | "release" | "human";
  severity: "info" | "warning" | "critical";
  title: string;
  status: "open" | "resolved";
}

export interface PullRequestState {
  id: string;
  number?: number;
  title: string;
  status: "draft_review" | "ready_for_review" | "changes_requested" | "approved" | "merged" | "closed";
  reviewChatSessionId?: string;
  linkedAuditorIds: string[];
  findings: PullRequestReviewFinding[];
  mergeReadiness: "not_ready" | "ready" | "blocked";
  releaseGateReadiness: "not_ready" | "ready" | "blocked";
  auditGate?: AuditGateDecision;
}

export interface TaskGitHubState {
  repositoryId: string;
  repoKey: string;
  syncMode: GitHubSyncMode;
  reviewMode: TaskReviewMode;
  branchLifecycle: TaskBranchLifecycle;
  branch?: RepoBranchState;
  commitSummary: string;
  commitHistory: CommitEntry[];
  commitWorkflow: CommitWorkflowState;
  pushWorkflow: PushWorkflowState;
  pullRequest?: PullRequestState;
}

export interface GitHubRepositoryConnection {
  id: string;
  provider: "github";
  owner: string;
  name: string;
  remoteUrl: string;
  defaultBranch: string;
  state: GitHubConnectionState;
  lastSyncAtIso?: string;
  lastError?: string;
}

export interface GitHubSyncState {
  activeRepositoryId?: string;
  repositories: GitHubRepositoryConnection[];
  globalSyncModeDefault: GitHubSyncMode;
}

export type TaskStatus =
  | "proposed"
  | "assigned"
  | "accepted"
  | "queued"
  | "in_progress"
  | "blocked"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPhase = "planning" | "implementation" | "audit" | "review" | "release";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface WorkflowTask {
  id: string;
  title: string;
  status: TaskStatus;
  parentTaskId?: string;
  childSubtaskIds?: string[];
  ownerAgentId?: string;
  delegatedOwnerAgentId?: string;
  dependencyTaskIds: string[];
  linkedChatSessionId: string;
  linkedExecutionContextId?: string;
  linkedAuditId?: string;
  linkedAuditorTypes?: AuditorType[];
  linkedReviewId?: string;
  linkedReleaseCandidateId?: string;
  linkedEvidenceIds?: string[];
  branchName?: string;
  phase: TaskPhase;
  progressSummary: string;
  auditVerdict?: AuditorVerdict;
  auditFindingCount?: number;
  designBrowserBlockers?: number;
  completionRate?: number;
  aggregatedSubtaskIds?: string[];
  blockedByTaskIds?: string[];
  failureReason?: string;
  updatedAtIso: string;
  github?: TaskGitHubState;
}

export interface WorkflowSubtask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  assignedAgentId: string;
  status: TaskStatus;
  dependencies: string[];
  priority: TaskPriority;
  linkedChatContext: {
    chatSessionId: string;
    chatType: "main" | "agent" | "audit" | "review";
  };
  linkedExecutionContext: {
    executionContextId: string;
    source: "planner" | "orchestrator" | "agent_handoff" | "audit";
  };
  resultSummary?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export type DelegationState =
  | "proposed"
  | "assigned"
  | "accepted"
  | "queued"
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export interface WorkflowDelegation {
  id: string;
  parentTaskId: string;
  subtaskId: string;
  fromAgentId: string;
  toAgentId: string;
  state: DelegationState;
  delegationReason: string;
  delegatedAtIso: string;
  respondedAtIso?: string;
  assignmentMetadata: {
    requestedPriority: TaskPriority;
    requestedByRole: "orchestrator" | "planner" | "auditor";
    capabilityTags: string[];
    expectedOutcome: string;
    blockedReason?: string;
  };
  acceptanceNote?: string;
  rejectionReason?: string;
  linkedDependencyTaskIds: string[];
}

export interface WorkflowTaskGraph {
  parentTaskId: string;
  childSubtaskIds: string[];
  dependencyChains: Array<{
    fromTaskId: string;
    toTaskId: string;
  }>;
  delegatedOwnership: Record<string, string>;
  completionAggregation: {
    completedSubtasks: number;
    totalSubtasks: number;
    completionRate: number;
  };
  failurePropagation: {
    failedSubtaskIds: string[];
    propagatedToParentTask: boolean;
  };
  blockedPropagation: {
    blockedSubtaskIds: string[];
    propagatedToParentTask: boolean;
  };
}

export interface WorkflowState {
  tasks: WorkflowTask[];
  subtasks: WorkflowSubtask[];
  delegations: WorkflowDelegation[];
  taskGraphs: WorkflowTaskGraph[];
  activityEvents: AgentActivityEvent[];
  approvals: WorkflowApproval[];
  agentCommandRequests: AgentCommandRequest[];
  github: GitHubSyncState;
}
