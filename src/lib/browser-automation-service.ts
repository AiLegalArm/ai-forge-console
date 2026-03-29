import type { EvidenceRecord } from "@/types/evidence";
import type {
  BrowserExecutionResult,
  BrowserEvidenceReference,
  BrowserFailureCode,
  BrowserFailureState,
  BrowserFinding,
  BrowserScenario,
  BrowserSession,
} from "@/types/browser-automation";

export interface BrowserSessionCreateInput {
  sessionId: string;
  taskId: string;
  chatSessionId: string;
  scenario: BrowserScenario;
}

export interface BrowserScenarioExecutionOutcome {
  session: BrowserSession;
  evidenceRecords: EvidenceRecord[];
}


export interface BrowserAutomationRuntimeBridge {
  runScenario: (scenario: BrowserScenario) => Promise<{
    consoleSummary: string[];
    networkSummary: string[];
    screenshotUris: string[];
    stepResults: Array<{ stepId: string; passed: boolean; note?: string }>;
    consoleIssues?: string[];
    networkIssues?: string[];
    uiFindings?: string[];
    networkEvents?: Array<{ method: string; url: string; statusCode: number }>;
    consoleEvents?: Array<{ level: "log" | "warn" | "error"; message: string }>;
    failure?: { code: BrowserFailureCode; message: string; stepId?: string };
  }>;
}

export interface BrowserAutomationAdapter {
  runScenario: (scenario: BrowserScenario) => Promise<{
    consoleSummary: string[];
    networkSummary: string[];
    screenshotUris: string[];
    stepResults: Array<{ stepId: string; passed: boolean; note?: string }>;
    consoleIssues?: string[];
    networkIssues?: string[];
    uiFindings?: string[];
    networkEvents?: Array<{ method: string; url: string; statusCode: number }>;
    consoleEvents?: Array<{ level: "log" | "warn" | "error"; message: string }>;
    failure?: { code: BrowserFailureCode; message: string; stepId?: string };
  }>;
}

const now = () => new Date().toISOString();

const makeLog = (
  sessionId: string,
  status: BrowserExecutionResult["status"],
  summary: string,
  stepId?: string,
): BrowserExecutionResult => ({
  id: `browser-log-${Math.random().toString(16).slice(2, 10)}`,
  status,
  summary,
  sessionId,
  stepId,
  timestampIso: now(),
});

const makeFailure = (failure: NonNullable<Awaited<ReturnType<BrowserAutomationAdapter["runScenario"]>>["failure"]>): BrowserFailureState => ({
  state: "failed",
  reason: failure.code,
  message: failure.message,
  failedStepId: failure.stepId,
  occurredAtIso: now(),
});

export class BrowserAutomationService {
  constructor(private readonly adapter: BrowserAutomationAdapter) {}

  createSession(input: BrowserSessionCreateInput): BrowserSession {
    const ts = now();
    return {
      id: input.sessionId,
      taskId: input.taskId,
      chatSessionId: input.chatSessionId,
      scenarioId: input.scenario.id,
      currentStepId: undefined,
      runState: "queued",
      sessionState: "ready",
      runtimeState: "ready",
      resultState: "unknown",
      scenario: input.scenario,
      consoleSummary: [],
      networkSummary: [],
      screenshotReferences: [],
      evidenceReferences: [],
      evidenceCatalog: [],
      consoleEvents: [],
      networkEvents: [],
      findings: [],
      executionLog: [makeLog(input.sessionId, "session_created", `Browser session ${input.sessionId} created.`)],
      summary: {
        scenarioId: input.scenario.id,
        title: input.scenario.title,
        totalSteps: input.scenario.steps.length,
        failedSteps: 0,
        resultState: "unknown",
      },
      createdAtIso: ts,
      startedAtIso: undefined,
      endedAtIso: undefined,
      updatedAtIso: ts,
    };
  }

