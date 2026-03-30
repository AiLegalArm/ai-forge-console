import type { AuditorControlState } from "@/types/audits";
import type { ChatState, ChatType } from "@/types/chat";
import type { ReleaseControlState } from "@/types/release";
import type { WorkflowState } from "@/types/workflow";
import type {
  DecisionMemoryEntry,
  MemoryContextEnvelope,
  MemoryRetrieveRequest,
  TaskMemoryEntry,
  WorkspaceMemoryState,
} from "@/types/memory";
import type { ProjectCommandRegistry } from "@/types/project-commands";

const MEMORY_VERSION = 1;
const MAX_TASK_MEMORY = 20;
const MAX_DECISION_MEMORY = 30;
const MAX_CHAT_SUMMARIES = 8;

export const getMemoryStorageKey = (projectId: string, projectPath?: string) =>
  `workspace-memory:${projectId}:${projectPath ?? "unknown-path"}`;

const nowIso = () => new Date().toISOString();

const summarizeRecentMessages = (messages: string[]) => {
  if (messages.length === 0) return "No recent conversation.";
  return messages.slice(-3).join(" | ").slice(0, 280);
};

const buildTaskMemoryEntries = (workflow: WorkflowState, auditors: AuditorControlState): TaskMemoryEntry[] =>
  workflow.tasks
    .slice(0, MAX_TASK_MEMORY)
    .map((task) => {
      const blockers = auditors.blockers.filter((blocker) => blocker.entityId === task.id && blocker.status === "active");
      const approvals = workflow.approvals.filter((approval) => approval.taskId === task.id).slice(0, 8);

      return {
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        phase: task.phase,
        outcomeSummary: task.status === "completed" ? "Completed" : task.status === "failed" ? "Failed" : "In progress",
        blockerSummary: blockers.map((blocker) => blocker.rationale),
        approvals: approvals.map((approval) => ({
          id: approval.id,
          status: approval.status,
          category: approval.category,
          requestedAtIso: approval.requestedAtIso,
        })),
        branchName: task.branchName,
        linkedChatSessionId: task.linkedChatSessionId,
        subtaskHistory: task.subtasks.map((subtask) => ({
          subtaskId: subtask.id,
          title: subtask.title,
          status: subtask.status,
        })),
        updatedAtIso: nowIso(),
      };
    });

const deriveDecisionMemory = (
  workflow: WorkflowState,
  releaseControl: ReleaseControlState,
  providerSource: "openrouter" | "ollama",
  activeModel: string,
  activePhase: string,
  currentTaskId?: string,
): DecisionMemoryEntry[] => {
  const routingDecision: DecisionMemoryEntry = {
    id: `decision-routing-${activePhase}`,
    decisionType: "routing",
    summary: `Routing phase is ${activePhase}.`,
    rationale: "Derived from workflow phase for orchestration context shaping.",
    linkedTaskId: currentTaskId,
    createdAtIso: nowIso(),
  };

  const providerDecision: DecisionMemoryEntry = {
    id: `decision-provider-${providerSource}-${activeModel}`,
    decisionType: "provider_model",
    summary: `Provider ${providerSource} using ${activeModel}.`,
    rationale: "Active provider/model selection in current workspace runtime.",
    linkedTaskId: currentTaskId,
    createdAtIso: nowIso(),
  };

  const releaseDecision: DecisionMemoryEntry = {
    id: `decision-release-${releaseControl.activeCandidateId}`,
    decisionType: "release",
    summary: `Release decision: ${releaseControl.finalDecision.status}.`,
    rationale: releaseControl.finalDecision.summary,
    linkedReleaseCandidateId: releaseControl.activeCandidateId,
    createdAtIso: nowIso(),
  };

  return [routingDecision, providerDecision, releaseDecision].slice(0, MAX_DECISION_MEMORY);
};

