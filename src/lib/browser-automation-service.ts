import type {
  BrowserConsoleEvent,
  BrowserEvidenceCapture,
  BrowserExecutionResult,
  BrowserFailureState,
  BrowserNetworkEvent,
  BrowserScenario,
  BrowserScenarioStep,
  BrowserSession,
  BrowserSessionRuntimeState,
  BrowserSessionState,
  BrowserSessionSummary,
} from "@/types/agents";

interface AdapterExecutionStepResult {
  status: "passed" | "failed";
  note?: string;
  screenshotUri?: string;
  consoleEvents?: BrowserConsoleEvent[];
  networkEvents?: BrowserNetworkEvent[];
  uiFindings?: string[];
  durationMs?: number;
}

export interface BrowserAdapterSession {
  externalSessionId: string;
  summary?: string;
}

export interface BrowserAutomationAdapter {
  createSession: (scenario: BrowserScenario) => Promise<BrowserAdapterSession>;
  executeStep: (session: BrowserAdapterSession, step: BrowserScenarioStep, timeoutMs: number) => Promise<AdapterExecutionStepResult>;
  terminateSession: (session: BrowserAdapterSession) => Promise<void>;
}

export interface BrowserScenarioExecutionInput {
  scenario: BrowserScenario;
  linkedTaskId?: string;
  linkedChatId?: string;
  timeoutMs?: number;
}

export interface BrowserScenarioExecutionOutput {
  session: BrowserSession;
  events: BrowserExecutionResult[];
  evidence: BrowserEvidenceCapture[];
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createExecutionEvent(
  status: BrowserExecutionResult["status"],
  summary: string,
  sessionId: string,
  stepId?: string,
): BrowserExecutionResult {
  return {
    id: makeId("browser_evt"),
    status,
    summary,
    sessionId,
    stepId,
    timestampIso: nowIso(),
  };
}

function normalizeFailure(reason: string): BrowserFailureState["reason"] {
  if (reason.includes("launch")) return "launch_failure";
  if (reason.includes("timeout")) return "scenario_timeout";
  if (reason.includes("network") || reason.includes("reachable")) return "target_unreachable";
  if (reason.includes("interrupt")) return "session_interrupted";
  if (reason.includes("evidence")) return "evidence_capture_failure";
  return "step_failure";
}

function makeEvidenceId(sessionId: string, kind: BrowserEvidenceCapture["kind"]) {
  return `ev-browser-${kind}-${sessionId}-${Math.random().toString(36).slice(2, 6)}`;
}

function toSessionState(runtimeState: BrowserSessionRuntimeState): BrowserSessionState {
  switch (runtimeState) {
    case "launching":
      return "queued";
    case "executing":
      return "active";
    case "terminated":
      return "terminated";
    case "failed":
      return "failed";
    case "completed":
      return "completed";
    default:
      return "created";
  }
}

function sessionSummary(scenario: BrowserScenario, status: BrowserSessionSummary["resultState"], failures: number): BrowserSessionSummary {
  return {
    scenarioId: scenario.id,
    title: scenario.title,
    totalSteps: scenario.steps.length,
    failedSteps: failures,
    resultState: status,
  };
}

export class BrowserAutomationService {
  constructor(private readonly adapter: BrowserAutomationAdapter) {}