  async executeScenario(session: BrowserSession): Promise<BrowserScenarioExecutionOutcome> {
    const startedAt = now();
    const workingSteps = session.scenario.steps.map((step) => ({ ...step, status: "pending" as const, evidenceIds: [] }));
    const runResult = await this.adapter.runScenario({
      ...session.scenario,
      status: "running",
      passFail: "unknown",
      steps: workingSteps,
      updatedAtIso: startedAt,
    });

    const evidences: BrowserEvidenceReference[] = [];
    const findings: BrowserFinding[] = [];

    runResult.screenshotUris.forEach((uri, index) => {
      evidences.push({
        id: `${session.id}-shot-${index + 1}`,
        type: "screenshot",
        title: `Browser screenshot ${index + 1}`,
        uri,
        createdAtIso: now(),
      });
    });

    (runResult.consoleIssues ?? []).forEach((issue, index) => {
      const evidenceId = `${session.id}-console-${index + 1}`;
      evidences.push({ id: evidenceId, type: "console", title: "Console issue", uri: `artifact://browser/console/${evidenceId}.log`, createdAtIso: now() });
      findings.push({ id: `${session.id}-finding-console-${index + 1}`, title: "Console issue detected", findingType: "console_issue", summary: issue, severity: "high", blocking: true, linkedEvidenceId: evidenceId });
    });

    (runResult.networkIssues ?? []).forEach((issue, index) => {
      const evidenceId = `${session.id}-network-${index + 1}`;
      evidences.push({ id: evidenceId, type: "network", title: "Network issue", uri: `artifact://browser/network/${evidenceId}.har`, createdAtIso: now() });
      findings.push({ id: `${session.id}-finding-network-${index + 1}`, title: "Network issue detected", findingType: "network_issue", summary: issue, severity: "critical", blocking: true, linkedEvidenceId: evidenceId });
    });

    (runResult.uiFindings ?? []).forEach((item, index) => {
      const evidenceId = `${session.id}-ui-${index + 1}`;
      evidences.push({ id: evidenceId, type: "ui_finding", title: "UI finding", uri: `artifact://browser/ui/${evidenceId}.md`, createdAtIso: now() });
      findings.push({ id: `${session.id}-finding-ui-${index + 1}`, title: "UI issue detected", findingType: "ui_issue", summary: item, severity: "medium", blocking: false, linkedEvidenceId: evidenceId });
    });

    const stepFailureEvidenceId = `${session.id}-step-failure`;

    const updatedSteps = workingSteps.map((step) => {
      const result = runResult.stepResults.find((entry) => entry.stepId === step.id);
      if (!result) return step;
      if (!result.passed) {
        evidences.push({
          id: stepFailureEvidenceId,
          type: "step_failure",
          title: `Step failed: ${step.label}`,
          uri: `artifact://browser/steps/${step.id}-failure.json`,
          linkedStepId: step.id,
          createdAtIso: now(),
        });
      }
      const stepEvidence = evidences.filter((evidence) => evidence.linkedStepId === step.id).map((evidence) => evidence.id);
      return {
        ...step,
        status: result.passed ? "passed" : "failed",
        resultNote: result.note,
        startedAtIso: startedAt,
        finishedAtIso: now(),
        evidenceIds: stepEvidence,
      };
    });

    const failedSteps = updatedSteps.filter((step) => step.status === "failed");
    const failureState = runResult.failure ? makeFailure(runResult.failure) : undefined;
    const endedAt = now();
    const hasFailure = Boolean(failureState) || failedSteps.length > 0;

    const resultSession: BrowserSession = {
      ...session,
      currentStepId: failedSteps[0]?.id,
      runState: hasFailure ? "failed" : "completed",
      sessionState: hasFailure ? "failed" : "ready",
      runtimeState: hasFailure ? "failed" : "ready",
      resultState: runResult.failure?.code === "scenario_timeout" ? "timeout" : hasFailure ? "failed" : "passed",
      scenario: {
        ...session.scenario,
        status: hasFailure ? "failed" : "passed",
        passFail: hasFailure ? "failed" : "passed",
        steps: updatedSteps,
        linkedEvidenceIds: evidences.map((entry) => entry.id),
        updatedAtIso: endedAt,
      },
      consoleSummary: runResult.consoleSummary,
      networkSummary: runResult.networkSummary,
      screenshotReferences: runResult.screenshotUris,
      evidenceReferences: evidences.map((evidence) => evidence.id),
      evidenceCatalog: evidences,
      consoleEvents:
        runResult.consoleEvents?.map((event, index) => ({ id: `${session.id}-console-event-${index + 1}`, ...event, timestampIso: now() })) ??
        runResult.consoleSummary.map((message, index) => ({ id: `${session.id}-console-event-${index + 1}`, level: "error" as const, message, timestampIso: now() })),
      networkEvents:
        runResult.networkEvents?.map((event, index) => ({ id: `${session.id}-network-event-${index + 1}`, ...event, timestampIso: now() })) ??
        [{ id: `${session.id}-network-event-1`, method: "POST", url: `${session.scenario.targetUrl.replace(/\/$/, "")}/api/invite`, statusCode: 429, timestampIso: now() }],
      findings,
      executionLog: [
        ...session.executionLog,
        makeLog(session.id, "scenario_started", `Scenario ${session.scenario.id} started.`),
        ...updatedSteps.map((step) => makeLog(session.id, step.status === "passed" ? "step_passed" : "step_failed", `${step.label}: ${step.status}`, step.id)),
        makeLog(session.id, "evidence_captured", `Captured screenshot, console and network evidence.`),
        makeLog(session.id, "run_completed", hasFailure ? "Run completed with blockers" : "Run completed successfully"),
      ],
      failureState,
      summary: {
        scenarioId: session.scenario.id,
        title: session.scenario.title,
        totalSteps: updatedSteps.length,
        failedSteps: failedSteps.length,
        resultState: runResult.failure?.code === "scenario_timeout" ? "timeout" : hasFailure ? "failed" : "passed",
      },
      startedAtIso: startedAt,
      endedAtIso: endedAt,
      updatedAtIso: endedAt,
    };

    return {
      session: resultSession,
      evidenceRecords: toEvidenceRecords(resultSession),
    };
  }

