import type { ChatType } from "@/types/chat";
import type { AgentRuntimeState } from "@/types/workspace";
import type { AgentActivityEvent, TaskPhase, TaskPriority, TaskStatus, WorkflowDelegation, WorkflowState, WorkflowSubtask, WorkflowTask, WorkflowTaskGraph } from "@/types/workflow";

interface OrchestratorInput {
  message: string;
  sessionId: string;
  chatId: string;
  workflow: WorkflowState;
  agents: AgentRuntimeState[];
  nowIso: string;
}

export interface AgentCommandTrigger {
  chatType: ChatType;
  sessionId?: string;
  reason: string;
  agentId?: string;
}

interface OrchestratorResult {
  handled: boolean;
  updatedWorkflow: WorkflowState;
  response: string;
  triggers: AgentCommandTrigger[];
}

const TASK_VERBS = ["build", "implement", "create", "fix", "add", "refactor", "plan", "audit", "review", "ship"];

const phasePriority: TaskPhase[] = ["planning", "implementation", "audit", "review"];

const phaseToTitle: Record<TaskPhase, string> = {
  planning: "Create delivery plan",
  implementation: "Implement requested changes",
  audit: "Run audit and remediation checks",
  review: "Review and finalize results",
  release: "Prepare release",
};

function classifyAsTask(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (normalized.length < 15) return false;
  return TASK_VERBS.some((verb) => normalized.includes(`${verb} `) || normalized.startsWith(verb));
}

function pickAgentForPhase(phase: TaskPhase, agents: AgentRuntimeState[]): AgentRuntimeState | undefined {
  if (phase === "planning") return agents.find((agent) => agent.id.includes("planner") || agent.id.includes("orchestrator"));
  if (phase === "implementation") return agents.find((agent) => agent.id.includes("frontend") || agent.id.includes("backend") || agent.role === "worker");
  if (phase === "audit") return agents.find((agent) => agent.id.includes("audit") || agent.role?.includes("auditor"));
  if (phase === "review") return agents.find((agent) => agent.id.includes("release") || agent.id.includes("planner") || agent.id.includes("orchestrator"));
  return undefined;
}