export interface BuildMemorySnapshotInput {
  projectId: string;
  projectName: string;
  projectPath?: string;
  repositorySummary: string;
  discoveredInstructions: string[];
  commandRegistry: ProjectCommandRegistry;
  providerSource: "openrouter" | "ollama";
  activeModel: string;
  deploymentMode: "local" | "cloud" | "hybrid";
  localCloudPreference: "local" | "cloud" | "hybrid";
  knownConventions: string[];
  workflow: WorkflowState;
  auditors: AuditorControlState;
  releaseControl: ReleaseControlState;
  chatState: ChatState;
  currentChatType: ChatType;
  currentChatSessionId: string;
  activeAgentId?: string;
}

export const buildWorkspaceMemorySnapshot = (input: BuildMemorySnapshotInput): WorkspaceMemoryState => {
  const activeSessionMessages = input.chatState.messagesBySessionId[input.currentChatSessionId] ?? [];
  const recentText = activeSessionMessages
    .slice(-4)
    .map((msg) => `${msg.role}: ${msg.content}`);

  const linkedTask = input.workflow.tasks.find((task) => task.linkedChatSessionId === input.currentChatSessionId) ?? input.workflow.tasks[0];
  const activeSession = input.chatState.sessions.find((session) => session.id === input.currentChatSessionId);

  return {
    version: MEMORY_VERSION,
    project: {
      activeProjectId: input.projectId,
      projectName: input.projectName,
      projectPath: input.projectPath,
      repoStateSummary: input.repositorySummary,
      discoveredInstructions: input.discoveredInstructions,
      commandRegistrySummary: {
        total: input.commandRegistry.commands.length,
        primary: input.commandRegistry.primaryCommandIds.length,
        generatedAtIso: input.commandRegistry.generatedAtIso,
      },
      providerDefaults: {
        provider: input.providerSource,
        model: input.activeModel,
        deploymentMode: input.deploymentMode,
      },
      localCloudPreference: input.localCloudPreference,
      knownConventions: input.knownConventions,
      updatedAtIso: nowIso(),
    },
    tasks: buildTaskMemoryEntries(input.workflow, input.auditors),
    decisions: deriveDecisionMemory(
      input.workflow,
      input.releaseControl,
      input.providerSource,
      input.activeModel,
      linkedTask?.phase ?? "planning",
      linkedTask?.id,
    ),
    providerPreferences: {
      preferredProvider: input.providerSource,
      preferredModelByProvider: {
        openrouter: input.providerSource === "openrouter" ? input.activeModel : "openai/gpt-4.1",
        ollama: input.providerSource === "ollama" ? input.activeModel : "qwen3-coder:14b",
      },
      activeProviderContext: {
        provider: activeSession?.providerMeta.provider ?? input.providerSource,
        model: activeSession?.providerMeta.model ?? input.activeModel,
        reason: "Recent session and runtime configuration",
      },
      updatedAtIso: nowIso(),
    },
    auditRelease: {
      findingsHistory: input.auditors.findings.slice(0, 15).map((finding) => ({
        findingId: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: finding.status,
        taskId: finding.linked.taskId,
        createdAtIso: finding.createdAtIso,
      })),
      recurringBlockers: input.auditors.blockers.filter((blocker) => blocker.status === "active").map((blocker) => blocker.rationale),
      resolvedFindings: input.auditors.findings.filter((finding) => finding.status === "resolved").map((finding) => finding.title),
      releaseDecisions: [
        {
          releaseCandidateId: input.releaseControl.activeCandidateId,
          status: input.releaseControl.finalDecision.status,
          summary: input.releaseControl.finalDecision.summary,
          createdAtIso: nowIso(),
        },
      ],
      deployOutcomes: input.releaseControl.deployments.slice(0, 8).map((deployment) => ({
        deploymentId: deployment.id,
        status: deployment.status,
        linkedTaskId: deployment.linkedTaskId,
        createdAtIso: deployment.updatedAtIso,
      })),
      incidents: input.releaseControl.domains
        .filter((domain) => domain.errors.length > 0)
        .map((domain) => `${domain.name}: ${domain.errors.join(", ")}`),
      updatedAtIso: nowIso(),
    },
    chatSession: {
      activeChatSessionId: input.currentChatSessionId,
      activeChatType: input.currentChatType,
      recentConversationSummaries: [
        {
          sessionId: input.currentChatSessionId,
          summary: summarizeRecentMessages(recentText),
          createdAtIso: nowIso(),
        },
      ].slice(0, MAX_CHAT_SUMMARIES),
      linkedTaskContext: linkedTask
        ? {
            taskId: linkedTask.id,
            title: linkedTask.title,
            status: linkedTask.status,
          }
        : undefined,
      linkedAgentContext: {
        agentId: input.activeAgentId,
      },
      activeProviderModelContext: {
        provider: activeSession?.providerMeta.provider ?? input.providerSource,
        model: activeSession?.providerMeta.model ?? input.activeModel,
        backend: activeSession?.providerMeta.backend ?? input.providerSource,
      },
      recentProjectActions: input.workflow.activityEvents.slice(0, 5).map((event) => `${event.title}: ${event.details ?? "n/a"}`),
      updatedAtIso: nowIso(),
    },
  };
};

