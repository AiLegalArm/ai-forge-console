import type { ApprovalCategory } from "@/types/workflow";
import type { ProjectCommandSafety } from "@/types/project-commands";

export type ExecutionPolicyActionType =
  | "safe_command_execution"
  | "risky_command_execution"
  | "git_push"
  | "branch_creation"
  | "release_approval"
  | "deploy_action"
  | "domain_assignment"
  | "provider_model_switch"
  | "local_only_execution"
  | "cloud_execution"
  | "audit_triggered_action"
  | "agent_triggered_command_execution";

export type ExecutionPolicySubjectType = "user" | "agent" | "auditor" | "orchestrator";
export type ExecutionPolicyTargetType = "command" | "provider" | "task" | "repo" | "release_action";

export type ExecutionPolicyOutcome = "allow" | "allow_with_confirmation" | "require_approval" | "deny" | "deny_with_explanation";

export interface ExecutionPolicyScope {
  scopeType: "workspace" | "project" | "task" | "release";
  scopeId: string;
  label?: string;
}

export interface ExecutionPolicyApprovalRequirement {
  required: boolean;
  approvalCategory?: ApprovalCategory;
  reason?: string;
}

export interface ExecutionPolicySubject {
  type: ExecutionPolicySubjectType;
  id?: string;
  label?: string;
}

export interface ExecutionPolicyTarget {
  type: ExecutionPolicyTargetType;
  id?: string;
  label?: string;
}

export interface ExecutionPolicyAction {
  actionType: ExecutionPolicyActionType;
  subject: ExecutionPolicySubject;
  target: ExecutionPolicyTarget;
  commandSafetyLevel?: ProjectCommandSafety;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface ExecutionPolicyContext {
  activeProjectId: string;
  activeProjectName: string;
  activeTaskId?: string;
  activeTaskStatus?: string;
  providerSource: "openrouter" | "ollama";
  activeModel: string;
  deploymentMode: "local" | "cloud" | "hybrid";
  localCloudMode: "local" | "cloud" | "hybrid";
  hasAuditBlockers: boolean;
  hasCriticalAuditBlockers: boolean;
  releaseState: "go" | "blocked" | "warning";
  commandSafetyLevel: ProjectCommandSafety;
  repoConnected: boolean;
  repoClean: boolean;
}

export interface ExecutionPolicyDecision {
  action: ExecutionPolicyAction;
  outcome: ExecutionPolicyOutcome;
  isAllowed: boolean;
  requiresApproval: boolean;
  blocked: boolean;
  rationale: string;
  scope: ExecutionPolicyScope;
  linkedApprovalRequirement?: ExecutionPolicyApprovalRequirement;
  evaluatedAtIso: string;
  policyId: string;
}

export interface ExecutionPolicyState {
  lastDecision?: ExecutionPolicyDecision;
  recentDecisions: ExecutionPolicyDecision[];
}
