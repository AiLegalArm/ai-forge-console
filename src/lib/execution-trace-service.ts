import type { RoutingDecision } from "@/types/local-inference";
import type {
  ExecutionFailureType,
  ExecutionStatusTransition,
  ExecutionTrace,
  ExecutionTraceEventType,
  ExecutionTraceStatus,
  ExecutionTraceStep,
  WorkflowState,
} from "@/types/workflow";

interface CreateTraceInput {
  runId: string;
  nowIso: string;
  taskId?: string;
  subtaskId?: string;
  chatId?: string;
  agentId?: string;
  auditorId?: string;
  provider?: string;
  model?: string;
  routingDecision?: RoutingDecision;
  releaseDecisionId?: string;
  evidenceIds?: string[];
}

interface AppendTraceStepInput {
  traceId: string;
  nowIso: string;
  type: ExecutionTraceEventType;
  title: string;
  details?: string;
  phaseLabel?: string;
  partialOutput?: string;
  liveState?: ExecutionTrace["liveState"];
  currentSubtask?: string;
  blockedReason?: string;
  provider?: string;
  model?: string;
  failureType?: ExecutionFailureType;
  nextStatus?: ExecutionTraceStatus;
}

const getDefaultStatusTransition = (from: ExecutionTraceStatus, to: ExecutionTraceStatus, atIso: string, reason?: string): ExecutionStatusTransition => ({
  from,
  to,
  atIso,
  reason,
});

const buildStep = (input: AppendTraceStepInput, status: ExecutionTraceStatus): ExecutionTraceStep => ({
  id: `${input.traceId}-step-${input.type}-${Date.parse(input.nowIso)}`,
  type: input.type,
  title: input.title,
  details: input.details,
  status,
  liveState: input.liveState,
  phaseLabel: input.phaseLabel,
  partialOutput: input.partialOutput,
  provider: input.provider,
  model: input.model,
  failureType: input.failureType,
  createdAtIso: input.nowIso,
});

export function createExecutionTrace(input: CreateTraceInput): ExecutionTrace {
  const traceId = `trace-${input.runId}`;
  const routingSummary = input.routingDecision
    ? `${input.routingDecision.profile} • ${input.routingDecision.selectedProvider}/${input.routingDecision.selectedModelId ?? "unknown"}`
    : undefined;

  return {
    traceId,
    runId: input.runId,
    taskId: input.taskId,
    subtaskId: input.subtaskId,
    chatId: input.chatId,
    agentId: input.agentId,
    auditorId: input.auditorId,
    releaseDecisionId: input.releaseDecisionId,
    approvalId: undefined,
    evidenceIds: input.evidenceIds ?? [],
    provider: input.provider,
    model: input.model,
    liveState: "preparing",
    currentPhase: "Initializing run",
    currentSubtask: undefined,
    latestPartialOutput: undefined,
    blockedReason: undefined,
    routingDecision: routingSummary,
    fallbackUsed: input.routingDecision?.usedFallback ?? false,
    status: "queued",
    finalResultState: "interrupted",
    startedAtIso: input.nowIso,
    updatedAtIso: input.nowIso,
    statusTransitions: [getDefaultStatusTransition("queued", "in_progress", input.nowIso, "run_created")],
    steps: [
      {
        id: `${traceId}-step-run_created-${Date.parse(input.nowIso)}`,
        type: "run_created",
        title: "Run created",
        details: "Execution run was created and linked to workflow context.",
        status: "in_progress",
        liveState: "preparing",
        phaseLabel: "Preparing run",
        provider: input.provider,
        model: input.model,
        createdAtIso: input.nowIso,
      },
    ],
    usage: {
      estimatedCostUsd: undefined,
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
      executionLocation: input.routingDecision?.deploymentTarget === "cloud" ? "cloud" : "local",
      executionWeight: "standard",
    },
    summary: {
      totalDurationMs: undefined,
      providerModelLabel: input.provider && input.model ? `${input.provider} / ${input.model}` : undefined,
      fallbackUsed: input.routingDecision?.usedFallback ?? false,
      failurePoint: undefined,
      outcome: "interrupted",
      linkedBlockerIds: [],
      linkedFindingIds: [],
    },
  };
}

