import type { ReleaseControlState, DeploymentRecord, DomainRecord, ReleaseCandidate } from "@/types/release";
import type { WorkflowApproval } from "@/types/workflow";
import { evaluateGoNoGo } from "@/lib/release-go-no-go";
import { workflowState } from "@/data/mock-workflow";
import { auditBlockers, auditGateDecisions, auditors } from "@/data/mock-audits";
import { evidenceFlowState } from "@/data/mock-evidence";

const deployments: DeploymentRecord[] = [
  {
    id: "dep-preview-rbac-18",
    environment: "preview",
    targetType: "preview",
    status: "preview_ready",
    source: "github_action",
    previewTarget: "https://preview-rbac-18.acme.dev",
    linkedTaskId: "task-rbac-release",
    linkedBranch: "feat/rbac-task-rbac-exec",
    linkedReviewId: "pr-rbac-42",
    linkedReleaseCandidateId: "rc-2026-03-29-rbac",
    rollbackAvailable: true,
    createdAtIso: "2026-03-29T10:46:10.000Z",
    updatedAtIso: "2026-03-29T10:47:05.000Z",
    deployedAtIso: "2026-03-29T10:47:05.000Z",
  },
  {
    id: "dep-prod-rbac-18",
    environment: "production",
    targetType: "production",
    status: "blocked",
    source: "release_workflow",
    productionTarget: "https://app.acme.dev",
    linkedTaskId: "task-rbac-release",
    linkedBranch: "feat/rbac-task-rbac-exec",
    linkedReviewId: "pr-rbac-42",
    linkedReleaseCandidateId: "rc-2026-03-29-rbac",
    rollbackAvailable: true,
    createdAtIso: "2026-03-29T10:47:20.000Z",
    updatedAtIso: "2026-03-29T10:48:10.000Z",
    blockedReason: "Security Auditor NO_GO verdict and unresolved browser evidence",
  },
  {
    id: "dep-prod-rbac-17",
    environment: "production",
    targetType: "production",
    status: "rolled_back",
    source: "rollback",
    productionTarget: "https://app.acme.dev",
    linkedReleaseCandidateId: "rc-2026-03-28-rbac",
    rollbackAvailable: true,
    createdAtIso: "2026-03-28T22:13:00.000Z",
    updatedAtIso: "2026-03-28T22:18:00.000Z",
    deployedAtIso: "2026-03-28T22:14:00.000Z",
    rolledBackAtIso: "2026-03-28T22:18:00.000Z",
    blockedReason: "Error budget exceeded after release",
  },
];

const domains: DomainRecord[] = [
  {
    id: "dom-app",
    name: "app.acme.dev",
    type: "subdomain",
    verificationState: "verified",
    dnsState: "verified",
    targetEnvironment: "production",
    productionAssignment: "dep-prod-rbac-18",
    assignmentState: "assigned",
    relatedDeployId: "dep-prod-rbac-18",
    warnings: [],
    errors: [],
    createdAtIso: "2026-03-20T09:00:00.000Z",
    updatedAtIso: "2026-03-29T10:47:30.000Z",
  },
  {
    id: "dom-preview",
    name: "preview-rbac-18.acme.dev",
    type: "subdomain",
    verificationState: "verified",
    dnsState: "verified",
    targetEnvironment: "preview",
    previewAssignment: "dep-preview-rbac-18",
    assignmentState: "assigned",
    relatedDeployId: "dep-preview-rbac-18",
    warnings: ["TTL is high (300s) for rapid rollback"],
    errors: [],
    createdAtIso: "2026-03-29T10:46:35.000Z",
    updatedAtIso: "2026-03-29T10:47:20.000Z",
  },
  {
    id: "dom-api",
    name: "api.acme.dev",
    type: "subdomain",
    verificationState: "pending_verification",
    dnsState: "dns_incomplete",
    targetEnvironment: "production",
    assignmentState: "blocked",
    relatedDeployId: "dep-prod-rbac-18",
    warnings: ["CNAME record not propagated to all resolvers"],
    errors: ["Missing TXT verification record"],
    createdAtIso: "2026-03-29T10:47:00.000Z",
    updatedAtIso: "2026-03-29T10:48:00.000Z",
  },
];

