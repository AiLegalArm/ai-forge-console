import { describe, expect, it } from "vitest";
import { openCodeAdapter } from "@/lib/agent-backends/adapters/opencode-adapter";

describe("openCodeAdapter", () => {
  it("exposes ready availability with OpenCode-specific runtime metadata", async () => {
    const availability = await openCodeAdapter.getAvailability();

    expect(availability.status).toMatch(/ready|busy/);
    expect(availability.localRuntimeAvailable).toBe(true);
    expect(availability.preferenceCandidateFor?.length).toBeGreaterThan(0);
  });

  it("creates sessions and publishes completion events", async () => {
    const session = await openCodeAdapter.createSession({ taskId: "task-001", chatSessionId: "chat-001" });
    const run = await openCodeAdapter.submitTask(session.id, {
      taskId: "task-001",
      title: "Implement adapter",
      prompt: "Wire up OpenCode adapter",
      linked: { taskId: "task-001", chatSessionId: "chat-001" },
    });

    expect(["running", "completed"]).toContain(run.status);

    const events = await openCodeAdapter.listEvents(session.id);
    expect(events.events.some((event) => event.type === "run.progress")).toBe(true);
    expect(events.events.some((event) => event.type === "run.result")).toBe(true);

    const result = await openCodeAdapter.getRunResult(run.id);
    expect(result?.status).toBe("completed");
    expect(result?.linked?.taskId).toBe("task-001");
  });

  it("supports cancellation readiness for active runs", async () => {
    const session = await openCodeAdapter.createSession();
    const run = await openCodeAdapter.submitTask(session.id, {
      taskId: "task-running",
      title: "Long task",
      prompt: "Keep running",
      metadata: { simulateState: "running" },
    });

    expect(run.status).toBe("running");

    const cancellation = await openCodeAdapter.cancelRun(run.id, "user aborted");
    expect(cancellation.reason).toBe("user aborted");

    const cancelledResult = await openCodeAdapter.getRunResult(run.id);
    expect(cancelledResult?.status).toBe("cancelled");
  });
});
