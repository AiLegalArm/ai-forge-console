import type { SeveritySummary } from "@/types/audits";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import type { OperatorDashboardState, OperatorProjectSummary, ExecutionDrillDown } from "@/types/operator-dashboard";


export type OperatorDashboardWorkspaceInput = Pick<WorkspaceRuntimeState,
  "workflow"
  | "auditors"
  | "releaseControl"
  | "pendingApprovals"
  | "localInference"
  | "activeAgents"
  | "activeProjectId"
  | "releaseReadinessStatus"
>

export interface OperatorProjectSnapshot {
  projectId: string;
  projectName: string;
  providerSource: "openrouter" | "ollama";
  activeModel: string;
  routingProfile: WorkspaceRuntimeState["routingProfile"];
  workflow: Pick<WorkspaceRuntimeState["workflow"], "tasks" | "subtasks" | "executionTraces" | "approvals">;
  localInference: Pick<WorkspaceRuntimeState["localInference"], "resources" | "operational">;
}

const emptySeverity = (): SeveritySummary => ({ info: 0, low: 0, medium: 0, high: 0, critical: 0 });

const toReleaseReadiness = (status: OperatorDashboardWorkspaceInput["releaseReadinessStatus"]): OperatorProjectSummary["releaseReadiness"] => {
  if (status === "go") return "go";
  if (status === "warning" || status === "ready") return "warning";
  return "blocked";
};

