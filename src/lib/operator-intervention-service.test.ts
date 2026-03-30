import { describe, expect, it } from "vitest";
import { applyOperatorIntervention } from "@/lib/operator-intervention-service";
import { workflowState } from "@/data/mock-workflow";

describe("operator intervention service", () => {
  it("reassigns a subtask and records intervention + activity", () => {
    const subtask = workflowState.subtasks[0];
    const result = applyOperatorIntervention(workflowState, {
      type: "reassign_subtask",
      projectId: "project-local-1",
      taskId: subtask.parentTaskId,
      subtaskId: subtask.id,
      reason: "Recover execution with backend specialist",
      targetAgentId: "agent-backend",
      confirmedByOperator: true,
      actor: {
        operatorId: "operator-local-1",
        operatorLabel: "Operator",
        mode: "operator",
      },
    });

    expect(result.workflow.subtasks.find((entry) => entry.id === subtask.id)?.assignedAgentId).toBe("agent-backend");
    expect(result.workflow.interventions[0]?.type).toBe("reassign_subtask");
    expect(result.workflow.activityEvents[0]?.type).toBe("operator_intervention_applied");
  });

  it("requires explicit confirmation for high-risk interventions", () => {
    const runId = workflowState.executionTraces[0]?.runId;
    const result = applyOperatorIntervention(workflowState, {
      type: "cancel_stop_run",
      projectId: "project-local-1",
      executionRunId: runId,
      reason: "Stop unstable run before more failures",
      confirmedByOperator: false,
      actor: {
        operatorId: "operator-local-1",
        operatorLabel: "Operator",
        mode: "operator",
      },
    });

    expect(result.workflow.interventions[0]?.resultState).toBe("pending_confirmation");
    expect(result.workflow.executionTraces.find((trace) => trace.runId === runId)?.status).toBe(workflowState.executionTraces[0]?.status);
  });
});
