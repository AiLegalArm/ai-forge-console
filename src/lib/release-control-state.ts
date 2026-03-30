import type { AuditorControlState } from "@/types/audits";
import type { EvidenceFlowState } from "@/types/evidence";
import { evaluateGoNoGo } from "@/lib/release-go-no-go";
import type { DeploymentRecord, ReleaseApprovalDetail, ReleaseControlState, ReleaseOperationsPanel } from "@/types/release";
import type { WorkflowApproval, WorkflowState } from "@/types/workflow";

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

export function deriveReleaseControlState(
  state: ReleaseControlState,
  workflow: WorkflowState,
  auditors: AuditorControlState,
  evidenceFlow: EvidenceFlowState,
): ReleaseControlState {
  const activeCandidate = state.releaseCandidates.find((candidate) => candidate.id === state.activeCandidateId) ?? state.releaseCandidates[0];
  if (!activeCandidate) return state;

  const linkedDeployments = state.deployments.filter((deployment) => deployment.linkedReleaseCandidateId === activeCandidate.id);
  const linkedDomains = state.domains.filter((domain) => activeCandidate.linkedDomainIds.includes(domain.id));

  const linkedApprovals: ReleaseApprovalDetail[] = workflow.approvals
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

  const deployBlockers = linkedDeployments
    .filter((deployment) => deployment.status === "blocked" || deployment.status === "failed")
    .map((deployment) => deployment.blockedReason ?? `${deployment.environment} deployment is ${deployment.status}`);

  const unresolvedBrowserBlockers = evidenceFlow.records.some((record) =>
    record.blocking && ["browser_agent", "auditor"].includes(record.source) && record.tags.includes("release"),
  );
  const unresolvedDesignBlockers = evidenceFlow.records.some((record) => record.blocking && record.source === "designer_agent" && record.tags.includes("release"));

  const finalDecision = evaluateGoNoGo({
    auditors: auditors.auditors.map((auditor) => auditor.verdict),
    releaseAuditorVerdict: auditors.auditors.find((auditor) => auditor.type === "release")?.verdict ?? "not_ready",
    reviewState: activeCandidate.reviewState,
    taskStatuses: workflow.tasks.filter((task) => task.id === activeCandidate.linkedTaskId).map((task) => task.status),
    subtaskStatuses: workflow.subtasks.filter((subtask) => subtask.taskId === activeCandidate.linkedTaskId).map((subtask) => subtask.status),
    auditBlockers: auditors.blockers,
    agentOutcomeSignals: [
      { source: "browser_agent", status: unresolvedBrowserBlockers ? "blocked" : "ready", detail: unresolvedBrowserBlockers ? "Browser evidence unresolved" : "Browser checks resolved" },
      { source: "designer_agent", status: unresolvedDesignBlockers ? "blocked" : "ready", detail: unresolvedDesignBlockers ? "Design evidence unresolved" : "Design checks resolved" },
    ],
    githubSyncStatus: workflow.github.repositories[0]?.state ?? "error",
    browserEvidenceResolved: !unresolvedBrowserBlockers,
    designEvidenceResolved: !unresolvedDesignBlockers,
    deploymentReadiness: deployBlockers.length > 0 ? "blocked" : "ready",
    domainReadiness: linkedDomains.some((domain) => domain.assignmentState === "blocked" || domain.errors.length > 0) ? "blocked" : "ready",
    approvals: workflow.approvals,
  });

  const operationsPanel: ReleaseOperationsPanel = {
    ...state.operationsPanel,
    generatedAtIso: new Date().toISOString(),
    approvalSummary: {
      required: linkedApprovals,
      completed: linkedApprovals.filter((approval) => approval.status === "approved"),
      missing: linkedApprovals.filter((approval) => approval.status !== "approved"),
    },
    deployReadiness: {
      previewStatus: linkedDeployments.find((deployment) => deployment.environment === "preview")?.status ?? "missing",
      productionStatus: linkedDeployments.find((deployment) => deployment.environment === "production")?.status ?? "missing",
      rolloutState: linkedDeployments.some((deployment) => deployment.status === "deployed") ? "rollout-active" : "rollout-blocked",
      dependencyState: [
        `GitHub: ${workflow.github.repositories[0]?.state ?? "unknown"}`,
        `Audit: ${finalDecision.status}`,
      ],
      blockers: deployBlockers,
      status: deployBlockers.length > 0 ? "blocked" : "ready",
    },
    rollbackReadiness: {
      availability: linkedDeployments.some((deployment) => deployment.rollbackAvailable) ? "available" : "unavailable",
      rollbackTarget: linkedDeployments.find((deployment) => deployment.status === "rolled_back")?.id,
      fallbackPlanRequired: finalDecision.status !== "go",
      summary: linkedDeployments.some((deployment) => deployment.rollbackAvailable)
        ? "Rollback is available for the current release candidate."
        : "Rollback is not currently available.",
      status: linkedDeployments.some((deployment) => deployment.rollbackAvailable) ? "ready" : "blocked",
    },
    decisionSurface: {
      ...state.operationsPanel.decisionSurface,
      status: finalDecision.status,
      summary: finalDecision.summary,
      blockers: finalDecision.blockers,
      warnings: finalDecision.warnings,
    },
  };

  return {
    ...state,
    finalDecision,
    operationsPanel,
    releaseCandidates: state.releaseCandidates.map((candidate) =>
      candidate.id === activeCandidate.id
        ? {
            ...candidate,
            deploymentState: linkedDeployments.find((deployment) => deployment.environment === "production")?.status ?? candidate.deploymentState,
            finalReadiness: finalDecision.readiness,
            updatedAtIso: new Date().toISOString(),
          }
        : candidate,
    ),
  };
}

export function upsertDeployment(deployments: DeploymentRecord[], deployment: DeploymentRecord): DeploymentRecord[] {
  const existing = deployments.find((entry) => entry.id === deployment.id);
  if (!existing) return [deployment, ...deployments];
  return deployments.map((entry) => (entry.id === deployment.id ? deployment : entry));
}

export function upsertApproval(approvals: WorkflowApproval[], approval: WorkflowApproval): WorkflowApproval[] {
  if (approvals.some((entry) => entry.id === approval.id)) return approvals;
  return [approval, ...approvals];
}
