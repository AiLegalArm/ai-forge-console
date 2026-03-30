import { describe, expect, it } from "vitest";
import { runMainChatOrchestrator } from "@/lib/main-chat-orchestrator";
import { activeAgents } from "@/data/mock-chat";
import { workflowState } from "@/data/mock-workflow";

describe("runMainChatOrchestrator", () => {
  it("creates a task, subtasks, delegations, and task graph for actionable main chat tasks", () => {
    const result = runMainChatOrchestrator({
      message: "Build a deployment dashboard with release blockers and an approvals timeline.",
      sessionId: "main-session-1",
      chatId: "main-session-1",
      workflow: workflowState,
      agents: activeAgents,
      nowIso: "2026-03-30T12:00:00.000Z",
    });

    expect(result.handled).toBe(true);
    expect(result.updatedWorkflow.tasks.length).toBe(workflowState.tasks.length + 1);
    expect(result.updatedWorkflow.subtasks.length).toBe(workflowState.subtasks.length + 4);
    expect(result.updatedWorkflow.delegations.length).toBe(workflowState.delegations.length + 4);
    expect(result.updatedWorkflow.taskGraphs.length).toBe(workflowState.taskGraphs.length + 1);
    expect(result.response).toContain("Task accepted and orchestrated");
    expect(result.triggers).toHaveLength(2);
  });

  it("does not orchestrate non-task chatter", () => {
    const result = runMainChatOrchestrator({
      message: "Thanks, looks good.",
      sessionId: "main-session-1",
      chatId: "main-session-1",
      workflow: workflowState,
      agents: activeAgents,
      nowIso: "2026-03-30T12:00:00.000Z",
    });

    expect(result.handled).toBe(false);
    expect(result.updatedWorkflow).toBe(workflowState);
    expect(result.triggers).toHaveLength(0);
  });
});
