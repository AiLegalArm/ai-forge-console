import type {
  ReleaseControlState,
  DeploymentRecord,
  DomainRecord,
  ReleaseCandidate,
  ReleaseOperationsPanel,
  ReleaseApprovalDetail,
} from "@/types/release";
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

const activeCandidate = releaseCandidates.find((candidate) => candidate.id === "rc-2026-03-29-rbac") ?? releaseCandidates[0];
const linkedTask = workflowState.tasks.find((task) => task.id === activeCandidate.linkedTaskId);
const linkedSubtasks = workflowState.subtasks.filter((subtask) => subtask.parentTaskId === activeCandidate.linkedTaskId);
const linkedAuditors = auditors.filter((auditor) => activeCandidate.linkedAuditorTypes.includes(auditor.type));
const linkedEvidence = evidenceFlowState.records.filter((record) => activeCandidate.linkedEvidenceIds.includes(record.id));
const linkedDeployments = deployments.filter((deployment) => deployment.linkedReleaseCandidateId === activeCandidate.id);
const linkedDomains = domains.filter((domain) => activeCandidate.linkedDomainIds.includes(domain.id));
const linkedActivity = workflowState.activityEvents
  .filter((event) => event.taskId === activeCandidate.linkedTaskId || event.chatId === activeCandidate.linkedReviewId)
  .map((event) => event.id);
const linkedExecutionTraces = workflowState.executionTraces
  .filter((trace) => trace.taskId === activeCandidate.linkedTaskId || trace.chatId === activeCandidate.linkedReviewId)
  .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));

const releaseApprovalCategories = new Set([
  "git_push",
  "push_approval",
  "release_go_no_go",
  "release_approval",
  "deploy",
  "production_deploy_approval",
  "domain_assignment",
  "domain_assignment_approval",
]);

const linkedApprovals: ReleaseApprovalDetail[] = approvalOverrides
  .filter((approval) => activeCandidate.linkedApprovalIds.includes(approval.id) || approval.taskId === activeCandidate.linkedTaskId)
  .filter((approval) => releaseApprovalCategories.has(approval.category))
  .map((approval) => ({
    approvalId: approval.id,
    category: approval.category,
    title: approval.title,
    status: approval.status,
    requestedBy: approval.requestedBy,
    requestedAtIso: approval.requestedAtIso,
    relation: approval.taskId === activeCandidate.linkedTaskId ? `Task ${approval.taskId}` : "Release workflow",
  }));

const completedApprovals = linkedApprovals.filter((approval) => approval.status === "approved");
const missingApprovals = linkedApprovals.filter((approval) => approval.status !== "approved");

const deployBlockers = linkedDeployments
  .filter((deployment) => deployment.status === "blocked" || deployment.status === "failed")
  .map((deployment) => deployment.blockedReason ?? `${deployment.environment} deployment is ${deployment.status}`);

const dependencyState = [
  `GitHub sync: ${workflowState.github.repositories[0]?.state ?? "unknown"}`,
  `Audit gate release readiness: ${auditGateDecisions.find((gate) => gate.stage === "release_readiness")?.verdict ?? "not_ready"}`,
  `Task chain: ${linkedTask?.status ?? "unknown"}`,
];

const unresolvedExecutionFailures = linkedExecutionTraces.filter((trace) =>
  trace.finalResultState === "failed" || trace.finalResultState === "blocked",
).length;

const blockingDomainNames = linkedDomains
  .filter((domain) => domain.assignmentState === "blocked" || domain.verificationState === "blocked" || domain.dnsState === "dns_incomplete" || domain.errors.length > 0)
  .map((domain) => domain.name);

const releaseAuditBlockers = auditBlockers.filter(
  (blocker) => blocker.status === "active" && (blocker.entityType === "release_candidate" || blocker.entityType === "review"),
);

