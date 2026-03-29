import { describe, expect, it } from "vitest";

import { clineAdapter } from "@/lib/agent-backends/adapters/cline-adapter";

describe("clineAdapter", () => {
  it("returns ready availability with Cline metadata", async () => {
    const availability = await clineAdapter.getAvailability();

    expect(availability.installed).toBe(true);
    expect(availability.configured).toBe(true);
    expect(availability.status).toBe("ready");
    expect(availability.health).toBe("healthy");
    expect(availability.preferenceCandidateFor?.length).toBeGreaterThan(0);
  });

  it("supports session, task lifecycle events, and result retrieval", async () => {
    const session = await clineAdapter.createSession({ taskId: "task-cline-1", chatSessionId: "chat-cline-1" });

    const run = await clineAdapter.submitTask(session.id, {
      taskId: "task-cline-1",
      title: "Integrate Cline backend",
      prompt: "Implement Cline adapter on top of shared contract",
      linked: { taskId: "task-cline-1", chatSessionId: "chat-cline-1", chatMessageId: "msg-1" },
    });

    expect(run.status).toBe("completed");

    const events = await clineAdapter.listEvents(session.id);
    expect(events.events.some((event) => event.type === "run.progress")).toBe(true);
    expect(events.events.some((event) => event.type === "run.result")).toBe(true);

    const result = await clineAdapter.getRunResult(run.id);
    expect(result?.status).toBe("completed");
    expect(result?.linked?.chatMessageId).toBe("msg-1");
  });

  it("supports cancellation readiness", async () => {
    const session = await clineAdapter.createSession({ taskId: "task-cline-cancel" });
    const run = await clineAdapter.submitTask(session.id, {
      taskId: "task-cline-cancel",
      title: "Long task",
      prompt: "Keep running",
      metadata: { simulateState: "running" },
    });

    expect(run.status).toBe("running");

    const cancellation = await clineAdapter.cancelRun(run.id, "user cancelled");
    expect(cancellation.reason).toBe("user cancelled");

    const result = await clineAdapter.getRunResult(run.id);
    expect(result?.status).toBe("cancelled");
  });
});
