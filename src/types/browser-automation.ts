import type { FindingSeverity } from "@/types/audits";

export type BrowserSessionState = "initializing" | "ready" | "running" | "terminating" | "terminated" | "interrupted";
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
  code: BrowserFailureCode;
  message: string;
  stepId?: string;
  timestampIso: string;
  retryable: boolean;
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
  passFail: "unknown" | "pass" | "fail";
  linkedEvidenceIds: string[];
}

export interface BrowserEvidenceReference {
  id: string;
  type: "screenshot" | "console" | "network" | "ui_finding" | "scenario_summary" | "step_failure";
  title: string;
  uri: string;
  linkedStepId?: string;
  createdAtIso: string;
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
  status:
    | "session_created"
    | "scenario_started"
    | "step_started"
    | "step_passed"
    | "step_failed"
    | "evidence_captured"
    | "scenario_completed"
    | "session_terminated";
  summary: string;
  timestampIso: string;
}

export interface BrowserSession {
  id: string;
  taskId: string;
  chatSessionId: string;
  scenarioId: string;
  currentStepId?: string;
  sessionState: BrowserSessionState;
  resultState: BrowserResultState;
  runState: "idle" | "queued" | "running" | "completed" | "failed" | "blocked";
  scenario: BrowserScenario;
  consoleSummary: string[];
  networkSummary: string[];
  screenshotReferences: string[];
  evidenceReferences: BrowserEvidenceReference[];
  findings: BrowserFinding[];
  executionLog: BrowserExecutionResult[];
  failureState?: BrowserFailureState;
  createdAtIso: string;
  startedAtIso?: string;
  finishedAtIso?: string;
  updatedAtIso: string;
}
