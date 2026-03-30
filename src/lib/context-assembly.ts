import type { ChatType } from "@/types/chat";
import type { ContextInjectionPacket, ContextSnippet, ContextTarget } from "@/types/context";
import { evaluatePullRequestReviewOperations } from "@/lib/pr-review-operations";
import type { MemoryContextEnvelope } from "@/types/memory";
import type { WorkspaceRuntimeState } from "@/types/workspace";

interface ContextAssemblyInput {
  workspace: WorkspaceRuntimeState;
  chatType?: ChatType;
  target: ContextTarget;
  agentId?: string;
  memoryContext?: MemoryContextEnvelope;
}

const MAX_ACTIVITY_ITEMS = 4;
const MAX_DECISIONS = 3;

const formatSnippet = (label: string, value: string, priority: ContextSnippet["priority"] = "medium"): ContextSnippet => ({
  label,
  value,
  priority,
});

const toSummaryLine = (snippets: ContextSnippet[]) => snippets.slice(0, 5).map((entry) => `${entry.label}: ${entry.value}`).join(" | ");

const pickRoleLabel = (agentId?: string) => {
  if (!agentId) return "worker";
  if (agentId.includes("planner")) return "planner";
  if (agentId.includes("frontend")) return "frontend";
  if (agentId.includes("backend")) return "backend";
  if (agentId.includes("review")) return "reviewer";
  if (agentId.includes("browser")) return "browser";
  if (agentId.includes("design")) return "designer";
  return "worker";
};

