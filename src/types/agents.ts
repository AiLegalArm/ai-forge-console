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

export interface BrowserScenarioStep {
  id: string;
  label: string;
  expected: string;
  status: "pending" | "passed" | "failed";
  resultNote?: string;
  evidenceIds?: string[];
}

export interface BrowserScenario {
  id: string;
  title: string;
  targetUrl: string;
  steps: BrowserScenarioStep[];
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
  status: "scenario_started" | "step_passed" | "step_failed" | "evidence_captured" | "run_completed";
  summary: string;
  timestampIso: string;
}

export interface BrowserSession {
  id: string;
  runState: BrowserRunState;
  scenario: BrowserScenario;
  consoleSummary: string[];
  networkSummary: string[];
  screenshotReferences: string[];
  findings: BrowserFinding[];
  executionLog: BrowserExecutionResult[];
  updatedAtIso: string;
}
