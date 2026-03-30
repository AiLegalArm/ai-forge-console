import type { AuditorControlState } from "@/types/audits";
import type { EvidenceFlowState } from "@/types/evidence";
import type { PullRequestReviewBlocker, PullRequestReviewOperations, PullRequestState, WorkflowApproval, WorkflowState, WorkflowTask } from "@/types/workflow";

interface EvaluatePrReviewOperationsInput {
  task?: WorkflowTask;
  pullRequest?: PullRequestState;
  workflow: WorkflowState;
  auditors: AuditorControlState;
  evidenceFlow: EvidenceFlowState;
  defaultBranch?: string;
  releaseGateBlocked?: boolean;
}

function createBlocker(
  category: PullRequestReviewBlocker["category"],
  message: string,
  severity: PullRequestReviewBlocker["severity"] = "warning",
  linkedEntityId?: string,
): PullRequestReviewBlocker {
  return {
    id: `${category}-${linkedEntityId ?? Math.random().toString(36).slice(2, 8)}`,
    category,
    message,
    severity,
    linkedEntityId,
  };
}

function missingApprovalsForTask(approvals: WorkflowApproval[], taskId?: string): WorkflowApproval[] {
  if (!taskId) return [];
  return approvals.filter((approval) => approval.taskId === taskId && approval.status !== "approved");
}

