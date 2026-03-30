import type {
  ExecutionPolicyAction,
  ExecutionPolicyContext,
  ExecutionPolicyDecision,
  ExecutionPolicyOutcome,
  ExecutionPolicyState,
} from "@/types/execution-policy";

const MAX_POLICY_HISTORY = 20;

function buildOutcome(decision: Omit<ExecutionPolicyDecision, "isAllowed" | "requiresApproval" | "blocked" | "evaluatedAtIso">): ExecutionPolicyDecision {
  const outcome = decision.outcome;
  const requiresApproval = outcome === "require_approval";
  const blocked = outcome === "deny" || outcome === "deny_with_explanation";
  const isAllowed = !blocked;

  return {
    ...decision,
    isAllowed,
    requiresApproval,
    blocked,
    evaluatedAtIso: new Date().toISOString(),
  };
}

export function evaluateExecutionPolicy(action: ExecutionPolicyAction, context: ExecutionPolicyContext): ExecutionPolicyDecision {
  const base = {
    action,
    scope: {
      scopeType: context.activeTaskId ? "task" : "project",
      scopeId: context.activeTaskId ?? context.activeProjectId,
      label: context.activeTaskId ?? context.activeProjectName,
    },
    policyId: `policy-${action.actionType}`,
  } as const;

  if (action.actionType === "cloud_execution" && context.localCloudMode === "local") {
    return buildOutcome({
      ...base,
      outcome: "deny_with_explanation",
      rationale: "Cloud execution is blocked while workspace is in local-only mode.",
      linkedApprovalRequirement: { required: false },
    });
  }

  if (action.actionType === "provider_model_switch" && action.metadata?.nextProvider === "openrouter" && context.localCloudMode === "local") {
    return buildOutcome({
      ...base,
      outcome: "deny_with_explanation",
      rationale: "Provider switch to cloud is blocked in local-only mode.",
      linkedApprovalRequirement: { required: false },
    });
  }

  if (action.actionType === "release_approval" && context.hasCriticalAuditBlockers) {
    return buildOutcome({
      ...base,
      outcome: "deny_with_explanation",
      rationale: "Release approval is denied while critical audit blockers remain active.",
      linkedApprovalRequirement: { required: false },
    });
  }

  if (action.actionType === "deploy_action" && context.releaseState !== "go") {
    return buildOutcome({
      ...base,
      outcome: "require_approval",
      rationale: "Deployment requires explicit approval when release is not in GO state.",
      linkedApprovalRequirement: {
        required: true,
        approvalCategory: "production_deploy_approval",
        reason: "Release state is not GO.",
      },
    });
  }

  if (action.actionType === "git_push") {
    if (context.hasCriticalAuditBlockers) {
      return buildOutcome({
        ...base,
        outcome: "deny_with_explanation",
        rationale: "Git push denied due to critical active audit blockers.",
        linkedApprovalRequirement: { required: false },
      });
    }

    return buildOutcome({
      ...base,
      outcome: "require_approval",
      rationale: "Git push requires explicit approval.",
      linkedApprovalRequirement: {
        required: true,
        approvalCategory: "push_approval",
        reason: "Push operations are gated by policy.",
      },
    });
  }

  if (action.actionType === "agent_triggered_command_execution" && context.commandSafetyLevel !== "safe") {
    return buildOutcome({
      ...base,
      outcome: "require_approval",
      rationale: "Agent-triggered modifying or risky command requires approval.",
      linkedApprovalRequirement: {
        required: true,
        approvalCategory: "agent_command_execution",
        reason: "Agent command safety level exceeds safe threshold.",
      },
    });
  }

  if (action.actionType === "risky_command_execution") {
    const approvalCategory = action.metadata?.category === "release" ? "production_deploy_approval" : "destructive_file_operations";
    return buildOutcome({
      ...base,
      outcome: "require_approval",
      rationale: "Risky or modifying command requires human approval before execution.",
      linkedApprovalRequirement: {
        required: true,
        approvalCategory,
        reason: "Command safety is caution/risky.",
      },
    });
  }

  if (action.actionType === "domain_assignment") {
    return buildOutcome({
      ...base,
      outcome: "allow_with_confirmation",
      rationale: "Domain assignment is allowed but requires operator confirmation.",
      linkedApprovalRequirement: {
        required: true,
        approvalCategory: "domain_assignment_approval",
        reason: "Domain assignment changes public routing.",
      },
    });
  }

  const allowOutcome: ExecutionPolicyOutcome = "allow";
  return buildOutcome({
    ...base,
    outcome: allowOutcome,
    rationale: "Action satisfies current execution policy constraints.",
    linkedApprovalRequirement: { required: false },
  });
}

export function pushPolicyDecision(state: ExecutionPolicyState, decision: ExecutionPolicyDecision): ExecutionPolicyState {
  return {
    lastDecision: decision,
    recentDecisions: [decision, ...state.recentDecisions].slice(0, MAX_POLICY_HISTORY),
  };
}