const operationsPanel: ReleaseOperationsPanel = {
  generatedAtIso: "2026-03-29T10:49:30.000Z",
  candidate: {
    id: activeCandidate.id,
    label: activeCandidate.label,
    linkage: {
      branch: activeCandidate.linkedBranch,
      taskId: activeCandidate.linkedTaskId,
      reviewId: activeCandidate.linkedReviewId,
      deploymentId: activeCandidate.linkedDeploymentId,
      domainIds: activeCandidate.linkedDomainIds,
    },
  },
  blockerSummary: {
    total: finalDecision.blockers.length,
    critical: linkedEvidence.filter((record) => record.blocking && record.severity === "critical").length,
    high: linkedEvidence.filter((record) => record.blocking && record.severity === "high").length,
    unresolved: finalDecision.blockers,
  },
  approvalSummary: {
    required: linkedApprovals,
    completed: completedApprovals,
    missing: missingApprovals,
  },
  auditSummary: {
    verdict: activeCandidate.auditVerdict,
    activeBlockers: releaseAuditBlockers.length,
    unresolvedFindings: linkedAuditors.reduce((total, auditor) => total + auditor.findingCount, 0),
    gateSummary: auditGateDecisions.map((gate) => ({ stage: gate.stage, verdict: gate.verdict })),
  },
  reviewReadiness: {
    state: activeCandidate.reviewState,
    status: activeCandidate.reviewState === "approved" ? "ready" : activeCandidate.reviewState === "in_review" ? "warning" : "blocked",
    summary: activeCandidate.reviewState === "approved" ? "Review approved and eligible for release decision." : "Review is not in an approved state.",
  },
  deployReadiness: {
    previewStatus: linkedDeployments.find((deployment) => deployment.environment === "preview")?.status ?? "missing",
    productionStatus: linkedDeployments.find((deployment) => deployment.environment === "production")?.status ?? "missing",
    rolloutState: linkedDeployments.some((deployment) => deployment.status === "deployed") ? "rollout-active" : "rollout-blocked",
    dependencyState,
    blockers: deployBlockers,
    status: deployBlockers.length > 0 ? "blocked" : "ready",
  },
  domainReadiness: {
    status: blockingDomainNames.length > 0 ? "blocked" : "ready",
    summary: blockingDomainNames.length > 0 ? "Domain assignment and DNS checks still block promotion." : "Domain checks are healthy for promotion.",
    blockingDomains: blockingDomainNames,
  },
  rollbackReadiness: {
    availability: linkedDeployments.some((deployment) => deployment.rollbackAvailable) ? "available" : "unavailable",
    rollbackTarget: deployments.find((deployment) => deployment.status === "rolled_back")?.id,
    fallbackPlanRequired: finalDecision.status !== "go",
    summary: finalDecision.status === "go" ? "Rollback path available and no fallback plan required." : "Rollback is available, but fallback planning is required before promotion.",
    status: linkedDeployments.some((deployment) => deployment.rollbackAvailable) ? "ready" : "blocked",
  },
  decisionSurface: {
    status: finalDecision.status,
    blockerSeverity: finalDecision.blockers.length > 0 ? "critical" : finalDecision.warnings.length > 0 ? "warning" : "none",
    unresolvedExecutionFailures,
    operatorOverrides: finalDecision.status === "no_go" ? ["Operator override disabled until security blockers are resolved."] : [],
    summary: finalDecision.summary,
    blockers: finalDecision.blockers,
    warnings: finalDecision.warnings,
  },
  inspection: {
    tasks: workflowState.tasks
      .filter((task) => task.id === activeCandidate.linkedTaskId || task.parentTaskId === activeCandidate.linkedTaskId)
      .map((task) => ({
        id: task.id,
        label: task.title,
        status: task.status,
        relation: task.parentTaskId ? `Subtask of ${task.parentTaskId}` : "Primary release task",
      })),
    subtasks: linkedSubtasks.map((subtask) => ({
      id: subtask.id,
      label: subtask.title,
      status: subtask.status,
      relation: subtask.criticalPath ? "Critical path" : "Support path",
    })),
    unresolvedBlockers: finalDecision.blockers,
    auditResults: linkedAuditors.map((auditor) => `${auditor.type}: ${auditor.verdict} (${auditor.findingCount} findings)`),
    executionTraces: linkedExecutionTraces.slice(0, 4).map((trace) => ({
      traceId: trace.traceId,
      outcome: trace.finalResultState,
      summary: trace.steps.at(-1)?.title ?? trace.summary.outcome,
      updatedAtIso: trace.updatedAtIso,
    })),
    evidence: linkedEvidence.map((record) => ({
      evidenceId: record.id,
      title: record.title,
      severity: record.severity,
      blocking: record.blocking,
    })),
  },
  activityLinks: linkedActivity.slice(0, 8),
  reviewChatReferences: [activeCandidate.linkedReviewId ?? "review-session-1"].filter(Boolean),
  auditChatReferences: workflowState.tasks
    .filter((task) => task.phase === "audit" && task.parentTaskId === activeCandidate.linkedTaskId)
    .map((task) => task.linkedChatSessionId),
};

export const releaseControlState: ReleaseControlState = {
  deployments,
  domains,
  releaseCandidates,
  releaseHistoryIds: ["rc-2026-03-28-rbac", "rc-2026-03-29-rbac"],
  activeCandidateId: "rc-2026-03-29-rbac",
  finalDecision,
  operationsPanel,
};