export function evaluatePullRequestReviewOperations(input: EvaluatePrReviewOperationsInput): PullRequestReviewOperations | undefined {
  const { task, pullRequest, workflow, auditors, evidenceFlow, defaultBranch, releaseGateBlocked } = input;
  if (!task || !pullRequest) return undefined;

  const blockers: PullRequestReviewBlocker[] = [];
  const nowIso = new Date().toISOString();

  if (!pullRequest.sourceBranch || !pullRequest.targetBranch) {
    blockers.push(createBlocker("pr_context", "PR source/target branch is missing.", "critical", pullRequest.id));
  }

  if (pullRequest.sourceBranch && pullRequest.targetBranch && pullRequest.sourceBranch === pullRequest.targetBranch) {
    blockers.push(createBlocker("repo_branch", "PR source branch cannot match target branch.", "critical", pullRequest.id));
  }

  if (defaultBranch && pullRequest.sourceBranch === defaultBranch) {
    blockers.push(createBlocker("repo_branch", "PR cannot be prepared from the default branch.", "critical", pullRequest.id));
  }

  if (task.github?.pushWorkflow.status !== "pushed") {
    blockers.push(createBlocker("repo_branch", "Branch has not been pushed for review.", "critical", task.id));
  }

  if (task.github?.branch?.trackingStatus === "diverged" || (task.github?.branch?.behindBy ?? 0) > 0) {
    blockers.push(createBlocker("repo_branch", "Branch is behind/diverged from remote and is not merge-safe.", "critical", task.id));
  }

  const linkedSubtasks = workflow.subtasks.filter((subtask) => subtask.parentTaskId === task.id || subtask.taskId === task.id);
  const incompleteSubtasks = linkedSubtasks.filter((subtask) => subtask.status !== "completed");
  if (task.status !== "completed" || incompleteSubtasks.length > 0) {
    blockers.push(createBlocker("task_completion", "Task/subtask completion is required before merge.", "warning", task.id));
  }

  const auditBlockers = auditors.blockers
    .filter((blocker) => blocker.status === "active")
    .filter((blocker) => blocker.entityId === task.id || blocker.entityId === pullRequest.id || blocker.entityType === "review")
    .map((blocker) => createBlocker("audit", blocker.rationale, blocker.blockingSeverity, blocker.id));
  blockers.push(...auditBlockers);

  const openFindings = pullRequest.findings.filter((finding) => finding.status === "open");
  if (openFindings.length > 0) {
    blockers.push(
      createBlocker(
        "audit",
        `${openFindings.length} PR review finding(s) are still open.`,
        openFindings.some((finding) => finding.severity === "critical") ? "critical" : "warning",
        pullRequest.id,
      ),
    );
  }

  const blockedEvidence = evidenceFlow.records.filter(
    (record) =>
      record.blocking &&
      (record.links.taskId === task.id || record.links.reviewId === pullRequest.id) &&
      (record.source === "browser_agent" || record.source === "designer_agent"),
  );
  if (blockedEvidence.length > 0) {
    blockers.push(createBlocker("browser_design", `${blockedEvidence.length} browser/design blocker evidence record(s) remain unresolved.`, "warning", task.id));
  }

  const failedExecutionTraces = workflow.executionTraces.filter(
    (trace) => trace.taskId === task.id && (trace.finalResultState === "failed" || trace.finalResultState === "blocked"),
  );
  if (failedExecutionTraces.length > 0) {
    blockers.push(createBlocker("test_build", `${failedExecutionTraces.length} execution trace(s) failed/blocked for this task.`, "warning", task.id));
  }

  const missingApprovals = missingApprovalsForTask(workflow.approvals, task.id);
  if (missingApprovals.length > 0) {
    blockers.push(createBlocker("approval", `${missingApprovals.length} approval(s) are still pending/rejected for this task.`, "critical", task.id));
  }

  if (releaseGateBlocked) {
    blockers.push(createBlocker("release_policy", "Release policy gate is currently blocked for this PR context.", "critical", pullRequest.id));
  }

  const criticalBlockers = blockers.filter((blocker) => blocker.severity === "critical");
  const hasBlockers = blockers.length > 0;

  let reviewState: PullRequestReviewOperations["reviewReadiness"]["state"] = "not_ready";
  if (pullRequest.status === "draft_review" || pullRequest.creationStatus !== "created") reviewState = "draft";
  else if (hasBlockers) reviewState = "blocked";
  else if (pullRequest.status === "ready_for_review") reviewState = "ready_for_review";
  else if (pullRequest.status === "approved") reviewState = "ready_to_merge";
  else reviewState = "in_review";

  const mergeReady = reviewState === "ready_to_merge" && criticalBlockers.length === 0;
  const releaseHandoffReady = mergeReady && !releaseGateBlocked;

  const recommendedNextSteps: string[] = [];
  if (reviewState === "draft") recommendedNextSteps.push("Move PR from draft to review after validation evidence is attached.");
  if (auditBlockers.length > 0) recommendedNextSteps.push("Resolve active audit blockers and rerun linked checks.");
  if (blockedEvidence.length > 0) recommendedNextSteps.push("Close unresolved browser/design evidence blockers.");
  if (missingApprovals.length > 0) recommendedNextSteps.push("Collect missing approvals before merge.");
  if (failedExecutionTraces.length > 0) recommendedNextSteps.push("Rerun failing test/build execution traces and attach results.");
  if (recommendedNextSteps.length === 0) recommendedNextSteps.push("PR is clear; proceed with protected merge and release handoff.");

  return {
    identity: {
      pullRequestId: pullRequest.id,
      number: pullRequest.number,
      sourceBranch: pullRequest.sourceBranch,
      targetBranch: pullRequest.targetBranch,
    },
    linkage: {
      taskIds: pullRequest.linkedTaskIds,
      subtaskIds: pullRequest.linkedSubtaskIds,
      reviewChatSessionId: pullRequest.reviewChatSessionId,
      linkedAuditId: pullRequest.linkedAuditId,
    },
    reviewReadiness: {
      state: reviewState,
      summary:
        reviewState === "ready_to_merge"
          ? "PR review checks are satisfied and merge is allowed."
          : hasBlockers
            ? `PR review is blocked by ${blockers.length} issue(s).`
            : "PR review is in progress.",
    },
    blockers,
    auditBlockers,
    mergeReadiness: {
      state: mergeReady ? "ready" : hasBlockers ? "blocked" : "not_ready",
      summary: mergeReady ? "Merge readiness confirmed." : hasBlockers ? "Merge blocked until blockers are resolved." : "Merge prerequisites are still pending.",
    },
    releaseHandoff: {
      state: releaseHandoffReady ? "ready" : hasBlockers ? "carryover_blockers" : "not_ready",
      summary: releaseHandoffReady
        ? "Ready for protected handoff into release workflow."
        : hasBlockers
          ? "Release handoff includes blocker carryover and remains protected."
          : "Release handoff not ready.",
      carryoverBlockers: blockers.map((blocker) => blocker.message),
    },
    recommendedNextSteps,
    evaluatedAtIso: nowIso,
  };
}
