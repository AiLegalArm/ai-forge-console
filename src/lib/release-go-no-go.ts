import type { GoNoGoDecision, GoNoGoInputs, ReleaseReadiness } from "@/types/release";

const RELEASE_APPROVAL_CATEGORIES = ["git_push", "push_approval", "release_go_no_go", "release_approval", "deploy", "production_deploy_approval", "domain_assignment", "domain_assignment_approval"] as const;

function combineReadiness(values: ReleaseReadiness[]): ReleaseReadiness {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("warning")) return "warning";
  return "ready";
}

export function evaluateGoNoGo(inputs: GoNoGoInputs): GoNoGoDecision {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const goSignals: string[] = [];
  const noGoSignals: string[] = [];

  if (inputs.auditors.includes("no_go") || inputs.auditors.includes("fail")) {
    blockers.push("Auditor verdict blocks release");
    noGoSignals.push("auditor_verdict_fail");
  } else if (inputs.auditors.includes("warning") || inputs.auditors.includes("not_ready")) {
    warnings.push("Auditor verdict includes warnings");
  } else {
    goSignals.push("auditor_verdict_pass");
  }

  if (inputs.releaseAuditorVerdict === "no_go" || inputs.releaseAuditorVerdict === "fail") {
    blockers.push("Release Auditor returned no-go");
    noGoSignals.push("release_auditor_no_go");
  }

  if (inputs.reviewState === "blocked" || inputs.reviewState === "changes_requested") {
    blockers.push("Review workflow is not approved");
    noGoSignals.push("review_not_approved");
  } else {
    goSignals.push("review_approved");
  }

  if (inputs.taskStatuses.some((status) => status === "blocked" || status === "failed")) {
    blockers.push("At least one linked task is blocked or failed");
    noGoSignals.push("task_blocked");
  }

  if (inputs.subtaskStatuses.some((status) => status === "blocked" || status === "failed")) {
    blockers.push("At least one critical subtask is blocked or failed");
    noGoSignals.push("subtask_blocked");
  }

  const releaseScopedBlockers = inputs.auditBlockers.filter((blocker) => blocker.entityType === "release_candidate" || blocker.entityType === "review");
  if (releaseScopedBlockers.length > 0) {
    blockers.push(`Audit blockers active on release/review entities (${releaseScopedBlockers.length})`);
    noGoSignals.push("release_entity_blockers");
  }

  inputs.agentOutcomeSignals.forEach((signal) => {
    if (signal.status === "blocked") {
      blockers.push(`${signal.source} blocks release: ${signal.detail}`);
      noGoSignals.push(`${signal.source}_blocked`);
      return;
    }
    if (signal.status === "warning") {
      warnings.push(`${signal.source} warning: ${signal.detail}`);
      return;
    }
    goSignals.push(`${signal.source}_ready`);
  });

  if (inputs.githubSyncStatus === "blocked" || inputs.githubSyncStatus === "conflict" || inputs.githubSyncStatus === "error") {
    blockers.push("GitHub sync is not healthy");
    noGoSignals.push("github_sync_unhealthy");
  } else {
    goSignals.push("github_sync_ready");
  }

  if (!inputs.browserEvidenceResolved) {
    blockers.push("Browser evidence contains unresolved blockers");
    noGoSignals.push("browser_evidence_blocked");
  }
  if (!inputs.designEvidenceResolved) warnings.push("Design evidence still needs acknowledgement");

  const combinedReadiness = combineReadiness([inputs.deploymentReadiness, inputs.domainReadiness]);
  if (combinedReadiness === "blocked") blockers.push("Deploy/domain readiness is blocked");
  if (combinedReadiness === "warning") warnings.push("Deploy/domain readiness has warnings");
  if (combinedReadiness === "ready") goSignals.push("deploy_domain_ready");

  const approvalsPending = inputs.approvals
    .filter((approval) => approval.status !== "approved")
    .filter((approval) => RELEASE_APPROVAL_CATEGORIES.includes(approval.category as (typeof RELEASE_APPROVAL_CATEGORIES)[number]))
    .map((approval) => approval.category);

  if (approvalsPending.length > 0) {
    blockers.push("Required release approvals are still pending");
    noGoSignals.push("approvals_pending");
  } else {
    goSignals.push("approvals_complete");
  }

  let status: GoNoGoDecision["status"] = "ready";
  if (blockers.length > 0) status = "no_go";
  else if (warnings.length > 0) status = "warning";
  else status = "go";

  const readiness: ReleaseReadiness = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready";

  return {
    status,
    readiness,
    blockers,
    warnings,
    approvalsPending,
    goSignals,
    noGoSignals,
    summary:
      status === "go"
        ? "All release gates satisfied."
        : status === "no_go"
          ? `Release blocked by ${blockers.length} gating condition(s).`
          : "Release has warnings that should be reviewed before promotion.",
  };
}
