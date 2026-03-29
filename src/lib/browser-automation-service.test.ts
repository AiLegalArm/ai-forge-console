import { describe, expect, it } from "vitest";
import { BrowserAutomationService, type BrowserAutomationAdapter } from "@/lib/browser-automation-service";
import type { BrowserScenario, BrowserScenarioRunResult } from "@/types/browser-automation";

const baseScenario: BrowserScenario = {
  id: "scenario-test",
  title: "Scenario",
  targetUrl: "https://example.test",
  expectedOutcome: "All steps pass",
  status: "pending",
  passFail: "unknown",
  linkedEvidenceIds: [],
  steps: [
    { id: "step-1", label: "Open", expected: "Open app", status: "pending", evidenceIds: [] },
    { id: "step-2", label: "Submit", expected: "Submit works", status: "pending", evidenceIds: [] },
  ],
};

function makeAdapter(runScenario: BrowserAutomationAdapter["runScenario"]): BrowserAutomationAdapter {
  return { runScenario };
}

describe("BrowserAutomationService", () => {
  it("tracks passed scenario steps", async () => {
    const service = new BrowserAutomationService(
      makeAdapter(async (_scenario) => ({
        consoleSummary: [],
        networkSummary: [],
        screenshotUris: [],
        stepResults: _scenario.steps.map((step) => ({
          stepId: step.id,
          passed: true,
          note: `${step.label} ok`,
        })),
      })),
    );

    const session = service.createSession({
      sessionId: "test-session",
      taskId: "task-1",
      chatSessionId: "chat-1",
      scenario: baseScenario,
    });

    const output = await service.executeScenario(session);

    expect(output.session.resultState).toBe("passed");
    expect(output.session.scenario.steps.every((step) => step.status === "passed")).toBe(true);
    expect(output.session.executionLog.some((event) => event.status === "run_completed")).toBe(true);
  });

  it("captures failure and screenshot evidence", async () => {
    const service = new BrowserAutomationService(
      makeAdapter(async (_scenario): Promise<BrowserScenarioRunResult> => ({
        consoleSummary: [],
        networkSummary: [],
        screenshotUris: ["artifact://browser/failure.png"],
        stepResults: _scenario.steps.map((step) => ({
          stepId: step.id,
          passed: step.id !== "step-2",
          note: step.id === "step-2" ? "Target not reachable" : undefined,
        })),
        failure: {
          code: "step_failure",
          message: "Target not reachable",
          stepId: "step-2",
        },
      })),
    );

    const session = service.createSession({
      sessionId: "test-session-fail",
      taskId: "task-1",
      chatSessionId: "chat-1",
      scenario: baseScenario,
    });

    const output = await service.executeScenario(session);

    expect(output.session.resultState).toBe("failed");
    expect(output.session.failureState?.state).toBe("failed");
    expect(output.evidenceRecords.some((item) => item.kind === "screenshot")).toBe(true);
    expect(output.session.executionLog.some((event) => event.status === "step_failed")).toBe(true);
  });
});