export function appendExecutionTraceStep(workflow: WorkflowState, input: AppendTraceStepInput): WorkflowState {
  return {
    ...workflow,
    executionTraces: workflow.executionTraces.map((trace) => {
      if (trace.traceId !== input.traceId) {
        return trace;
      }

      const nextStatus = input.nextStatus ?? trace.status;
      const transitions =
        trace.status === nextStatus
          ? trace.statusTransitions
          : [...trace.statusTransitions, getDefaultStatusTransition(trace.status, nextStatus, input.nowIso, input.type)];
      const nextSteps = [...trace.steps, buildStep(input, nextStatus)];

      return {
        ...trace,
        provider: input.provider ?? trace.provider,
        model: input.model ?? trace.model,
        liveState: input.liveState ?? trace.liveState,
        currentPhase: input.phaseLabel ?? trace.currentPhase,
        currentSubtask: input.currentSubtask ?? trace.currentSubtask,
        latestPartialOutput: input.partialOutput ?? trace.latestPartialOutput,
        blockedReason: input.blockedReason ?? trace.blockedReason,
        updatedAtIso: input.nowIso,
        status: nextStatus,
        steps: nextSteps,
        statusTransitions: transitions,
        fallbackUsed: trace.fallbackUsed || input.type === "fallback_selected" || input.type === "fallback_called",
        summary: {
          ...trace.summary,
          fallbackUsed: trace.fallbackUsed || input.type === "fallback_selected" || input.type === "fallback_called",
          providerModelLabel: input.provider && input.model ? `${input.provider} / ${input.model}` : trace.summary.providerModelLabel,
        },
      };
    }),
  };
}

export function completeExecutionTrace(
  workflow: WorkflowState,
  traceId: string,
  input: {
    nowIso: string;
    outcome: "success" | "failed" | "blocked" | "interrupted";
    failureType?: ExecutionFailureType;
    failureMessage?: string;
    failurePoint?: ExecutionTraceEventType;
    linkedBlockerIds?: string[];
    linkedFindingIds?: string[];
    usage?: Partial<ExecutionTrace["usage"]>;
  },
): WorkflowState {
  return {
    ...workflow,
    executionTraces: workflow.executionTraces.map((trace) => {
      if (trace.traceId !== traceId) {
        return trace;
      }

      const completedStatus: ExecutionTraceStatus =
        input.outcome === "success" ? "completed" : input.outcome === "failed" ? "failed" : input.outcome === "blocked" ? "awaiting_approval" : "interrupted";
      const transitions =
        trace.status === completedStatus
          ? trace.statusTransitions
          : [...trace.statusTransitions, getDefaultStatusTransition(trace.status, completedStatus, input.nowIso, input.outcome)];
      const durationMs = Date.parse(input.nowIso) - Date.parse(trace.startedAtIso);

      return {
        ...trace,
        updatedAtIso: input.nowIso,
        completedAtIso: input.nowIso,
        status: completedStatus,
        liveState: input.outcome === "success" ? "completed" : input.outcome === "failed" ? "failed" : input.outcome === "blocked" ? "waiting_for_approval" : "idle",
        blockedReason: input.outcome === "blocked" ? input.failureMessage ?? trace.blockedReason : undefined,
        finalResultState: input.outcome,
        statusTransitions: transitions,
        error:
          input.outcome === "failed" && input.failureType && input.failureMessage
            ? {
                type: input.failureType,
                message: input.failureMessage,
                atIso: input.nowIso,
              }
            : undefined,
        usage: {
          ...trace.usage,
          ...input.usage,
        },
        summary: {
          ...trace.summary,
          totalDurationMs: durationMs,
          outcome: input.outcome,
          failurePoint: input.failurePoint,
          linkedBlockerIds: input.linkedBlockerIds ?? trace.summary.linkedBlockerIds,
          linkedFindingIds: input.linkedFindingIds ?? trace.summary.linkedFindingIds,
        },
      };
    }),
  };
}