export function buildOperatorDashboard(
  workspace: OperatorDashboardWorkspaceInput,
  projectSnapshots: OperatorProjectSnapshot[],
): OperatorDashboardState {
  const activeTaskStatuses = new Set(["in_progress", "assigned", "accepted", "queued", "awaiting_approval"]);
  const activeSubtaskStatuses = new Set(["in_progress", "assigned", "accepted", "queued", "awaiting_approval"]);

  const taskBlockerIds = workspace.workflow.tasks
    .filter((task) => task.status === "blocked")
    .map((task) => task.id);

  const auditBlockerIds = workspace.auditors.blockers
    .filter((blocker) => blocker.status === "active")
    .map((blocker) => blocker.id);

  const releaseBlockerIds = workspace.releaseControl.finalDecision.blockers;
  const approvalBlockerIds = workspace.pendingApprovals.map((approval) => approval.id);
  const providerRuntimeBlockers = [
    ...(workspace.localInference.resources.degradedMode ? ["runtime_degraded"] : []),
    ...(workspace.localInference.operational.degradedMode ? ["provider_degraded"] : []),
  ];

  const executionDrillDowns: ExecutionDrillDown[] = workspace.workflow.executionTraces
    .map((trace) => {
      const whySelected = [trace.routingDecision ?? "routing metadata unavailable"];
      if (trace.fallbackUsed) whySelected.push("fallback path triggered after provider/routing pressure");
      if (trace.summary.providerModelLabel) whySelected.push(`provider model: ${trace.summary.providerModelLabel}`);

      const findingsOrBlockers = [
        ...trace.summary.linkedBlockerIds,
        ...trace.summary.linkedFindingIds,
      ];

      const approvalInteractions = workspace.workflow.approvals
        .filter((approval) => approval.id === trace.approvalId || approval.taskId === trace.taskId)
        .map((approval) => `${approval.id}:${approval.status}`);

      return {
        traceId: trace.traceId,
        runId: trace.runId,
        actor: {
          role: trace.auditorId ? "auditor" : trace.agentId ? "agent" : "orchestrator",
          id: trace.auditorId ?? trace.agentId,
        },
        linked: {
          taskId: trace.taskId,
          subtaskId: trace.subtaskId,
          approvalId: trace.approvalId,
          releaseDecisionId: trace.releaseDecisionId,
        },
        providerModel: {
          provider: trace.provider,
          model: trace.model,
        },
        routing: {
          decision: trace.routingDecision,
          whySelected,
          fallbackUsed: trace.fallbackUsed,
          degradedExecution: workspace.localInference.resources.degradedMode || workspace.localInference.operational.degradedMode,
          contributedToFailure: trace.error?.type === "routing_failure" || trace.error?.type === "fallback_failure",
          costControlSignal: trace.fallbackUsed || workspace.localInference.operational.budgetPressure !== "normal" ? "observed" : "none",
        },
        status: trace.status,
        failureType: trace.error?.type,
        steps: trace.steps,
        findingsOrBlockers,
        approvalInteractions,
        outcome: trace.summary.outcome,
        updatedAtIso: trace.updatedAtIso,
      };
    })
    .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));

  const projectSummaries: OperatorProjectSummary[] = projectSnapshots.map((snapshot) => {
    const activeTaskCount = snapshot.workflow.tasks.filter((task) => activeTaskStatuses.has(task.status)).length;
    const blockedTaskCount = snapshot.workflow.tasks.filter((task) => task.status === "blocked").length;
    const activeSubtaskCount = snapshot.workflow.subtasks.filter((subtask) => activeSubtaskStatuses.has(subtask.status)).length;
    const criticalFailures = snapshot.workflow.executionTraces
      .filter((trace) => trace.finalResultState === "failed" || trace.error?.type === "routing_failure" || trace.error?.type === "fallback_failure")
      .slice(0, 3)
      .map((trace) => trace.traceId);

    const activeAgentCount = workspace.activeAgents.filter((agent) => agent.status === "running").length;
    const idleAgentCount = Math.max(0, workspace.activeAgents.length - activeAgentCount);

    return {
      projectId: snapshot.projectId,
      projectName: snapshot.projectName,
      isActiveProject: snapshot.projectId === workspace.activeProjectId,
      activeTaskCount,
      blockedTaskCount,
      activeSubtaskCount,
      agentUtilization: {
        active: activeAgentCount,
        idle: idleAgentCount,
        utilizationRatio: workspace.activeAgents.length > 0 ? activeAgentCount / workspace.activeAgents.length : 0,
      },
      providerModelState: {
        providerSource: snapshot.providerSource,
        model: snapshot.activeModel,
        degraded: snapshot.localInference.resources.degradedMode || snapshot.localInference.operational.degradedMode,
        routingProfile: snapshot.routingProfile,
      },
      releaseReadiness: toReleaseReadiness(workspace.releaseReadinessStatus),
      auditSeveritySummary: workspace.auditors.runs[0]?.severitySummary ?? emptySeverity(),
      recentCriticalExecutionFailures: criticalFailures,
    };
  });

  const routingAnomalies = executionDrillDowns.filter((drill) => drill.routing.contributedToFailure || drill.routing.fallbackUsed).length;
  const executionFailures = executionDrillDowns.filter((drill) => drill.outcome === "failed").length;

  return {
    globalSummary: {
      activeTasks: workspace.workflow.tasks.filter((task) => activeTaskStatuses.has(task.status)).length,
      blockedTasks: taskBlockerIds.length,
      activeSubtasks: workspace.workflow.subtasks.filter((subtask) => activeSubtaskStatuses.has(subtask.status)).length,
      activeAgents: workspace.activeAgents.filter((agent) => agent.status === "running").length,
      activeAuditors: workspace.auditors.auditors.filter((auditor) => auditor.runState === "running" || auditor.runState === "queued").length,
      pendingApprovals: workspace.pendingApprovals.length,
      releaseBlockers: releaseBlockerIds.length,
      executionFailures,
      routingAnomalies,
      degradedProviderRuntime: workspace.localInference.resources.degradedMode || workspace.localInference.operational.degradedMode,
    },
    projectSummaries,
    executionDrillDowns,
    blockers: [
      { type: "task", count: taskBlockerIds.length, ids: taskBlockerIds },
      { type: "audit", count: auditBlockerIds.length, ids: auditBlockerIds },
      { type: "release", count: releaseBlockerIds.length, ids: releaseBlockerIds },
      { type: "provider_runtime", count: providerRuntimeBlockers.length, ids: providerRuntimeBlockers },
      { type: "approval", count: approvalBlockerIds.length, ids: approvalBlockerIds },
    ],
    entryPoints: {
      fromActivityStream: workspace.workflow.activityEvents.filter((event) => event.traceId).map((event) => event.traceId ?? ""),
      fromTaskGraph: workspace.workflow.tasks.map((task) => task.linkedExecutionContext?.executionContextId ?? "").filter(Boolean),
      fromAuditSummaries: workspace.auditors.runs.map((run) => run.id),
      fromReleaseSurface: workspace.releaseControl.finalDecision.blockers,
      fromDashboardCards: executionDrillDowns.slice(0, 5).map((drill) => drill.traceId),
    },
    criticalEvents: workspace.workflow.activityEvents
      .filter((event) => event.severity === "critical")
      .slice(0, 6)
      .map((event) => ({
        id: event.id,
        title: event.title,
        severity: event.severity,
        traceId: event.traceId,
      })),
  };
}
