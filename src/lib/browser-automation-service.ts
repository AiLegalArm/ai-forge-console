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

export interface BrowserAutomationAdapter {
  runScenario: (scenario: BrowserScenario) => Promise<{
    consoleSummary: string[];
    networkSummary: string[];
    screenshotUris: string[];
    stepResults: Array<{ stepId: string; passed: boolean; note?: string }>;
    consoleIssues?: string[];
    networkIssues?: string[];
    uiFindings?: string[];
    failure?: { code: BrowserFailureCode; message: string; stepId?: string; retryable?: boolean };
  }>;
}

const now = () => new Date().toISOString();

const makeLog = (status: BrowserExecutionResult["status"], summary: string): BrowserExecutionResult => ({
  status,
  summary,
  timestampIso: now(),
});

const makeFailure = (failure: NonNullable<Awaited<ReturnType<BrowserAutomationAdapter["runScenario"]>>["failure"]>): BrowserFailureState => ({
  code: failure.code,
  message: failure.message,
  stepId: failure.stepId,
  retryable: failure.retryable ?? false,
  timestampIso: now(),
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
      sessionState: "ready",
      resultState: "unknown",
      runState: "queued",
      scenario: input.scenario,
      consoleSummary: [],
      networkSummary: [],
      screenshotReferences: [],
      evidenceReferences: [],
      findings: [],
      executionLog: [makeLog("session_created", `Browser session ${input.sessionId} created.`)],
      createdAtIso: ts,
      updatedAtIso: ts,
    };
  }

  async executeScenario(session: BrowserSession): Promise<BrowserScenarioExecutionOutcome> {
    const startedAt = now();
    const workingSteps = session.scenario.steps.map((step) => ({ ...step, status: "pending" as const, evidenceIds: [] }));
    const runResult = await this.adapter.runScenario({ ...session.scenario, status: "running", passFail: "unknown", steps: workingSteps });

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

    const updatedSteps = workingSteps.map((step) => {
      const result = runResult.stepResults.find((entry) => entry.stepId === step.id);
      if (!result) return step;
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

    const failed = runResult.failure || updatedSteps.some((step) => step.status === "failed");
    const failureState = runResult.failure ? makeFailure(runResult.failure) : undefined;
    const finishedAt = now();

    const resultSession: BrowserSession = {
      ...session,
      currentStepId: updatedSteps.find((step) => step.status === "failed")?.id,
      sessionState: failureState?.code === "session_interrupted" ? "interrupted" : "ready",
      resultState: failureState?.code === "scenario_timeout" ? "timeout" : failed ? "failed" : "passed",
      runState: failed ? "failed" : "completed",
      scenario: {
        ...session.scenario,
        status: failed ? "failed" : "passed",
        passFail: failed ? "fail" : "pass",
        steps: updatedSteps,
        linkedEvidenceIds: evidences.map((entry) => entry.id),
      },
      consoleSummary: runResult.consoleSummary,
      networkSummary: runResult.networkSummary,
      screenshotReferences: runResult.screenshotUris,
      evidenceReferences: evidences,
      findings,
      failureState,
      startedAtIso: startedAt,
      finishedAtIso: finishedAt,
      updatedAtIso: finishedAt,
      executionLog: [
        ...session.executionLog,
        makeLog("scenario_started", `Scenario ${session.scenario.id} started.`),
        ...updatedSteps.map((step) => makeLog(step.status === "passed" ? "step_passed" : "step_failed", `${step.label}: ${step.status}`)),
        makeLog("evidence_captured", `Captured ${evidences.length} evidence records.`),
        makeLog("scenario_completed", failed ? "Scenario completed with failures." : "Scenario passed."),
      ],
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
      sessionState: "terminated",
      updatedAtIso: ts,
      executionLog: [...session.executionLog, makeLog("session_terminated", `Browser session ${session.id} terminated.`)],
    };
  }
}

export function toEvidenceRecords(session: BrowserSession): EvidenceRecord[] {
  return session.evidenceReferences.map((evidence) => ({
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
      failure: failStep
        ? {
            code: "step_failure" as const,
            message: "Scenario failed at invite submit step.",
            stepId: failStep.id,
            retryable: true,
          }
        : undefined,
    };
  }
}