export const mergeWorkspaceMemory = (previous: WorkspaceMemoryState | null, next: WorkspaceMemoryState): WorkspaceMemoryState => {
  if (!previous) return next;

  const mergedTasks = [...next.tasks, ...previous.tasks.filter((prior) => !next.tasks.some((task) => task.taskId === prior.taskId))].slice(
    0,
    MAX_TASK_MEMORY,
  );
  const mergedDecisions = [...next.decisions, ...previous.decisions.filter((prior) => !next.decisions.some((d) => d.id === prior.id))].slice(
    0,
    MAX_DECISION_MEMORY,
  );
  const mergedChatSummaries = [
    ...next.chatSession.recentConversationSummaries,
    ...previous.chatSession.recentConversationSummaries.filter(
      (entry) => !next.chatSession.recentConversationSummaries.some((recent) => recent.sessionId === entry.sessionId),
    ),
  ].slice(0, MAX_CHAT_SUMMARIES);

  return {
    ...next,
    tasks: mergedTasks,
    decisions: mergedDecisions,
    chatSession: {
      ...next.chatSession,
      recentConversationSummaries: mergedChatSummaries,
    },
    auditRelease: {
      ...next.auditRelease,
      recurringBlockers: Array.from(new Set([...next.auditRelease.recurringBlockers, ...previous.auditRelease.recurringBlockers])).slice(0, 12),
      resolvedFindings: Array.from(new Set([...next.auditRelease.resolvedFindings, ...previous.auditRelease.resolvedFindings])).slice(0, 20),
      releaseDecisions: [...next.auditRelease.releaseDecisions, ...previous.auditRelease.releaseDecisions].slice(0, 10),
      incidents: Array.from(new Set([...next.auditRelease.incidents, ...previous.auditRelease.incidents])).slice(0, 10),
    },
  };
};

export const retrieveMemoryContext = (memory: WorkspaceMemoryState, request: MemoryRetrieveRequest): MemoryContextEnvelope => {
  const task = request.taskId ? memory.tasks.find((entry) => entry.taskId === request.taskId) : memory.tasks[0];

  const decisions = memory.decisions.filter((entry) => {
    if (request.audience === "release") return entry.decisionType === "release" || entry.decisionType === "audit_resolution";
    if (request.audience === "auditor") return entry.decisionType === "audit_resolution" || entry.decisionType === "routing";
    if (request.audience === "agent") return entry.decisionType === "routing" || entry.decisionType === "provider_model";
    return true;
  });

  return {
    project: memory.project,
    task,
    decisions,
    provider: memory.providerPreferences,
    auditRelease: {
      recurringBlockers: memory.auditRelease.recurringBlockers,
      resolvedFindings: memory.auditRelease.resolvedFindings,
      releaseDecisions: memory.auditRelease.releaseDecisions,
      incidents: memory.auditRelease.incidents,
    },
    chat: memory.chatSession,
  };
};

export const loadWorkspaceMemory = (storageKey: string): WorkspaceMemoryState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceMemoryState;
    if (parsed.version !== MEMORY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const persistWorkspaceMemory = (storageKey: string, memory: WorkspaceMemoryState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(memory));
};