  async executeScenario(input: BrowserScenarioExecutionInput): Promise<BrowserScenarioExecutionOutput> {
    const startedAt = nowIso();
    const sessionId = makeId("browser_session");
    const timeoutMs = input.timeoutMs ?? 30_000;

    const scenario: BrowserScenario = {
      ...input.scenario,
      currentStatus: "running",
      passFail: "pending",
      linkedEvidenceIds: [],
      updatedAtIso: startedAt,
      steps: input.scenario.steps.map((step) => ({
        ...step,
        status: "pending",
      })),
    };

    const events: BrowserExecutionResult[] = [
      createExecutionEvent("scenario_started", `Started scenario: ${scenario.title}`, sessionId),
    ];

    const evidence: BrowserEvidenceCapture[] = [];
    const screenshots: string[] = [];
    const consoleEvents: BrowserConsoleEvent[] = [];
    const networkEvents: BrowserNetworkEvent[] = [];

    let adapterSession: BrowserAdapterSession | null = null;
    let runtimeState: BrowserSessionRuntimeState = "launching";
    let currentStepId: string | undefined;
    let failureState: BrowserFailureState = { state: "none" };

    try {
      adapterSession = await this.adapter.createSession(scenario);
      runtimeState = "executing";

      for (const step of scenario.steps) {
        currentStepId = step.id;
        const result = await this.adapter.executeStep(adapterSession, step, timeoutMs);

        const updatedStep: BrowserScenarioStep = {
          ...step,
          status: result.status,
          resultNote: result.note,
          durationMs: result.durationMs,
        };

        if (result.screenshotUri) {
          screenshots.push(result.screenshotUri);
          const stepEvidenceId = makeEvidenceId(sessionId, "screenshot");
          updatedStep.evidenceIds = [...(updatedStep.evidenceIds ?? []), stepEvidenceId];
          evidence.push({
            id: stepEvidenceId,
            sessionId,
            scenarioId: scenario.id,
            stepId: step.id,
            kind: "screenshot",
            title: `Screenshot: ${step.label}`,
            summary: result.status === "failed" ? "Failure screenshot captured" : "Step screenshot captured",
            createdAtIso: nowIso(),
            uri: result.screenshotUri,
            blocking: result.status === "failed",
          });
        }

        for (const item of result.consoleEvents ?? []) {
          consoleEvents.push(item);
        }

        for (const item of result.networkEvents ?? []) {
          networkEvents.push(item);
        }

        scenario.steps = scenario.steps.map((existing) => (existing.id === step.id ? updatedStep : existing));
        scenario.currentStepId = step.id;

        if (result.status === "failed") {
          events.push(createExecutionEvent("step_failed", `Step failed: ${step.label}`, sessionId, step.id));
          failureState = {
            state: "failed",
            reason: "step_failure",
            message: result.note ?? `Step failed: ${step.label}`,
            failedStepId: step.id,
            occurredAtIso: nowIso(),
          };
          runtimeState = "failed";
          break;
        }

        events.push(createExecutionEvent("step_passed", `Step passed: ${step.label}`, sessionId, step.id));
      }

      const scenarioFailed = scenario.steps.some((step) => step.status === "failed");
      const resultState = scenarioFailed ? "failed" : "passed";
      scenario.passFail = resultState;
      scenario.currentStatus = resultState;
      scenario.updatedAtIso = nowIso();

      if (!scenarioFailed && runtimeState !== "failed") {
        runtimeState = "completed";
      }

      if (consoleEvents.length > 0) {
        const evidenceId = makeEvidenceId(sessionId, "console_issue");
        evidence.push({
          id: evidenceId,
          sessionId,
          scenarioId: scenario.id,
          kind: "console_issue",
          title: "Browser console summary",
          summary: `${consoleEvents.length} console events captured`,
          createdAtIso: nowIso(),
          blocking: consoleEvents.some((event) => event.level === "error"),
          details: consoleEvents.map((event) => `${event.level}: ${event.message}`),
        });
      }

      if (networkEvents.length > 0) {
        const evidenceId = makeEvidenceId(sessionId, "network_issue");
        evidence.push({
          id: evidenceId,
          sessionId,
          scenarioId: scenario.id,
          kind: "network_issue",
          title: "Browser network summary",
          summary: `${networkEvents.length} network events captured`,
          createdAtIso: nowIso(),
          blocking: networkEvents.some((event) => event.statusCode >= 400),
          details: networkEvents.map((event) => `${event.method} ${event.url} → ${event.statusCode}`),
        });
      }

      const summaryEvidenceId = makeEvidenceId(sessionId, "scenario_summary");
      evidence.push({
        id: summaryEvidenceId,
        sessionId,
        scenarioId: scenario.id,
        kind: "scenario_summary",
        title: `Scenario summary: ${scenario.title}`,
        summary: scenarioFailed ? "Scenario failed and needs review" : "Scenario passed",
        createdAtIso: nowIso(),
        blocking: scenarioFailed,
        details: scenario.steps.map((step) => `${step.label}: ${step.status}`),
      });

      events.push(
        createExecutionEvent(
          "run_completed",
          scenarioFailed ? "Scenario completed with failures" : "Scenario completed successfully",
          sessionId,
        ),
      );

      return {
        session: {
          id: sessionId,
          linkedTaskId: input.linkedTaskId,
          linkedChatId: input.linkedChatId,
          linkedScenarioId: scenario.id,
          runtimeState,
          sessionState: toSessionState(runtimeState),
          resultState,
          currentStepId,
          scenario,
          consoleEvents,
          networkEvents,
          screenshotReferences: screenshots,
          evidenceReferences: evidence.map((item) => item.id),
          failureState,
          executionLog: events,
          summary: sessionSummary(scenario, resultState, scenario.steps.filter((step) => step.status === "failed").length),
          createdAtIso: startedAt,
          updatedAtIso: nowIso(),
          endedAtIso: nowIso(),
        },
        events,
        evidence,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runtimeState = "failed";
      failureState = {
        state: "failed",
        reason: normalizeFailure(message),
        message,
        failedStepId: currentStepId,
        occurredAtIso: nowIso(),
      };

      events.push(createExecutionEvent("session_failed", `Browser run failed: ${message}`, sessionId, currentStepId));

      return {
        session: {
          id: sessionId,
          linkedTaskId: input.linkedTaskId,
          linkedChatId: input.linkedChatId,
          linkedScenarioId: scenario.id,
          runtimeState,
          sessionState: "failed",
          resultState: "error",
          currentStepId,
          scenario: {
            ...scenario,
            currentStatus: "failed",
            passFail: "failed",
            updatedAtIso: nowIso(),
          },
          consoleEvents,
          networkEvents,
          screenshotReferences: screenshots,
          evidenceReferences: evidence.map((item) => item.id),
          failureState,
          executionLog: events,
          summary: sessionSummary(scenario, "error", 1),
          createdAtIso: startedAt,
          updatedAtIso: nowIso(),
          endedAtIso: nowIso(),
        },
        events,
        evidence,
      };
    } finally {
      if (adapterSession) {
        await this.adapter.terminateSession(adapterSession);
      }
    }
  }
}

export class RuntimeBridgeBrowserAdapter implements BrowserAutomationAdapter {
  private async resolveBridge() {
    const candidate = globalThis as {
      aiForgeBrowserAutomation?: {
        createSession: BrowserAutomationAdapter["createSession"];
        executeStep: BrowserAutomationAdapter["executeStep"];
        terminateSession: BrowserAutomationAdapter["terminateSession"];
      };
    };

    if (!candidate.aiForgeBrowserAutomation) {
      throw new Error("browser launch failure: runtime bridge unavailable");
    }

    return candidate.aiForgeBrowserAutomation;
  }

  async createSession(scenario: BrowserScenario): Promise<BrowserAdapterSession> {
    const bridge = await this.resolveBridge();
    return bridge.createSession(scenario);
  }

  async executeStep(session: BrowserAdapterSession, step: BrowserScenarioStep, timeoutMs: number): Promise<AdapterExecutionStepResult> {
    const bridge = await this.resolveBridge();
    return bridge.executeStep(session, step, timeoutMs);
  }

  async terminateSession(session: BrowserAdapterSession): Promise<void> {
    const bridge = await this.resolveBridge();
    await bridge.terminateSession(session);
  }
}
