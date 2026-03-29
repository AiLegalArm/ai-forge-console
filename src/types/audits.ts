export type AuditorType =
  | "code"
  | "security"
  | "ai"
  | "prompt"
  | "tool"
  | "git"
  | "test"
  | "release";

export type AuditorRunState = "idle" | "queued" | "running" | "completed" | "blocked" | "failed";

export type AuditorVerdict = "pass" | "warning" | "fail" | "go" | "no_go" | "not_ready";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export type FindingStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type AuditGateStage = "push_readiness" | "review_readiness" | "merge_readiness" | "release_readiness" | "deploy_readiness";

export type AuditScopeType = "workspace" | "task" | "chat" | "branch" | "review" | "release_candidate";

export interface AuditScope {
  scopeType: AuditScopeType;
  scopeId: string;
  label: string;
}

export type AuditEvidenceType =
  | "file"
  | "chat"
  | "task"
  | "branch"
  | "runtime_event"
  | "audit_snapshot"
  | "provider_context"
  | "quality_signal";

export interface AuditEvidenceReference {
  id: string;
  type: AuditEvidenceType;
  title: string;
  reference: string;
  details?: string;
  createdAtIso: string;
}

export interface AuditEntityLinks {
  taskId?: string;
  chatSessionId?: string;
  branchName?: string;
  reviewId?: string;
  releaseCandidateId?: string;
  commitSha?: string;
}

export interface SeveritySummary {
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface AuditorFinding {
  id: string;
  title: string;
  description: string;
  auditorType: AuditorType;
  severity: FindingSeverity;
  blocking: boolean;
  scope: AuditScope;
  evidence: AuditEvidenceReference[];
  recommendation: string;
  linked: AuditEntityLinks;
  status: FindingStatus;
  createdAtIso: string;
}

export interface AuditorRun {
  id: string;
  auditorId: string;
  auditorType: AuditorType;
  scope: AuditScope;
  runState: AuditorRunState;
  linked: AuditEntityLinks;
  findingIds: string[];
  findingCount: number;
  verdict: AuditorVerdict;
  severitySummary: SeveritySummary;
  startedAtIso: string;
  completedAtIso?: string;
  evidenceReferences: AuditEvidenceReference[];
}

export interface AuditorProfile {
  id: string;
  type: AuditorType;
  name: string;
  scope: AuditScope;
  runState: AuditorRunState;
  linked: AuditEntityLinks;
  findingCount: number;
  verdict: AuditorVerdict;
  severitySummary: SeveritySummary;
  lastRunAtIso?: string;
  createdAtIso: string;
  updatedAtIso: string;
  evidenceReferences: AuditEvidenceReference[];
}

export interface AuditRunGroup {
  id: string;
  dimension: "auditor" | "task" | "branch" | "review" | "release_candidate";
  targetId: string;
  runIds: string[];
  findingIds: string[];
  verdict: AuditorVerdict;
  severitySummary: SeveritySummary;
  generatedAtIso: string;
}

export interface AuditGateDecision {
  stage: AuditGateStage;
  verdict: "go" | "no_go" | "not_ready";
  blockingFindingIds: string[];
  blockedByAuditorTypes: AuditorType[];
  rationale: string;
  updatedAtIso: string;
}

export interface AuditorControlState {
  auditors: AuditorProfile[];
  findings: AuditorFinding[];
  runs: AuditorRun[];
  runGroups: AuditRunGroup[];
  gateDecisions: AuditGateDecision[];
}
