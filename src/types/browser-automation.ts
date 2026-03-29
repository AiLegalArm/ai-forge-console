import type { FindingSeverity } from "@/types/audits";

export type BrowserRunState = "idle" | "queued" | "running" | "completed" | "failed" | "blocked";
export type BrowserSessionState = "initializing" | "ready" | "running" | "failed" | "terminating" | "terminated" | "interrupted";
export type BrowserRuntimeState = "ready" | "running" | "failed" | "terminated";
export type BrowserResultState = "unknown" | "passed" | "failed" | "partial" | "timeout";

export type BrowserFailureCode =
  | "launch_failure"
  | "scenario_timeout"
  | "step_failure"
  | "evidence_capture_failure"
  | "target_not_reachable"
  | "session_interrupted"
  | "unexpected_error";

export interface BrowserFailureState {
  state: "failed";
  reason: BrowserFailureCode;
  message: string;
  failedStepId?: string;
  occurredAtIso: string;
}

export interface BrowserScenarioStep {
  id: string;
  label: string;
  expected: string;
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  startedAtIso?: string;
  finishedAtIso?: string;
  resultNote?: string;
  evidenceIds: string[];
}

export interface BrowserScenario {
  id: string;
  title: string;
  targetUrl: string;
  expectedOutcome: string;
  steps: BrowserScenarioStep[];
  status: "pending" | "running" | "passed" | "failed";
  passFail: "unknown" | "passed" | "failed";
  linkedEvidenceIds: string[];
  updatedAtIso?: string;
}

export interface BrowserEvidenceReference {
  id: string;
  type: "screenshot" | "console" | "network" | "ui_finding" | "scenario_summary" | "step_failure";
  title: string;
  uri: string;
  linkedStepId?: string;
  createdAtIso: string;
}

export interface BrowserConsoleEvent {
  id: string;
  level: "log" | "warn" | "error";
  message: string;
  timestampIso: string;
}

export interface BrowserNetworkEvent {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  timestampIso: string;
}

export interface BrowserFinding {
  id: string;
  title: string;
  findingType: "console_issue" | "network_issue" | "ui_issue" | "scenario_failure";
  summary: string;
  severity: FindingSeverity;
  blocking: boolean;
  linkedEvidenceId?: string;
}

export interface BrowserExecutionResult {
  id: string;
  status:
    | "session_created"
    | "scenario_started"
    | "step_started"
    | "step_passed"
    | "step_failed"
    | "evidence_captured"
    | "run_completed"
    | "session_terminated";
  summary: string;
  sessionId: string;
  stepId?: string;
  timestampIso: string;
}

export interface BrowserRunSummary {
  scenarioId: string;
  title: string;
  totalSteps: number;
  failedSteps: number;
  resultState: BrowserResultState;
}

export interface BrowserSession {
  id: string;
  taskId: string;
  chatSessionId: string;
  scenarioId: string;
  currentStepId?: string;
  runState: BrowserRunState;
  sessionState: BrowserSessionState;
  runtimeState: BrowserRuntimeState;
  resultState: BrowserResultState;
  scenario: BrowserScenario;
  consoleSummary: string[];
  networkSummary: string[];
  screenshotReferences: string[];
  evidenceReferences: string[];
  evidenceCatalog: BrowserEvidenceReference[];
  consoleEvents: BrowserConsoleEvent[];
  networkEvents: BrowserNetworkEvent[];
  findings: BrowserFinding[];
  executionLog: BrowserExecutionResult[];
  failureState?: BrowserFailureState;
  summary: BrowserRunSummary;
  createdAtIso: string;
  startedAtIso?: string;
  endedAtIso?: string;
  updatedAtIso: string;
}


export interface BrowserScenarioRunResult {
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
}
