import type { AppMode } from "@/components/layout/AppLayout";
import type { ModelProvider, RoutingMode } from "@/types/local-inference";
import type {
  AgentActivityEvent,
  ExecutionTrace,
  OperatorIntervention,
  OperatorInterventionResultState,
  OperatorInterventionType,
  WorkflowApproval,
  WorkflowState,
} from "@/types/workflow";

export interface OperatorInterventionRequest {
  type: OperatorInterventionType;
  projectId: string;
  taskId?: string;
  subtaskId?: string;
  executionRunId?: string;
  reason: string;
  actor: {
    operatorId: string;
    operatorLabel: string;
    mode: AppMode;
  };
  targetAgentId?: string;
  provider?: ModelProvider;
  modelId?: string;
  routingMode?: RoutingMode;
  confirmedByOperator: boolean;
}

export interface OperatorInterventionApplyResult {
  workflow: WorkflowState;
  nextRoutingMode?: RoutingMode;
  nextProvider?: ModelProvider;
  nextModelId?: string;
}

const highRiskInterventions: OperatorInterventionType[] = [
  "cancel_stop_run",
  "force_fallback",
  "switch_provider_model",
  "change_routing_mode",
];

const nowIso = () => new Date().toISOString();

const buildActivity = (input: {
  type: AgentActivityEvent["type"];
  title: string;
  details: string;
  taskId?: string;
  runId?: string;
  agentId?: string;
  severity?: AgentActivityEvent["severity"];
}): AgentActivityEvent => ({
  id: `activity-intervention-${crypto.randomUUID()}`,
  type: input.type,
  title: input.title,
  details: input.details,
  taskId: input.taskId,
  runId: input.runId,
  agentId: input.agentId,
  severity: input.severity ?? "info",
  createdAtIso: nowIso(),
});

const buildInterventionRecord = (
  request: OperatorInterventionRequest,
  resultState: OperatorInterventionResultState,
  extras?: Partial<OperatorIntervention>,
): OperatorIntervention => ({
  id: `intervention-${crypto.randomUUID()}`,
  type: request.type,
  projectId: request.projectId,
  taskId: request.taskId,
  subtaskId: request.subtaskId,
  executionRunId: request.executionRunId,
  agentId: request.targetAgentId,
  actor: request.actor,
  reason: request.reason,
  createdAtIso: nowIso(),
  confirmationRequired: highRiskInterventions.includes(request.type),
  confirmedByOperator: request.confirmedByOperator,
  resultState,
  metadata: extras?.metadata,
  linkedApprovalId: extras?.linkedApprovalId,
  executionTraceId: extras?.executionTraceId,
});

const updateTraceForIntervention = (
  traces: ExecutionTrace[],
  runId: string | undefined,
  status: ExecutionTrace["status"],
  finalResultState: ExecutionTrace["finalResultState"],
  details: string,
): ExecutionTrace[] =>
  traces.map((trace) => {
    if (!runId || trace.runId !== runId) return trace;
    return {
      ...trace,
      status,
      finalResultState,
      updatedAtIso: nowIso(),
      completedAtIso: status === "completed" || status === "failed" || status === "interrupted" ? nowIso() : trace.completedAtIso,
      steps: [
        {
          id: `trace-step-intervention-${crypto.randomUUID()}`,
          type: "execution_update",
          title: "Operator intervention",
          details,
          status,
          createdAtIso: nowIso(),
        },
        ...trace.steps,
      ],
      statusTransitions: [
        {
          from: trace.status,
          to: status,
          atIso: nowIso(),
          reason: details,
        },
        ...trace.statusTransitions,
      ],
    };
  });

