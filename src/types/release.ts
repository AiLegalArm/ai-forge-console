import type { AuditorVerdict, AuditorType } from "@/types/audits";
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
  reviewState: ReviewState;
  taskStatuses: TaskStatus[];
  githubSyncStatus: GitHubConnectionState;
  browserEvidenceResolved: boolean;
  designEvidenceResolved: boolean;
  deploymentReadiness: ReleaseReadiness;
  domainReadiness: ReleaseReadiness;
  approvals: WorkflowApproval[];
}

export interface GoNoGoDecision {
  status: GoNoGoStatus;
  blockers: string[];
  warnings: string[];
  approvalsPending: WorkflowApproval["category"][];
  summary: string;
}

export interface ReleaseControlState {
  deployments: DeploymentRecord[];
  domains: DomainRecord[];
  releaseCandidates: ReleaseCandidate[];
  releaseHistoryIds: string[];
  activeCandidateId: string;
  finalDecision: GoNoGoDecision;
}