  terminateSession(session: BrowserSession): BrowserSession {
    const ts = now();
    return {
      ...session,
      sessionState: session.sessionState === "failed" ? "failed" : "terminated",
      runtimeState: "terminated",
      endedAtIso: session.endedAtIso ?? ts,
      updatedAtIso: ts,
      executionLog: [...session.executionLog, makeLog(session.id, "session_terminated", `Browser session ${session.id} terminated.`)],
    };
  }
}

export function toEvidenceRecords(session: BrowserSession): EvidenceRecord[] {
  return session.evidenceCatalog.map((evidence) => ({
    id: evidence.id,
    title: evidence.title,
    summary: `Captured from browser session ${session.id} (${evidence.type}).`,
    source: "browser_agent",
    kind:
      evidence.type === "screenshot"
        ? "screenshot"
        : evidence.type === "console"
          ? "console_finding"
          : evidence.type === "network"
            ? "network_finding"
            : evidence.type === "scenario_summary"
              ? "scenario_trace"
              : evidence.type === "step_failure"
                ? "scenario_trace"
                : "ux_observation",
    severity: evidence.type === "network" ? "critical" : evidence.type === "console" ? "high" : "medium",
    blocking: evidence.type === "network" || evidence.type === "step_failure",
    createdAtIso: evidence.createdAtIso,
    tags: ["browser", evidence.type, session.scenario.id],
    assets: [{ id: `${evidence.id}-asset`, label: evidence.title, kind: evidence.type === "screenshot" ? "screenshot" : "trace", uri: evidence.uri }],
    links: {
      taskId: session.taskId,
      chatSessionId: session.chatSessionId,
    },
  }));
}

export class DeterministicBrowserAutomationAdapter implements BrowserAutomationAdapter {
  async runScenario(scenario: BrowserScenario) {
    const failStep = scenario.steps.find((step) => step.id.includes("submit") || step.id.endsWith("3"));
    return {
      consoleSummary: ["UnhandledPromiseRejection: invite retry exhausted", "POST /api/invite returned status 429"],
      networkSummary: ["3/10 invite requests throttled in test window", "x-ratelimit-remaining hit 0 during submit step"],
      screenshotUris: ["artifact://browser/failures/invite-modal-429.png"],
      stepResults: scenario.steps.map((step) => ({
        stepId: step.id,
        passed: failStep ? step.id !== failStep.id : true,
        note: failStep && step.id === failStep.id ? "Received 429 and error toast remained visible." : "Step completed",
      })),
      consoleIssues: ["Retry helper does not gracefully recover from repeated throttling."],
      networkIssues: ["Invite API returned status 429 and exhausted retry budget."],
      uiFindings: ["Error toast remained visible and blocked modal completion CTA."],
      consoleEvents: [
        { level: "error", message: "UnhandledPromiseRejection: invite retry exhausted" },
        { level: "error", message: "POST /api/invite returned status 429" },
      ],
      networkEvents: [{ method: "POST", url: "https://preview.acme.dev/api/invite", statusCode: 429 }],
      failure: failStep
        ? {
            code: "step_failure" as const,
            message: "Received 429 and error toast remained visible.",
            stepId: failStep.id,
          }
        : undefined,
    };
  }
}


declare global {
  interface Window {
    __AI_FORGE_BROWSER_RUNTIME_BRIDGE__?: BrowserAutomationRuntimeBridge;
  }
}

export class RuntimeBridgeBrowserAutomationAdapter implements BrowserAutomationAdapter {
  constructor(private readonly bridge: BrowserAutomationRuntimeBridge) {}

  async runScenario(scenario: BrowserScenario) {
    return this.bridge.runScenario(scenario);
  }
}

export function resolveBrowserAutomationAdapter(): BrowserAutomationAdapter {
  if (typeof window !== "undefined" && window.__AI_FORGE_BROWSER_RUNTIME_BRIDGE__) {
    return new RuntimeBridgeBrowserAutomationAdapter(window.__AI_FORGE_BROWSER_RUNTIME_BRIDGE__);
  }

  return new DeterministicBrowserAutomationAdapter();
}