export function assembleContextPacket(input: ContextAssemblyInput): ContextInjectionPacket {
  const { workspace, target, chatType, agentId, memoryContext } = input;
  const activeTask =
    workspace.workflow.tasks.find((task) => task.linkedChatSessionId === workspace.currentChatSessionId || task.title === workspace.currentTask) ??
    workspace.workflow.tasks[0];
  const recentActivity = workspace.workflow.activityEvents.slice(0, MAX_ACTIVITY_ITEMS).map((event) => event.title);
  const recentDecisions = workspace.auditors.gateDecisions.slice(0, MAX_DECISIONS);
  const blockers = workspace.auditors.blockers
    .filter((blocker) => blocker.status === "active" && (!activeTask || blocker.entityId === activeTask.id || blocker.entityType === "subtask"))
    .map((blocker) => blocker.rationale);

  const baseSnippets: ContextSnippet[] = [
    formatSnippet("project", workspace.currentProject, "high"),
    formatSnippet("repo", workspace.repository.name ?? "disconnected", "high"),
    formatSnippet("branch", workspace.currentBranch),
    formatSnippet("provider/model", `${workspace.activeProvider}/${workspace.activeModel}`, "high"),
    formatSnippet("task", workspace.currentTask, "high"),
    formatSnippet("task_status", workspace.currentTaskStatus, "high"),
  ];

  if (workspace.repository.connected) {
    baseSnippets.push(formatSnippet("repo_sync", workspace.repository.syncStatus ?? "idle"));
  }
  if (recentActivity.length > 0) {
    baseSnippets.push(formatSnippet("recent_activity", recentActivity.join(" • ")));
  }
  if (recentDecisions.length > 0) {
    baseSnippets.push(
      formatSnippet(
        "recent_decisions",
        recentDecisions.map((decision) => `${decision.stage}:${decision.verdict}`).join(" • "),
      ),
    );
  }
  if (memoryContext?.task?.taskSummary) {
    baseSnippets.push(formatSnippet("task_memory", memoryContext.task.taskSummary));
  }
  if (memoryContext?.project.knownConventions.length) {
    baseSnippets.push(formatSnippet("project_conventions", memoryContext.project.knownConventions.slice(0, 2).join(" • ")));
  }

  if (target === "worker_agent" || target === "agent_chat") {
    baseSnippets.push(formatSnippet("agent_role", pickRoleLabel(agentId), "high"));
    const relatedCommands = workspace.workflow.agentCommandRequests
      .filter((request) => !activeTask || request.linkedTaskId === activeTask.id)
      .slice(0, 3)
      .map((request) => request.rawCommand);
    if (relatedCommands.length > 0) {
      baseSnippets.push(formatSnippet("command_context", relatedCommands.join(" • ")));
    }
  }

  if (target === "auditor" || target === "audit_chat") {
    const openFindings = workspace.auditors.findings.filter((finding) => finding.status === "open").slice(0, 4);
    baseSnippets.push(formatSnippet("open_findings", `${openFindings.length}`, "high"));
    if (openFindings.length > 0) {
      baseSnippets.push(formatSnippet("risk_focus", openFindings.map((finding) => `${finding.auditorType}:${finding.severity}`).join(" • ")));
    }
    if (memoryContext?.auditRelease.resolvedFindings.length) {
      baseSnippets.push(formatSnippet("resolved_history", `${memoryContext.auditRelease.resolvedFindings.length} resolved findings`));
    }
  }

  if (target === "review_chat" || target === "release_flow") {
    baseSnippets.push(formatSnippet("release_status", workspace.releaseReadinessStatus, "high"));
    baseSnippets.push(formatSnippet("pending_approvals", `${workspace.pendingApprovals.length}`));
    const reviewOps = evaluatePullRequestReviewOperations({
      task: activeTask,
      pullRequest: activeTask?.github?.pullRequest,
      workflow: workspace.workflow,
      auditors: workspace.auditors,
      evidenceFlow: workspace.evidenceFlow,
      defaultBranch: workspace.workflow.github.repositories.find((repo) => repo.id === activeTask?.github?.repositoryId)?.defaultBranch,
      releaseGateBlocked: workspace.releaseReadinessStatus === "blocked" || workspace.releaseReadinessStatus === "no_go",
    });
    if (reviewOps) {
      baseSnippets.push(formatSnippet("pr_review_state", reviewOps.reviewReadiness.state, "high"));
      baseSnippets.push(formatSnippet("merge_readiness", reviewOps.mergeReadiness.state, "high"));
      baseSnippets.push(formatSnippet("pr_blockers", `${reviewOps.blockers.length}`));
      baseSnippets.push(formatSnippet("release_handoff", reviewOps.releaseHandoff.state));
      if (reviewOps.recommendedNextSteps.length > 0) {
        baseSnippets.push(formatSnippet("review_next", reviewOps.recommendedNextSteps[0]));
      }
    }
    if (memoryContext?.auditRelease.releaseDecisions.length) {
      baseSnippets.push(formatSnippet("release_history", `${memoryContext.auditRelease.releaseDecisions.length} prior decisions`));
    }
  }

  const filteredSnippets = baseSnippets
    .filter((snippet) => snippet.value.trim().length > 0)
    .slice(0, 10);

  return {
    id: `${target}-${workspace.currentChatSessionId}`,
    target,
    chatType,
    taskId: activeTask?.id,
    taskStatus: activeTask?.status ?? workspace.currentTaskStatus,
    auditVerdict: workspace.auditGateVerdict,
    agentId,
    assembledAtIso: new Date().toISOString(),
    summary: toSummaryLine(filteredSnippets),
    snippets: filteredSnippets,
    blockers: blockers.slice(0, 4),
    releaseStatus: workspace.releaseReadinessStatus,
  };
}

export function buildContextPrompt(packet: ContextInjectionPacket): string {
  const snippetLines = packet.snippets.map((snippet) => `- ${snippet.label}: ${snippet.value}`).join("\n");
  const blockerLine = packet.blockers.length > 0 ? `\nActive blockers:\n- ${packet.blockers.join("\n- ")}` : "\nActive blockers: none";
  return `Context packet (${packet.target})\n${snippetLines}${blockerLine}`;
}
