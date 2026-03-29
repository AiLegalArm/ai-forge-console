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

  if (inputs.auditors.includes("no_go") || inputs.auditors.includes("fail")) {
    blockers.push("Auditor verdict blocks release");
  } else if (inputs.auditors.includes("warning") || inputs.auditors.includes("not_ready")) {
    warnings.push("Auditor verdict includes warnings");
  }

  if (inputs.reviewState === "blocked" || inputs.reviewState === "changes_requested") {
    blockers.push("Review workflow is not approved");
  }

  if (inputs.taskStatuses.some((status) => status === "blocked" || status === "failed")) {
    blockers.push("At least one linked task is blocked or failed");
  }

  if (inputs.githubSyncStatus === "blocked" || inputs.githubSyncStatus === "conflict" || inputs.githubSyncStatus === "error") {
    blockers.push("GitHub sync is not healthy");
  }

  if (!inputs.browserEvidenceResolved) blockers.push("Browser evidence contains unresolved blockers");
  if (!inputs.designEvidenceResolved) warnings.push("Design evidence still needs acknowledgement");

  const combinedReadiness = combineReadiness([inputs.deploymentReadiness, inputs.domainReadiness]);
  if (combinedReadiness === "blocked") blockers.push("Deploy/domain readiness is blocked");
  if (combinedReadiness === "warning") warnings.push("Deploy/domain readiness has warnings");

  const approvalsPending = inputs.approvals
    .filter((approval) => approval.status !== "approved")
    .filter((approval) => RELEASE_APPROVAL_CATEGORIES.includes(approval.category as (typeof RELEASE_APPROVAL_CATEGORIES)[number]))
    .map((approval) => approval.category);

  if (approvalsPending.length > 0) {
    blockers.push("Required release approvals are still pending");
  }

  let status: GoNoGoDecision["status"] = "ready";
  if (blockers.length > 0) status = "no_go";
  else if (warnings.length > 0) status = "warning";
  else status = "go";

  return {
    status,
    blockers,
    warnings,
    approvalsPending,
    summary:
      status === "go"
        ? "All release gates satisfied."
        : status === "no_go"
          ? `Release blocked by ${blockers.length} gating condition(s).`
          : "Release has warnings that should be reviewed before promotion.",
  };
}
