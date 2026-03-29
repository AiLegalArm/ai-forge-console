import type { FindingSeverity } from "@/types/audits";

export type DesignState = "drafting" | "proposed" | "review_needed" | "approved" | "blocked";

export interface DesignBrief {
  id: string;
  title: string;
  goals: string[];
  constraints: string[];
  targetScreen: string;
}

export interface LayoutProposal {
  id: string;
  pageStructure: string[];
  componentInventory: string[];
  statesAndVariants: string[];
}

export interface ComponentMapEntry {
  id: string;
  componentName: string;
  purpose: string;
  states: string[];
  linkedTaskId?: string;
}

export interface TokenHandoffSummary {
  designTokens: string[];
  handoffNotes: string[];
}

export interface DesignFinding {
  id: string;
  title: string;
  concern: string;
  severity: FindingSeverity;
  blocking: boolean;
  linkedEvidenceId?: string;
}

export interface DesignSession {
  id: string;
  state: DesignState;
  brief: DesignBrief;
  layoutProposal: LayoutProposal;
  componentMap: ComponentMapEntry[];
  tokenHandoff: TokenHandoffSummary;
  findings: DesignFinding[];
  updatedAtIso: string;
}

export type BrowserRunState = "idle" | "queued" | "running" | "completed" | "failed" | "blocked";

export type BrowserSessionRuntimeState = "created" | "launching" | "executing" | "completed" | "failed" | "terminated";

export type BrowserSessionState = "created" | "queued" | "active" | "completed" | "failed" | "terminated";

export type BrowserResultState = "pending" | "passed" | "failed" | "error";

export interface BrowserFailureState {
  state: "none" | "failed";
  reason?:
    | "launch_failure"
    | "scenario_timeout"
    | "step_failure"
    | "target_unreachable"
    | "session_interrupted"
    | "evidence_capture_failure";
  message?: string;
  failedStepId?: string;
  occurredAtIso?: string;
}

export interface BrowserConsoleEvent {
  id: string;
  level: "log" | "warning" | "error";
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

export interface BrowserScenarioStep {
  id: string;
  label: string;
  expected: string;
  status: "pending" | "passed" | "failed";
  resultNote?: string;
  durationMs?: number;
  evidenceIds?: string[];
}

export interface BrowserScenario {
  id: string;
  title: string;
  targetUrl: string;
  steps: BrowserScenarioStep[];
  expectedOutcome?: string;
  currentStatus?: "idle" | "running" | "passed" | "failed";
  passFail?: "pending" | "passed" | "failed";
  linkedEvidenceIds?: string[];
  updatedAtIso?: string;
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
  status: "scenario_started" | "step_passed" | "step_failed" | "evidence_captured" | "run_completed" | "session_failed";
  summary: string;
  sessionId: string;
  stepId?: string;
  timestampIso: string;
}

export interface BrowserEvidenceCapture {
  id: string;
  sessionId: string;
  scenarioId: string;
  stepId?: string;
  kind: "screenshot" | "step_failure" | "console_issue" | "network_issue" | "ui_finding" | "scenario_summary";
  title: string;
  summary: string;
  createdAtIso: string;
  uri?: string;
  details?: string[];
  blocking: boolean;
}

export interface BrowserSessionSummary {
  scenarioId: string;
  title: string;
  totalSteps: number;
  failedSteps: number;
  resultState: BrowserResultState;
}

export interface BrowserSession {
  id: string;
  linkedTaskId?: string;
  linkedChatId?: string;
  linkedScenarioId?: string;
  runState: BrowserRunState;
  runtimeState: BrowserSessionRuntimeState;
  sessionState: BrowserSessionState;
  resultState: BrowserResultState;
  currentStepId?: string;
  scenario: BrowserScenario;
  consoleSummary: string[];
  networkSummary: string[];
  consoleEvents: BrowserConsoleEvent[];
  networkEvents: BrowserNetworkEvent[];
  screenshotReferences: string[];
  evidenceReferences: string[];
  findings: BrowserFinding[];
  executionLog: BrowserExecutionResult[];
  failureState: BrowserFailureState;
  summary: BrowserSessionSummary;
  createdAtIso: string;
  updatedAtIso: string;
  endedAtIso?: string;
}
