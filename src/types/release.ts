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
export type ReleaseOperationsSignalState = "ready" | "warning" | "blocked";

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

export interface ReleaseCandidateLinkage {
  branch: string;
  taskId?: string;
  reviewId?: string;
  deploymentId?: string;
  domainIds: string[];
}

export interface ReleaseBlockerSummary {
  total: number;
  critical: number;
  high: number;
  unresolved: string[];
}

export interface ReleaseApprovalDetail {
  approvalId: string;
  category: WorkflowApproval["category"];
  title: string;
  status: WorkflowApproval["status"];
  requestedBy: string;
  requestedAtIso: string;
  relation: string;
}

export interface ReleaseApprovalSummary {
  required: ReleaseApprovalDetail[];
  completed: ReleaseApprovalDetail[];
  missing: ReleaseApprovalDetail[];
}

export interface ReleaseAuditSummary {
  verdict: AuditorVerdict;
  activeBlockers: number;
  unresolvedFindings: number;
  gateSummary: Array<{ stage: string; verdict: "go" | "no_go" | "not_ready" }>;
}

export interface ReleaseReviewReadiness {
  state: ReviewState;
  status: ReleaseOperationsSignalState;
  summary: string;
}

export interface ReleaseDeployReadiness {
  previewStatus: DeploymentStatus | "missing";
  productionStatus: DeploymentStatus | "missing";
  rolloutState: string;
  dependencyState: string[];
  blockers: string[];
  status: ReleaseOperationsSignalState;
}

export interface ReleaseDomainReadiness {
  status: ReleaseOperationsSignalState;
  summary: string;
  blockingDomains: string[];
}

export interface ReleaseRollbackReadiness {
  availability: "available" | "limited" | "unavailable";
  rollbackTarget?: string;
  fallbackPlanRequired: boolean;
  summary: string;
  status: ReleaseOperationsSignalState;
}

export interface ReleaseGoNoGoSurface {
  status: GoNoGoStatus;
  blockerSeverity: "none" | "warning" | "critical";
  unresolvedExecutionFailures: number;
  operatorOverrides: string[];
  summary: string;
  blockers: string[];
  warnings: string[];
}

export interface ReleaseInspectionItem {
  id: string;
  label: string;
  status: string;
  relation?: string;
}

export interface ReleaseEvidenceReference {
  evidenceId: string;
  title: string;
  severity: string;
  blocking: boolean;
}

export interface ReleaseExecutionTraceReference {
  traceId: string;
  outcome: "success" | "failed" | "blocked" | "interrupted";
  summary: string;
  updatedAtIso: string;
}

export interface ReleaseOperationsPanel {
  generatedAtIso: string;
  candidate: {
    id: string;
    label: string;
    linkage: ReleaseCandidateLinkage;
  };
  blockerSummary: ReleaseBlockerSummary;
  approvalSummary: ReleaseApprovalSummary;
  auditSummary: ReleaseAuditSummary;
  reviewReadiness: ReleaseReviewReadiness;
  deployReadiness: ReleaseDeployReadiness;
  domainReadiness: ReleaseDomainReadiness;
  rollbackReadiness: ReleaseRollbackReadiness;
  decisionSurface: ReleaseGoNoGoSurface;
  inspection: {
    tasks: ReleaseInspectionItem[];
    subtasks: ReleaseInspectionItem[];
    unresolvedBlockers: string[];
    auditResults: string[];
    executionTraces: ReleaseExecutionTraceReference[];
    evidence: ReleaseEvidenceReference[];
  };
  activityLinks: string[];
  reviewChatReferences: string[];
  auditChatReferences: string[];
}

export interface ReleaseControlState {
  deployments: DeploymentRecord[];
  domains: DomainRecord[];
  releaseCandidates: ReleaseCandidate[];
  releaseHistoryIds: string[];
  activeCandidateId: string;
  finalDecision: GoNoGoDecision;
  operationsPanel: ReleaseOperationsPanel;
}