function buildSubtask(parentTaskId: string, chatSessionId: string, phase: TaskPhase, message: string, agentId: string | undefined, nowIso: string): WorkflowSubtask {
  const idSuffix = phase === "implementation" ? "impl" : phase;
  return {
    id: `${parentTaskId}-${idSuffix}`,
    parentTaskId,
    title: phaseToTitle[phase],
    description: `${phaseToTitle[phase]} for: ${message}`,
    assignedAgentId: agentId ?? "agent-orchestrator",
    status: phase === "planning" ? "in_progress" : "queued",
    dependencies: phase === "planning" ? [] : ["planning"].concat(phase === "review" ? ["audit"] : []).map((value) => `${parentTaskId}-${value === "planning" ? "planning" : value}`),
    priority: phase === "implementation" ? "high" : "medium",
    linkedChatContext: {
      chatSessionId,
      chatType: "main",
    },
    linkedExecutionContext: {
      executionContextId: `exec-${parentTaskId}-${idSuffix}`,
      source: "orchestrator",
    },
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

function createActivityEvent(
  type: AgentActivityEvent["type"],
  title: string,
  nowIso: string,
  taskId: string,
  chatId: string,
  details?: string,
  agentId?: string,
): AgentActivityEvent {
  return {
    id: `activity-${taskId}-${type}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    details,
    taskId,
    chatId,
    agentId,
    severity: type === "blocked" ? "warning" : "info",
    createdAtIso: nowIso,
  };
}

function buildTaskStatus(workflow: WorkflowState): TaskStatus {
  const hasPendingApproval = workflow.approvals.some((approval) => approval.status === "pending");
  return hasPendingApproval ? "awaiting_approval" : "in_progress";
}

export function runMainChatOrchestrator(input: OrchestratorInput): OrchestratorResult {
  if (!classifyAsTask(input.message)) {
    return {
      handled: false,
      updatedWorkflow: input.workflow,
      response: "Got it. I can coordinate this when you phrase it as an actionable task (e.g., build/fix/implement with outcome).",
      triggers: [],
    };
  }

  const taskId = `task-main-${Date.now().toString(36)}`;
  const owner = pickAgentForPhase("planning", input.agents);
  const subtasks = phasePriority.map((phase) =>
    buildSubtask(taskId, input.sessionId, phase, input.message, pickAgentForPhase(phase, input.agents)?.id, input.nowIso),
  );
  const subtaskIds = subtasks.map((subtask) => subtask.id);

  const parentTask: WorkflowTask = {
    id: taskId,
    title: input.message.slice(0, 96),
    status: buildTaskStatus(input.workflow),
    ownerAgentId: owner?.id ?? "agent-orchestrator",
    delegatedOwnerAgentId: owner?.id,
    childSubtaskIds: subtaskIds,
    dependencyTaskIds: [],
    linkedChatSessionId: input.sessionId,
    linkedExecutionContextId: `exec-${taskId}`,
    linkedAuditorTypes: ["code", "security", "release"],
    phase: "planning",
    progressSummary: `Task interpreted from Main Chat and decomposed into ${subtasks.length} orchestrated subtasks.`,
    completionRate: 0,
    aggregatedSubtaskIds: subtaskIds,
    updatedAtIso: input.nowIso,
  };

  const delegations: WorkflowDelegation[] = subtasks.map((subtask) => ({
    id: `deleg-${subtask.id}`,
    parentTaskId: taskId,
    subtaskId: subtask.id,
    fromAgentId: owner?.id ?? "agent-orchestrator",
    toAgentId: subtask.assignedAgentId,
    state: subtask.status === "in_progress" ? "accepted" : "assigned",
    delegationReason: `Orchestrator assigned ${subtask.title.toLowerCase()}.`,
    delegatedAtIso: input.nowIso,
    assignmentMetadata: {
      requestedPriority: subtask.priority as TaskPriority,
      requestedByRole: "orchestrator",
      capabilityTags: [subtask.title.toLowerCase().replace(/\s+/g, "_")],
      expectedOutcome: subtask.description,
    },
    linkedDependencyTaskIds: subtask.dependencies,
  }));

  const taskGraph: WorkflowTaskGraph = {
    parentTaskId: taskId,
    childSubtaskIds: subtaskIds,
    dependencyChains: subtasks.flatMap((subtask) => subtask.dependencies.map((dependencyId) => ({ fromTaskId: dependencyId, toTaskId: subtask.id }))),
    delegatedOwnership: Object.fromEntries(subtasks.map((subtask) => [subtask.id, subtask.assignedAgentId])),
    completionAggregation: {
      completedSubtasks: 0,
      totalSubtasks: subtasks.length,
      completionRate: 0,
    },
    failurePropagation: {
      failedSubtaskIds: [],
      propagatedToParentTask: false,
    },
    blockedPropagation: {
      blockedSubtaskIds: [],
      propagatedToParentTask: false,
    },
  };

  const existingBlockers = input.workflow.tasks.filter((task) => task.status === "blocked" && (task.phase === "audit" || task.phase === "review"));

  const events: AgentActivityEvent[] = [
    createActivityEvent("task_received", "Main Chat task accepted", input.nowIso, taskId, input.chatId, input.message, owner?.id),
    createActivityEvent("planning_started", "Orchestration planning started", input.nowIso, taskId, input.chatId, "Interpretation layer activated.", owner?.id),
    ...subtasks.map((subtask) =>
      createActivityEvent("subtask_created", `Subtask created: ${subtask.title}`, input.nowIso, taskId, input.chatId, subtask.description, subtask.assignedAgentId),
    ),
    ...subtasks.map((subtask) =>
      createActivityEvent("agent_assigned", `Agent assigned to ${subtask.title}`, input.nowIso, taskId, input.chatId, subtask.assignedAgentId, subtask.assignedAgentId),
    ),
    createActivityEvent("planning_completed", "Orchestration plan ready", input.nowIso, taskId, input.chatId, "Subtasks delegated via workflow graph.", owner?.id),
  ];

  if (existingBlockers.length > 0) {
    events.unshift(
      createActivityEvent(
        "blocked",
        "Existing blockers detected",
        input.nowIso,
        taskId,
        input.chatId,
        `${existingBlockers.length} audit/review blockers currently active.`,
      ),
    );
  }

  const updatedWorkflow: WorkflowState = {
    ...input.workflow,
    tasks: [parentTask, ...input.workflow.tasks],
    subtasks: [...subtasks, ...input.workflow.subtasks],
    delegations: [...delegations, ...input.workflow.delegations],
    taskGraphs: [taskGraph, ...input.workflow.taskGraphs],
    activityEvents: [...events, ...input.workflow.activityEvents],
  };

  const planSummary = subtasks
    .map((subtask, index) => `${index + 1}. ${subtask.title} → ${subtask.assignedAgentId}`)
    .join("\n");

  const triggers: AgentCommandTrigger[] = [
    {
      chatType: "agent",
      reason: "Execute next implementation action for orchestrated task.",
      agentId: pickAgentForPhase("implementation", input.agents)?.id,
    },
    {
      chatType: "audit",
      reason: "Prepare audit command for the new orchestration loop.",
      agentId: pickAgentForPhase("audit", input.agents)?.id,
    },
  ];

  return {
    handled: true,
    updatedWorkflow,
    response:
      `Task accepted and orchestrated.\n\n` +
      `Workflow task: ${parentTask.id}\n` +
      `Status: ${parentTask.status}\n` +
      `Subtasks assigned:\n${planSummary}\n\n` +
      (existingBlockers.length > 0
        ? `Blockers detected from current audits/reviews: ${existingBlockers.length}. Workflow remains controlled and gated.\n\n`
        : "No active audit/review blockers detected.\n\n") +
      `Next actions queued: implementation command proposal + audit command proposal.`,
    triggers,
  };
}
