import { describe, expect, it } from "vitest";

import { claudeCodeAdapter } from "@/lib/agent-backends/adapters/claude-code-adapter";

describe("claudeCodeAdapter", () => {
  it("returns availability mapped from Claude backend readiness", async () => {
    const availability = await claudeCodeAdapter.getAvailability();

    expect(availability.installed).toBe(true);
    expect(availability.configured).toBe(true);
    expect(availability.status).toBe("ready");
    expect(availability.health).toBe("healthy");
  });

  it("creates a session, submits a task, and returns lifecycle events", async () => {
    const session = await claudeCodeAdapter.createSession({ taskId: "task-1", chatSessionId: "chat-1" });

    const run = await claudeCodeAdapter.submitTask(session.id, {
      taskId: "task-1",
      title: "Build adapter",
      prompt: "Implement Claude Code adapter foundations",
      linked: { taskId: "task-1", chatSessionId: "chat-1" },
    });

    const result = await claudeCodeAdapter.getRunResult(run.id);
    const eventResponse = await claudeCodeAdapter.listEvents(session.id);

    expect(run.status).toBe("completed");
    expect(result?.status).toBe("completed");
    expect(eventResponse.events.some((event) => event.type === "run.progress")).toBe(true);
    expect(eventResponse.events.some((event) => event.type === "run.result")).toBe(true);
  });

  it("supports cancellation readiness", async () => {
    const cancellation = await claudeCodeAdapter.cancelRun("missing-run", "user requested stop");

    expect(cancellation.runId).toBe("missing-run");
    expect(cancellation.reason).toContain("Unable to cancel unknown run");
  });
});