const releaseCandidates: ReleaseCandidate[] = [
  {
    id: "rc-2026-03-29-rbac",
    label: "RBAC Release Candidate 2026-03-29",
    linkedBranch: "feat/rbac-task-rbac-exec",
    linkedTaskId: "task-rbac-release",
    linkedReviewId: "pr-rbac-42",
    linkedDeploymentId: "dep-prod-rbac-18",
    linkedDomainIds: ["dom-app", "dom-api", "dom-preview"],
    linkedAuditorTypes: ["release", "security", "test", "git"],
    linkedEvidenceIds: ["ev-browser-step-fail-1", "ev-browser-console-1", "ev-design-layout-1"],
    linkedApprovalIds: ["approval-git-push-1", "approval-deploy-1", "approval-release-gate-1", "approval-domain-1"],
    reviewState: "approved",
    deploymentState: "blocked",
    domainState: "blocked",
    auditVerdict: "no_go",
    finalReadiness: "blocked",
    createdAtIso: "2026-03-29T10:46:00.000Z",
    updatedAtIso: "2026-03-29T10:48:10.000Z",
  },
  {
    id: "rc-2026-03-28-rbac",
    label: "RBAC Release Candidate 2026-03-28",
    linkedBranch: "feat/rbac-task-rbac-exec",
    linkedReviewId: "pr-rbac-41",
    linkedDeploymentId: "dep-prod-rbac-17",
    linkedDomainIds: ["dom-app"],
    linkedAuditorTypes: ["release", "security"],
    linkedEvidenceIds: ["ev-design-layout-1"],
    linkedApprovalIds: [],
    reviewState: "approved",
    deploymentState: "rolled_back",
    domainState: "assigned",
    auditVerdict: "go",
    finalReadiness: "warning",
    createdAtIso: "2026-03-28T22:05:00.000Z",
    updatedAtIso: "2026-03-28T22:18:00.000Z",
  },
];

const approvalOverrides: WorkflowApproval[] = [
  ...workflowState.approvals,
  {
    id: "approval-domain-1",
    category: "domain_assignment" as const,
    title: "Approve production domain assignment",
    reason: "Assign api.acme.dev to production release candidate",
    status: "pending" as const,
    taskId: "task-rbac-release",
    chatId: "review-session-1",
    requestedBy: "domain-controller",
    requestedAtIso: "2026-03-29T10:48:20.000Z",
  },
];

const activeAuditVerdicts = auditors
  .filter((auditor) => releaseCandidates[0].linkedAuditorTypes.includes(auditor.type))
  .map((auditor) => auditor.verdict);

const unresolvedBrowserBlockers = evidenceFlowState.records.some((record) =>
  record.blocking && ["browser_agent", "auditor"].includes(record.source) && record.tags.includes("release"),
);

const unresolvedDesignBlockers = evidenceFlowState.records.some(
  (record) => record.blocking && record.source === "designer_agent" && record.tags.includes("release"),
);

const deploymentReadiness = deployments.some((deployment) => deployment.status === "blocked") ? "blocked" : "ready";
const domainReadiness = domains.some((domain) => domain.assignmentState === "blocked" || domain.dnsState === "dns_incomplete") ? "blocked" : "ready";

const finalDecision = evaluateGoNoGo({
  auditors: [...activeAuditVerdicts, ...auditGateDecisions.map((gate) => gate.verdict === "go" ? "go" : "no_go")],
  releaseAuditorVerdict: auditors.find((auditor) => auditor.type === "release")?.verdict ?? "not_ready",
  reviewState: releaseCandidates[0].reviewState,
  taskStatuses: workflowState.tasks.filter((task) => task.id === "task-rbac-release" || task.id === "task-rbac-audit").map((task) => task.status),
  subtaskStatuses: workflowState.subtasks
    .filter((subtask) => ["task-rbac-release", "task-rbac-audit", "task-rbac-exec"].includes(subtask.taskId) && subtask.criticalPath)
    .map((subtask) => subtask.status),
  auditBlockers,
  agentOutcomeSignals: [
    { source: "browser_agent", status: unresolvedBrowserBlockers ? "blocked" as const : "ready" as const, detail: unresolvedBrowserBlockers ? "Failed invite scenario evidence is unresolved" : "Scenarios passed" },
    { source: "reviewer", status: releaseCandidates[0].reviewState === "approved" ? "ready" as const : "warning" as const, detail: `Review state is ${releaseCandidates[0].reviewState}` },
    { source: "security_auditor", status: auditBlockers.some((blocker) => blocker.sourceAuditorType === "security") ? "blocked" as const : "ready" as const, detail: "Security findings must be resolved before merge/release" },
    { source: "test_auditor", status: auditBlockers.some((blocker) => blocker.sourceAuditorType === "test") ? "blocked" as const : "ready" as const, detail: "Regression coverage and browser failures are part of release gate" },
  ],
  githubSyncStatus: workflowState.github.repositories[0]?.state ?? "error",
  browserEvidenceResolved: !unresolvedBrowserBlockers,
  designEvidenceResolved: !unresolvedDesignBlockers,
  deploymentReadiness,
  domainReadiness,
  approvals: approvalOverrides,
});

export const releaseControlState: ReleaseControlState = {
  deployments,
  domains,
  releaseCandidates,
  releaseHistoryIds: ["rc-2026-03-28-rbac", "rc-2026-03-29-rbac"],
  activeCandidateId: "rc-2026-03-29-rbac",
  finalDecision,
};
