import { describe, expect, it } from "vitest";
import { BrowserAutomationService, type BrowserAdapterSession, type BrowserAutomationAdapter } from "@/lib/browser-automation-service";
import type { BrowserScenario, BrowserScenarioStep } from "@/types/agents";

const baseScenario: BrowserScenario = {
  id: "scenario-test",
  title: "Scenario",
  targetUrl: "https://example.test",
  steps: [
    { id: "step-1", label: "Open", expected: "Open app", status: "pending" },
    { id: "step-2", label: "Submit", expected: "Submit works", status: "pending" },
  ],
};

function makeAdapter(executeStep: BrowserAutomationAdapter["executeStep"]): BrowserAutomationAdapter {
  return {
    createSession: async () => ({ externalSessionId: "real-session" }),
    executeStep,
    terminateSession: async (_session: BrowserAdapterSession) => undefined,
  };
}

describe("BrowserAutomationService", () => {
  it("tracks passed scenario steps", async () => {
    const service = new BrowserAutomationService(
      makeAdapter(async (_session, step: BrowserScenarioStep) => ({
        status: "passed",
        note: `${step.label} ok`,
        durationMs: 20,
      })),
    );

    const output = await service.executeScenario({ scenario: baseScenario, linkedTaskId: "task-1", linkedChatId: "chat-1" });

    expect(output.session.resultState).toBe("passed");
    expect(output.session.scenario.steps.every((step) => step.status === "passed")).toBe(true);
    expect(output.events.some((event) => event.status === "run_completed")).toBe(true);
  });

  it("captures failure and screenshot evidence", async () => {
    const service = new BrowserAutomationService(
      makeAdapter(async (_session, step: BrowserScenarioStep) => {
        if (step.id === "step-2") {
          return {
            status: "failed",
            note: "Target not reachable",
            screenshotUri: "artifact://browser/failure.png",
          };
        }

        return { status: "passed" };
      }),
    );

    const output = await service.executeScenario({ scenario: baseScenario });

    expect(output.session.resultState).toBe("failed");
    expect(output.session.failureState.state).toBe("failed");
    expect(output.evidence.some((item) => item.kind === "screenshot")).toBe(true);
    expect(output.evidence.some((item) => item.kind === "step_failure")).toBe(true);
    expect(output.events.some((event) => event.status === "step_failed")).toBe(true);
    expect(output.events.some((event) => event.status === "evidence_captured")).toBe(true);
  });

  it("marks timed out steps as scenario timeout failures", async () => {
    const service = new BrowserAutomationService(
      makeAdapter(async () => {
        await new Promise((resolve) => setTimeout(resolve, 35));
        return { status: "passed" };
      }),
    );

    const output = await service.executeScenario({ scenario: baseScenario, timeoutMs: 10 });

    expect(output.session.resultState).toBe("error");
    expect(output.session.failureState.reason).toBe("scenario_timeout");
    expect(output.events.some((event) => event.status === "session_failed")).toBe(true);
  });
});
