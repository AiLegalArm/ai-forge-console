import { describe, expect, it } from "vitest";
import { evaluateExecutionPolicy } from "@/lib/execution-policy-engine";
import type { ExecutionPolicyAction, ExecutionPolicyContext } from "@/types/execution-policy";

const baseContext: ExecutionPolicyContext = {
  activeProjectId: "project-1",
  activeProjectName: "Demo",
  activeTaskId: "task-1",
  activeTaskStatus: "in_progress",
  providerSource: "ollama",
  activeModel: "qwen3-coder:14b",
  deploymentMode: "hybrid",
  localCloudMode: "hybrid",
  hasAuditBlockers: false,
  hasCriticalAuditBlockers: false,
  releaseState: "go",
  commandSafetyLevel: "safe",
  repoConnected: true,
  repoClean: true,
};

function action(actionType: ExecutionPolicyAction["actionType"]): ExecutionPolicyAction {
  return {
    actionType,
    subject: { type: "user", id: "operator" },
    target: { type: "command", id: "cmd-1" },
  };
}

describe("evaluateExecutionPolicy", () => {
  it("allows safe command execution", () => {
    const decision = evaluateExecutionPolicy(action("safe_command_execution"), baseContext);
    expect(decision.outcome).toBe("allow");
    expect(decision.isAllowed).toBe(true);
    expect(decision.requiresApproval).toBe(false);
  });

  it("requires approval for risky command execution", () => {
    const decision = evaluateExecutionPolicy(
      { ...action("risky_command_execution"), commandSafetyLevel: "risky", metadata: { category: "build" } },
      { ...baseContext, commandSafetyLevel: "risky" },
    );
    expect(decision.outcome).toBe("require_approval");
    expect(decision.linkedApprovalRequirement?.approvalCategory).toBe("destructive_file_operations");
  });

  it("denies cloud execution in local-only mode", () => {
    const decision = evaluateExecutionPolicy(action("cloud_execution"), { ...baseContext, localCloudMode: "local" });
    expect(decision.outcome).toBe("deny_with_explanation");
    expect(decision.blocked).toBe(true);
  });

  it("denies release approval with critical blockers", () => {
    const decision = evaluateExecutionPolicy(action("release_approval"), { ...baseContext, hasCriticalAuditBlockers: true });
    expect(decision.outcome).toBe("deny_with_explanation");
    expect(decision.isAllowed).toBe(false);
  });
});
