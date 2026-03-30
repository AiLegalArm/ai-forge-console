import type { ActivitySeverity, ExecutionTraceStatus, ExecutionTraceStep, ExecutionTraceSummary, ExecutionFailureType } from "@/types/workflow";
import type { AppRoutingModeProfile } from "@/types/local-inference";
import type { SeveritySummary } from "@/types/audits";

export type OperatorBlockerType = "task" | "audit" | "release" | "provider_runtime" | "approval";

export interface OperatorDashboardSummary {
  activeTasks: number;
  blockedTasks: number;
  activeSubtasks: number;
  activeAgents: number;
  activeAuditors: number;
  pendingApprovals: number;
  releaseBlockers: number;
  executionFailures: number;
  routingAnomalies: number;
  degradedProviderRuntime: boolean;
  liveRuns: number;
  waitingRuns: number;
  blockedRuns: number;
  partialStreamingRuns: number;
}

export interface OperatorProjectSummary {
  projectId: string;
  projectName: string;
  isActiveProject: boolean;
  activeTaskCount: number;
  blockedTaskCount: number;
  activeSubtaskCount: number;
  agentUtilization: {
    active: number;
    idle: number;
    utilizationRatio: number;
  };
  providerModelState: {
    providerSource: "openrouter" | "ollama";
    model: string;
    degraded: boolean;
    routingProfile: AppRoutingModeProfile;
  };
  releaseReadiness: "go" | "warning" | "blocked";
  auditSeveritySummary: SeveritySummary;
  recentCriticalExecutionFailures: string[];
}

export interface ExecutionDrillDown {
  traceId: string;
  runId: string;
  actor: {
    role: "agent" | "auditor" | "orchestrator";
    id?: string;
  };
  linked: {
    taskId?: string;
    subtaskId?: string;
    approvalId?: string;
    releaseDecisionId?: string;
  };
  providerModel: {
    provider?: string;
    model?: string;
  };
  routing: {
    decision?: string;
    whySelected: string[];
    fallbackUsed: boolean;
    degradedExecution: boolean;
    contributedToFailure: boolean;
    costControlSignal: "none" | "observed";
  };
  status: ExecutionTraceStatus;
  failureType?: ExecutionFailureType;
  steps: ExecutionTraceStep[];
  findingsOrBlockers: string[];
  approvalInteractions: string[];
  outcome: ExecutionTraceSummary["outcome"];
  updatedAtIso: string;
}

export interface OperatorBlockerSummary {
  type: OperatorBlockerType;
  count: number;
  ids: string[];
}

export interface OperatorDrillDownEntryPoints {
  fromActivityStream: string[];
  fromTaskGraph: string[];
  fromAuditSummaries: string[];
  fromReleaseSurface: string[];
  fromDashboardCards: string[];
}

export interface OperatorDashboardState {
  globalSummary: OperatorDashboardSummary;
  projectSummaries: OperatorProjectSummary[];
  executionDrillDowns: ExecutionDrillDown[];
  blockers: OperatorBlockerSummary[];
  entryPoints: OperatorDrillDownEntryPoints;
  criticalEvents: Array<{ id: string; title: string; severity: ActivitySeverity; traceId?: string }>;
}