export function applyOperatorIntervention(workflow: WorkflowState, request: OperatorInterventionRequest): OperatorInterventionApplyResult {
  const confirmationRequired = highRiskInterventions.includes(request.type);
  if (confirmationRequired && !request.confirmedByOperator) {
    const rejected = buildInterventionRecord(request, "pending_confirmation");
    return {
      workflow: {
        ...workflow,
        interventions: [rejected, ...workflow.interventions],
        activityEvents: [
          buildActivity({
            type: "operator_intervention_rejected",
            title: "Intervention held for confirmation",
            details: `${request.type} requires explicit operator confirmation.`,
            taskId: request.taskId,
            runId: request.executionRunId,
            severity: "warning",
          }),
          ...workflow.activityEvents,
        ],
      },
    };
  }

  const approval: WorkflowApproval = {
    id: `approval-intervention-${crypto.randomUUID()}`,
    category: "release_approval",
    title: `Operator intervention: ${request.type}`,
    reason: request.reason,
    status: "approved",
    taskId: request.taskId,
    agentId: request.targetAgentId,
    requestedBy: request.actor.operatorLabel,
    requestedAtIso: nowIso(),
  };

  let nextWorkflow = workflow;
  let nextRoutingMode: RoutingMode | undefined;
  let nextProvider: ModelProvider | undefined;
  let nextModelId: string | undefined;

  switch (request.type) {
    case "reassign_subtask": {
      if (!request.subtaskId || !request.targetAgentId) break;
      const sourceSubtask = workflow.subtasks.find((subtask) => subtask.id === request.subtaskId);
      nextWorkflow = {
        ...nextWorkflow,
        subtasks: nextWorkflow.subtasks.map((subtask) =>
          subtask.id === request.subtaskId
            ? {
                ...subtask,
                assignedAgentId: request.targetAgentId!,
                status: subtask.status === "completed" || subtask.status === "failed" ? "assigned" : subtask.status,
                updatedAtIso: nowIso(),
              }
            : subtask,
        ),
        delegations: [
          {
            id: `delegation-operator-${crypto.randomUUID()}`,
            parentTaskId: sourceSubtask?.parentTaskId ?? request.taskId ?? "unknown-task",
            subtaskId: request.subtaskId,
            fromAgentId: sourceSubtask?.assignedAgentId ?? "unknown-agent",
            toAgentId: request.targetAgentId,
            state: "assigned",
            delegationReason: request.reason,
            delegatedAtIso: nowIso(),
            assignmentMetadata: {
              requestedPriority: sourceSubtask?.priority ?? "medium",
              requestedByRole: "orchestrator",
              capabilityTags: ["operator_intervention"],
              expectedOutcome: "Manual subtask recovery and reassignment",
            },
            linkedDependencyTaskIds: sourceSubtask?.dependencies ?? [],
          },
          ...nextWorkflow.delegations,
        ],
      };
      break;
    }
    case "override_agent_assignment": {
      if (!request.taskId || !request.targetAgentId) break;
      nextWorkflow = {
        ...nextWorkflow,
        tasks: nextWorkflow.tasks.map((task) =>
          task.id === request.taskId
            ? { ...task, ownerAgentId: request.targetAgentId, delegatedOwnerAgentId: request.targetAgentId, updatedAtIso: nowIso() }
            : task,
        ),
      };
      break;
    }
    case "switch_provider_model": {
      nextProvider = request.provider;
      nextModelId = request.modelId;
      break;
    }
    case "change_routing_mode": {
      nextRoutingMode = request.routingMode;
      break;
    }
    case "request_re_audit":
    case "request_re_review": {
      if (!request.taskId) break;
      nextWorkflow = {
        ...nextWorkflow,
        tasks: nextWorkflow.tasks.map((task) =>
          task.id === request.taskId
            ? {
                ...task,
                status: "queued",
                phase: request.type === "request_re_audit" ? "audit" : "review",
                progressSummary: `${task.progressSummary} • operator requested ${request.type === "request_re_audit" ? "re-audit" : "re-review"}.`,
                updatedAtIso: nowIso(),
              }
            : task,
        ),
      };
      break;
    }
    case "cancel_stop_run": {
      nextWorkflow = {
        ...nextWorkflow,
        executionTraces: updateTraceForIntervention(nextWorkflow.executionTraces, request.executionRunId, "interrupted", "interrupted", "Run stopped by operator intervention."),
      };
      break;
    }
    case "retry_run": {
      nextWorkflow = {
        ...nextWorkflow,
        executionTraces: updateTraceForIntervention(nextWorkflow.executionTraces, request.executionRunId, "queued", "success", "Run queued for controlled retry."),
      };
      break;
    }
    case "force_fallback": {
      nextWorkflow = {
        ...nextWorkflow,
        executionTraces: nextWorkflow.executionTraces.map((trace) =>
          trace.runId === request.executionRunId
            ? {
                ...trace,
                fallbackUsed: true,
                summary: { ...trace.summary, fallbackUsed: true },
                updatedAtIso: nowIso(),
              }
            : trace,
        ),
      };
      break;
    }
    case "mark_task_blocked":
    case "mark_task_unblocked": {
      if (!request.taskId) break;
      const nextStatus = request.type === "mark_task_blocked" ? "blocked" : "queued";
      nextWorkflow = {
        ...nextWorkflow,
        tasks: nextWorkflow.tasks.map((task) => (task.id === request.taskId ? { ...task, status: nextStatus, updatedAtIso: nowIso() } : task)),
      };
      break;
    }
  }

  const intervention = buildInterventionRecord(request, "applied", {
    metadata: {
      toAgentId: request.targetAgentId,
      provider: request.provider,
      modelId: request.modelId,
      routingMode: request.routingMode,
      retryRequested: request.type === "retry_run",
      fallbackForced: request.type === "force_fallback",
      reAuditRequested: request.type === "request_re_audit",
      reReviewRequested: request.type === "request_re_review",
      blockedState: request.type === "mark_task_blocked" ? "blocked" : request.type === "mark_task_unblocked" ? "unblocked" : undefined,
    },
    linkedApprovalId: approval.id,
  });

  return {
    workflow: {
      ...nextWorkflow,
      interventions: [intervention, ...nextWorkflow.interventions],
      approvals: [approval, ...nextWorkflow.approvals],
      activityEvents: [
        buildActivity({
          type: "operator_intervention_applied",
          title: `Operator intervention applied: ${request.type}`,
          details: request.reason,
          taskId: request.taskId,
          runId: request.executionRunId,
          agentId: request.targetAgentId,
          severity: "warning",
        }),
        ...nextWorkflow.activityEvents,
      ],
    },
    nextRoutingMode,
    nextProvider,
    nextModelId,
  };
}
