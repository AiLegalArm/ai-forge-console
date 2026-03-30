import type { AuditBlockerCondition, AuditorVerdict, AuditorType } from "@/types/audits";
import type { WorkflowApproval, TaskStatus, GitHubConnectionState } from "@/types/workflow";

export type DeploymentEnvironment = "preview" | "staging" | "production";
export type DeploymentTargetType = "preview" | "production";
export type DeploymentSource = "manual" | "github_action" | "release_workflow" | "rollback";

export type DeploymentStatus =
  | "queued"
  | "building"
  | "preview_ready"
  | "failed"
  | "production_ready"
  | "deployed"
  | "rolled_back"
  | "blocked";

export interface DeploymentRecord {
  id: string;
  environment: DeploymentEnvironment;
  targetType: DeploymentTargetType;
  status: DeploymentStatus;
  source: DeploymentSource;
  previewTarget?: string;
  productionTarget?: string;
  linkedTaskId?: string;
  linkedBranch?: string;
  linkedReviewId?: string;
  linkedReleaseCandidateId?: string;
  rollbackAvailable: boolean;
  createdAtIso: string;
  updatedAtIso: string;
  deployedAtIso?: string;
  rolledBackAtIso?: string;
  blockedReason?: string;
}

export type DomainType = "root" | "subdomain" | "wildcard";
export type DomainVerificationState = "unconfigured" | "pending_verification" | "verified" | "blocked" | "error";
export type DomainDnsState = "unconfigured" | "dns_incomplete" | "verified" | "error";
export type DomainAssignmentState = "unconfigured" | "assigned" | "blocked" | "error";

export interface DomainRecord {
  id: string;
  name: string;
  type: DomainType;
  verificationState: DomainVerificationState;
  dnsState: DomainDnsState;
  targetEnvironment: DeploymentEnvironment;
  productionAssignment?: string;
  previewAssignment?: string;
  assignmentState: DomainAssignmentState;
  relatedDeployId?: string;
  warnings: string[];
  errors: string[];
  createdAtIso: string;
  updatedAtIso: string;
}

export type ReviewState = "not_opened" | "in_review" | "changes_requested" | "approved" | "blocked";
export type ReleaseReadiness = "ready" | "warning" | "blocked";
export type GoNoGoStatus = "ready" | "warning" | "blocked" | "go" | "no_go";

export interface ReleaseCandidate {
  id: string;
  label: string;
  linkedBranch: string;
  linkedTaskId?: string;
  linkedReviewId?: string;
  linkedDeploymentId?: string;
  linkedDomainIds: string[];
  linkedAuditorTypes: AuditorType[];
  linkedEvidenceIds: string[];
  linkedApprovalIds: string[];
  reviewState: ReviewState;
  deploymentState: DeploymentStatus;
  domainState: DomainAssignmentState | DomainDnsState | DomainVerificationState;
  auditVerdict: AuditorVerdict;
  finalReadiness: ReleaseReadiness;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface GoNoGoInputs {
  auditors: AuditorVerdict[];
  releaseAuditorVerdict: AuditorVerdict;
  reviewState: ReviewState;
  taskStatuses: TaskStatus[];
  subtaskStatuses: TaskStatus[];
  auditBlockers: AuditBlockerCondition[];
  agentOutcomeSignals: Array<{ source: string; status: "ready" | "warning" | "blocked"; detail: string }>;
  githubSyncStatus: GitHubConnectionState;
  browserEvidenceResolved: boolean;
  designEvidenceResolved: boolean;
  deploymentReadiness: ReleaseReadiness;
  domainReadiness: ReleaseReadiness;
  approvals: WorkflowApproval[];
}

export interface GoNoGoDecision {
  status: GoNoGoStatus;
  readiness: ReleaseReadiness;
  blockers: string[];
  warnings: string[];
  approvalsPending: WorkflowApproval["category"][];
  goSignals: string[];
  noGoSignals: string[];
  summary: string;
}

export interface ReleaseBlockerSummary {
  total: number;
  critical: number;
  high: number;
  mediumOrLower: number;
  unresolved: string[];
}

export interface ReleaseApprovalStatus {
  id: string;
  title: string;
  category: WorkflowApproval["category"];
  status: WorkflowApproval["status"];
  requestedBy: string;
  requestedAtIso: string;
  linkedTaskId?: string;
}

export interface ReleaseApprovalSummary {
  required: ReleaseApprovalStatus[];
  completed: ReleaseApprovalStatus[];
  missing: ReleaseApprovalStatus[];
}

export interface ReleaseAuditSummary {
  verdict: AuditorVerdict;
  linkedAuditorTypes: AuditorType[];
  unresolvedBlockers: AuditBlockerCondition[];
  gateStates: Array<{ auditorType: AuditorType; verdict: AuditorVerdict }>;
}

export interface ReleaseReadinessSnapshot {
  review: ReleaseReadiness;
  deploy: ReleaseReadiness;
  domain: ReleaseReadiness;
  rollback: ReleaseReadiness;
}

export interface ReleaseDeployReadiness {
  previewStatus: DeploymentStatus | "missing";
  productionStatus: DeploymentStatus | "missing";
  rolloutState: "not_started" | "in_progress" | "blocked" | "ready";
  dependencyState: "healthy" | "degraded" | "blocked";
  blockers: string[];
}

export interface ReleaseRollbackReadiness {
  rollbackAvailable: boolean;
  rollbackTarget?: string;
  recommendedAction: "safe_to_promote" | "fallback_plan_required";
  notes: string[];
}

export interface ReleaseDecisionFactors {
  unresolvedExecutionFailures: number;
  overrideApplied: boolean;
  overrideReason?: string;
}

export interface ReleaseCandidateInspection {
  candidateId: string;
  linkedTaskIds: string[];
  linkedSubtaskIds: string[];
  unresolvedBlockers: string[];
  auditFindings: string[];
  reviewState: ReviewState;
  executionTraceSummaries: Array<{
    traceId: string;
    outcome: "success" | "failed" | "blocked" | "interrupted";
    summary: string;
    updatedAtIso: string;
  }>;
  evidenceReferences: string[];
}

export interface ReleaseOperationsPanelState {
  currentReleaseCandidateId: string;
  blockerSummary: ReleaseBlockerSummary;
  approvalSummary: ReleaseApprovalSummary;
  auditSummary: ReleaseAuditSummary;
  readiness: ReleaseReadinessSnapshot;
  deployReadiness: ReleaseDeployReadiness;
  rollbackReadiness: ReleaseRollbackReadiness;
  inspections: Record<string, ReleaseCandidateInspection>;
  goNoGo: GoNoGoDecision;
  decisionFactors: ReleaseDecisionFactors;
  relatedChatSessions: {
    reviewChatId?: string;
    auditChatId?: string;
  };
  relatedActivityEventIds: string[];
}

export interface ReleaseControlState {
  deployments: DeploymentRecord[];
  domains: DomainRecord[];
  releaseCandidates: ReleaseCandidate[];
  releaseHistoryIds: string[];
  activeCandidateId: string;
  finalDecision: GoNoGoDecision;
  operations: ReleaseOperationsPanelState;
}
