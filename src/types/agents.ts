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

export type {
  BrowserSession,
  BrowserScenario,
  BrowserScenarioStep,
  BrowserConsoleEvent,
  BrowserNetworkEvent,
  BrowserFinding,
  BrowserExecutionResult,
  BrowserRunState,
  BrowserSessionState,
  BrowserResultState,
  BrowserFailureState,
  BrowserEvidenceReference,
  BrowserRunSummary,
  BrowserScenarioRunResult,
  BrowserRuntimeState,
  BrowserFailureCode,
} from "@/types/browser-automation";
