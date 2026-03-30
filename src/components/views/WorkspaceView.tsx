import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatContextBar } from "@/components/chat/ChatContextBar";
import { AgentActivityPanel } from "@/components/chat/AgentActivityPanel";
import { useMemo, useState } from "react";
import type { ChatState, ChatType } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import type { AppRoutingModeProfile } from "@/types/local-inference";
import type { WorkflowApproval, WorkflowTask } from "@/types/workflow";
import type { NavSection, AppMode } from "@/components/layout/AppLayout";
import { useI18n } from "@/lib/i18n";
import {
  Files,
  GitBranch,
  Rocket,
  Globe,
  CheckCircle,
  Play,
  Clock,
  XCircle,
  GitCommitHorizontal,
  Upload,
  ShieldAlert,
  Palette,
  MonitorPlay,
  Camera,
  AlertTriangle,
  Radar,
  Bot,
  Flag,
} from "lucide-react";

const taskStatusIcons: Record<WorkflowTask["status"], React.ReactNode> = {
  proposed: <Clock className="h-3 w-3 text-muted-foreground" />,
  assigned: <Clock className="h-3 w-3 text-primary" />,
  accepted: <Clock className="h-3 w-3 text-primary" />,
  completed: <CheckCircle className="h-3 w-3 text-success" />,
  in_progress: <Play className="h-3 w-3 text-primary animate-pulse" />,
  queued: <Clock className="h-3 w-3 text-muted-foreground" />,
  blocked: <XCircle className="h-3 w-3 text-destructive" />,
  awaiting_approval: <Clock className="h-3 w-3 text-warning" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
  cancelled: <XCircle className="h-3 w-3 text-muted-foreground" />,
};

interface WorkspaceViewProps {
  section: NavSection;
  mode: AppMode;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
  chatState: ChatState;
  onConversationTypeChange: (conversation: ChatType) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onSendMessage: (conversation: ChatType) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve: (approvalId: string) => void | Promise<void>;
  onGitAction: (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull" | "prepare_pr" | "create_pr", taskId: string) => Promise<void>;
  onRunBrowserScenario: () => Promise<void>;
  onProviderSourceChange: (source: "openrouter" | "ollama") => void;
  onModelChange: (model: string) => void;
  onDeploymentModeChange: (mode: "local" | "cloud" | "hybrid") => void;
  onRoutingProfileChange: (profile: AppRoutingModeProfile) => void;
  onAddLocalProject: (payload?: { name?: string; localPath?: string; projectRoot?: string }) => Promise<{ ok: boolean; message: string; path?: string }>;
  onCreateProject: (payload: { name: string; description?: string; projectType?: string }) => void;
  onConnectRepository: (payload: { pathOrUrl: string; name?: string; branch?: string }) => Promise<{ ok: boolean; code: string; message: string }>;
  onDisconnectRepository: () => void;
  onActiveProjectChange: (projectId: string) => void;
  onFocusTask: (taskId: string) => void;
  onLaunchTask: (taskId: string) => void;
  onTriggerDeploy: (environment: "preview" | "production") => Promise<{ ok: boolean; message: string }>;
  onRefreshDeployStatus: (deploymentId: string) => Promise<{ ok: boolean; message: string }>;
}

export function WorkspaceView({ section, mode, workspaceState, chatContexts, chatState, onConversationTypeChange, onDraftChange, onSendMessage, onApprovalResolve, onWorkflowApprovalResolve, onGitAction, onRunBrowserScenario, onProviderSourceChange, onModelChange, onDeploymentModeChange, onRoutingProfileChange, onAddLocalProject, onCreateProject, onConnectRepository, onDisconnectRepository, onActiveProjectChange, onFocusTask, onLaunchTask, onTriggerDeploy, onRefreshDeployStatus }: WorkspaceViewProps) {
  if (section === "files") return <FilesView />;
  if (section === "git") return <GitView workspaceState={workspaceState} onGitAction={onGitAction} />;
  if (section === "deploy") return <DeployView workspaceState={workspaceState} onTriggerDeploy={onTriggerDeploy} onRefreshDeployStatus={onRefreshDeployStatus} />;
  if (section === "domains") return <DomainsView workspaceState={workspaceState} />;
  if (section === "design") return <DesignView workspaceState={workspaceState} />;
  if (section === "browser") return <BrowserView workspaceState={workspaceState} onRunBrowserScenario={onRunBrowserScenario} />;

  return (
    <div className="flex flex-col h-full">
      <ChatContextBar workspaceState={workspaceState} chatState={chatState} />
      <AgentActivityPanel activeAgents={workspaceState.activeAgents} events={workspaceState.workflow.activityEvents} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel workspaceState={workspaceState} chatState={chatState} chatContexts={chatContexts} onConversationTypeChange={onConversationTypeChange} onDraftChange={onDraftChange} onSendMessage={onSendMessage} onApprovalResolve={onApprovalResolve} onWorkflowApprovalResolve={onWorkflowApprovalResolve} onProviderSourceChange={onProviderSourceChange} onModelChange={onModelChange} onDeploymentModeChange={onDeploymentModeChange} onRoutingProfileChange={onRoutingProfileChange} onAddLocalProject={onAddLocalProject} onCreateProject={onCreateProject} onConnectRepository={onConnectRepository} onDisconnectRepository={onDisconnectRepository} onActiveProjectChange={onActiveProjectChange} />
        </div>
        <div className="w-64 border-l border-border bg-card overflow-auto shrink-0 hidden lg:block">
          <SideRail mode={mode} workspaceState={workspaceState} chatState={chatState} onWorkflowApprovalResolve={onWorkflowApprovalResolve} onFocusTask={onFocusTask} onLaunchTask={onLaunchTask} />
        </div>
      </div>
    </div>
  );
}

function SideRail({ mode, workspaceState, chatState, onWorkflowApprovalResolve, onFocusTask, onLaunchTask }: { mode: AppMode; workspaceState: WorkspaceRuntimeState; chatState: ChatState; onWorkflowApprovalResolve: (approvalId: string) => void | Promise<void>; onFocusTask: (taskId: string) => void; onLaunchTask: (taskId: string) => void }) {
  const { t } = useI18n();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const tasks = workspaceState.workflow.tasks;
  const subtasks = workspaceState.workflow.subtasks;
  const completed = tasks.filter((s) => s.status === "completed").length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  const activeSession = chatState.sessions.find((session) => session.id === workspaceState.currentChatSessionId);
  const linkedContext = activeSession?.linked;
  const activeTask = tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId) ?? tasks[0];
  const parentTask = tasks.find((task) => task.id === "task-rbac") ?? activeTask;
  const delegatedSubtasks = subtasks.filter((subtask) => subtask.parentTaskId === parentTask?.id);
  const taskEvidence = activeTask?.id ? workspaceState.evidenceFlow.linkedByTaskId[activeTask.id] ?? [] : [];
  const blockerEvidence = workspaceState.evidenceFlow.records.filter((record) => record.blocking);
  const blockedSubtasks = delegatedSubtasks.filter((subtask) => subtask.status === "blocked");
  const completedSubtasks = delegatedSubtasks.filter((subtask) => subtask.status === "completed");
  const activeBlockers = workspaceState.workflow.tasks.filter((task) => task.status === "blocked" || (task.designBrowserBlockers ?? 0) > 0);
  const criticalPath = workspaceState.workflow.tasks.filter((task) => task.status !== "completed" && task.phase !== "planning");
  const activeReleaseTask = workspaceState.workflow.tasks.find((task) => task.phase === "release");
  const operatorMode = mode === "operator";
  const operatorDashboard = workspaceState.operatorDashboard;
  const selectedDrillDown = useMemo(
    () => operatorDashboard.executionDrillDowns.find((trace) => trace.traceId === selectedTraceId) ?? operatorDashboard.executionDrillDowns[0],
    [operatorDashboard.executionDrillDowns, selectedTraceId],
  );

  return (
    <div className="p-2.5 space-y-3 text-xs">
      <div className={`rounded border p-2 ${operatorMode ? "border-primary/50 bg-primary/5" : "border-border bg-card/50"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-foreground flex items-center gap-1"><Radar className="h-3 w-3 text-primary" /> Operator Mode</span>
          <span className={`text-[9px] font-mono uppercase ${operatorMode ? "text-success" : "text-muted-foreground"}`}>{operatorMode ? "active" : "standby"}</span>
        </div>
        <div className="mt-2 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">project</span><span className="font-mono text-foreground truncate max-w-[120px]">{workspaceState.currentProject}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">task</span><span className="font-mono text-primary truncate max-w-[120px]">{activeTask?.id ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">provider/model</span><span className="font-mono text-foreground truncate max-w-[120px]">{workspaceState.providerSource}/{workspaceState.activeModel}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">routing</span><span className="font-mono text-foreground uppercase">{workspaceState.routingMode.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">budget pressure</span><span className={`font-mono uppercase ${workspaceState.localInference.operational.budgetPressure === "critical" ? "text-destructive" : workspaceState.localInference.operational.budgetPressure === "high" ? "text-warning" : "text-foreground"}`}>{workspaceState.localInference.operational.budgetPressure}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">degraded mode</span><span className={`font-mono uppercase ${workspaceState.localInference.operational.degradedMode ? "text-warning" : "text-success"}`}>{workspaceState.localInference.operational.degradedMode ? "enabled" : "off"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">fallback activity</span><span className="font-mono text-info">{workspaceState.localInference.operational.fallbackEvents.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">release readiness</span><span className={`font-mono uppercase ${workspaceState.releaseControl.operations.goNoGo.status === "go" ? "text-success" : "text-destructive"}`}>{workspaceState.releaseControl.operations.goNoGo.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">missing approvals</span><span className="font-mono text-warning">{workspaceState.releaseControl.operations.approvalSummary.missing.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">rollback readiness</span><span className={`font-mono uppercase ${workspaceState.releaseControl.operations.readiness.rollback === "ready" ? "text-success" : "text-warning"}`}>{workspaceState.releaseControl.operations.readiness.rollback}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">operator dashboard</span>
        <div className="mt-1.5 rounded border border-border p-2 space-y-1 text-[10px]">
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded border border-border p-1"><div className="text-muted-foreground">active tasks</div><div className="font-mono text-primary">{operatorDashboard.globalSummary.activeTasks}</div></div>
            <div className="rounded border border-border p-1"><div className="text-muted-foreground">blocked</div><div className="font-mono text-destructive">{operatorDashboard.globalSummary.blockedTasks}</div></div>
            <div className="rounded border border-border p-1"><div className="text-muted-foreground">pending approvals</div><div className="font-mono text-warning">{operatorDashboard.globalSummary.pendingApprovals}</div></div>
            <div className="rounded border border-border p-1"><div className="text-muted-foreground">routing anomalies</div><div className="font-mono text-warning">{operatorDashboard.globalSummary.routingAnomalies}</div></div>
          </div>
          <div className="text-muted-foreground">release blockers {workspaceState.releaseControl.operations.blockerSummary.total} • failures {workspaceState.releaseControl.operations.decisionFactors.unresolvedExecutionFailures}</div>
          <div className={`font-mono uppercase ${operatorDashboard.globalSummary.degradedProviderRuntime ? "text-warning" : "text-success"}`}>
            provider/runtime {operatorDashboard.globalSummary.degradedProviderRuntime ? "degraded" : "healthy"}
          </div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">project summaries</span>
        <div className="mt-1.5 space-y-1">
          {operatorDashboard.projectSummaries.map((project) => (
            <div key={project.projectId} className={`rounded border p-1.5 text-[10px] ${project.isActiveProject ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <div className="font-mono text-foreground truncate">{project.projectName}</div>
              <div className="text-muted-foreground">active {project.activeTaskCount} • blocked {project.blockedTaskCount} • subtasks {project.activeSubtaskCount}</div>
              <div className="text-muted-foreground">agents {project.agentUtilization.active}/{project.agentUtilization.active + project.agentUtilization.idle} • {(project.agentUtilization.utilizationRatio * 100).toFixed(0)}%</div>
              <div className="text-muted-foreground">{project.providerModelState.providerSource}/{project.providerModelState.model} • {project.providerModelState.routingProfile}</div>
              <div className={`${project.releaseReadiness === "go" ? "text-success" : "text-warning"} font-mono uppercase`}>release {project.releaseReadiness}</div>
              <div className="text-muted-foreground">audit sev c:{project.auditSeveritySummary.critical} h:{project.auditSeveritySummary.high} m:{project.auditSeveritySummary.medium}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">execution drill-down</span>
        <div className="mt-1.5 rounded border border-border p-2 space-y-1 text-[10px]">
          <div className="flex flex-wrap gap-1">
            {operatorDashboard.entryPoints.fromDashboardCards.slice(0, 4).map((traceId) => (
              <button key={traceId} onClick={() => setSelectedTraceId(traceId)} className={`border rounded px-1 py-0.5 font-mono ${selectedDrillDown?.traceId === traceId ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>card:{traceId}</button>
            ))}
            {operatorDashboard.entryPoints.fromActivityStream.slice(0, 2).map((traceId) => (
              <button key={`act-${traceId}`} onClick={() => setSelectedTraceId(traceId)} className="border border-border rounded px-1 py-0.5 font-mono text-muted-foreground">activity:{traceId}</button>
            ))}
            {operatorDashboard.entryPoints.fromTaskGraph.slice(0, 2).map((traceId) => (
              <button key={`task-${traceId}`} onClick={() => setSelectedTraceId(traceId)} className="border border-border rounded px-1 py-0.5 font-mono text-muted-foreground">task:{traceId}</button>
            ))}
          </div>
          {selectedDrillDown ? (
            <div className="space-y-1">
              <div className="font-mono text-foreground">{selectedDrillDown.traceId} • {selectedDrillDown.runId}</div>
              <div className="text-muted-foreground">{selectedDrillDown.actor.role} {selectedDrillDown.actor.id ?? "system"} • task {selectedDrillDown.linked.taskId ?? "—"} / subtask {selectedDrillDown.linked.subtaskId ?? "—"}</div>
              <div className="text-muted-foreground">provider/model {selectedDrillDown.providerModel.provider ?? "—"}/{selectedDrillDown.providerModel.model ?? "—"}</div>
              <div className="text-muted-foreground">routing: {selectedDrillDown.routing.decision ?? "n/a"} • fallback {selectedDrillDown.routing.fallbackUsed ? "yes" : "no"} • degraded {selectedDrillDown.routing.degradedExecution ? "yes" : "no"}</div>
              <div className="text-muted-foreground">cost control {selectedDrillDown.routing.costControlSignal} • outcome {selectedDrillDown.outcome}</div>
              <div className="text-muted-foreground">approvals {selectedDrillDown.approvalInteractions.join(", ") || "none"} • blockers/findings {selectedDrillDown.findingsOrBlockers.join(", ") || "none"}</div>
              <div className="text-muted-foreground">steps {selectedDrillDown.steps.length} • final status {selectedDrillDown.status}{selectedDrillDown.failureType ? ` • ${selectedDrillDown.failureType}` : ""}</div>
            </div>
          ) : <div className="text-muted-foreground">No execution traces available.</div>}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">task launch + focus</span>
        <div className="mt-1.5 space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="rounded border border-border p-1.5">
              <div className="flex items-center gap-1.5">
                {taskStatusIcons[task.status]}
                <span className="text-[10px] text-foreground truncate">{task.title}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">{task.phase} • {task.status} • owner {task.ownerAgentId ?? "orchestrator"}</div>
              <div className="mt-1 flex gap-1">
                <button onClick={() => onLaunchTask(task.id)} className="text-[9px] font-mono border border-primary/30 text-primary rounded px-1.5 py-0.5 hover:bg-primary/10">launch</button>
                <button onClick={() => onFocusTask(task.id)} className="text-[9px] font-mono border border-border rounded px-1.5 py-0.5 hover:bg-muted">focus</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><GitCommitHorizontal className="h-3 w-3" /> subtask command map</span>
        <div className="mt-1.5 rounded border border-border p-2 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">parent task</span><span className="font-mono text-foreground">{parentTask?.id ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">active subtasks</span><span className="font-mono text-primary">{delegatedSubtasks.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">blocked</span><span className="font-mono text-destructive">{blockedSubtasks.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">completed</span><span className="font-mono text-success">{completedSubtasks.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">critical path</span><span className="font-mono text-warning">{criticalPath.map((task) => task.id).join(" → ")}</span></div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.task_graph" as never)}</span>
          <span className="text-[10px] font-mono text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-0.5">
          {parentTask ? (
            <div className="py-1 border-b border-border/30">
              <div className="flex items-center gap-1.5">
                {taskStatusIcons[parentTask.status]}
                <span className="text-[10px] text-foreground truncate font-semibold">{parentTask.title}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono pl-4">
                owner {parentTask.ownerAgentId ?? "orchestrator"} • {Math.round(parentTask.completionRate ?? 0)}% rollup
              </div>
            </div>
          ) : null}
          {delegatedSubtasks.map((subtask) => (
            <div key={subtask.id} className="py-1 border-b border-border/30 last:border-0 pl-2">
              <div className="flex items-center gap-1.5">
                {taskStatusIcons[subtask.status]}
                <span className="text-[10px] text-foreground truncate">{subtask.title}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono pl-4">
                {subtask.assignedAgentId} • {subtask.priority} • {subtask.status}
              </div>
            </div>
          ))}
          {tasks.filter((task) => !task.parentTaskId).map((task) => (
            <div key={task.id} className="py-1 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-1.5">
                {taskStatusIcons[task.status]}
                <span className="text-[10px] text-foreground truncate">{task.title}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono pl-4">{task.phase} • {task.github?.branchLifecycle ?? "no_branch"}</div>
              {task.rollup ? (
                <div className="text-[9px] font-mono pl-4 text-muted-foreground">
                  subtasks {task.rollup.completedSubtasks}/{task.rollup.totalSubtasks} • blocked {task.rollup.blockedSubtasks}
                </div>
              ) : null}
              {task.designBrowserBlockers ? (
                <div className="text-[9px] text-warning font-mono pl-4">{t("rail.design_blockers" as never)} {task.designBrowserBlockers}</div>
              ) : null}
              {task.rollup?.blockerIds.length ? (
                <div className="text-[9px] text-destructive font-mono pl-4">audit blockers: {task.rollup.blockerIds.length}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">delegations</span>
        <div className="mt-1.5 space-y-1">
          {workspaceState.workflow.delegations.map((delegation) => (
            <div key={delegation.id} className="rounded border border-border p-1.5 text-[10px]">
              <div className="text-foreground font-mono truncate">
                {delegation.subtaskId} → {delegation.toAgentId}
              </div>
              <div className="text-muted-foreground">
                {delegation.state} • {delegation.assignmentMetadata.expectedOutcome}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><Flag className="h-3 w-3 text-warning" /> approval command center</span>
        <div className="mt-1.5 space-y-1">
          {workspaceState.pendingApprovals.length === 0 ? (
            <div className="text-[10px] text-muted-foreground font-mono">{t("rail.no_approvals" as never)}</div>
          ) : (
            workspaceState.pendingApprovals.map((approval: WorkflowApproval) => (
              <div key={approval.id} className="rounded border border-warning/30 bg-warning/5 p-1.5">
                <div className="text-[10px] text-warning font-mono">{approval.category}</div>
                <div className="text-[10px] text-foreground">{approval.title}</div>
                <div className="text-[9px] text-muted-foreground font-mono">task {approval.taskId ?? "—"} • agent {approval.agentId ?? "operator"} • risk {approval.category}</div>
                <button onClick={() => onWorkflowApprovalResolve(approval.id)} className="mt-1 text-[10px] font-mono text-primary hover:underline">
                  {t("chat.approve" as never)}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">agent commands</span>
        <div className="mt-1.5 space-y-1">
          {workspaceState.workflow.agentCommandRequests.slice(0, 3).map((request) => (
            <div key={request.id} className="rounded border border-border p-1.5 text-[10px]">
              <div className="text-foreground font-mono truncate">{request.rawCommand}</div>
              <div className="text-muted-foreground">{request.origin.replace(/_/g, " ")} • {request.executionState}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.github_flow" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.branch" as never)}</span><span className="text-foreground font-mono truncate max-w-[130px]">{activeTask?.github?.branch?.localBranchName ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.task_link" as never)}</span><span className="text-primary font-mono">{activeTask?.id ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.sync_mode" as never)}</span><span className="text-foreground font-mono uppercase">{activeTask?.github?.syncMode ?? "manual"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.push_gate" as never)}</span><span className="text-warning font-mono">{activeTask?.github?.pushWorkflow.requiresApproval ? t("rail.approval_required" as never) : t("rail.no_gate" as never)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.review" as never)}</span><span className="text-foreground font-mono">{activeTask?.github?.pullRequest?.status ?? "—"}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.evidence" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.task_evidence" as never)}</span><span className="text-foreground font-mono">{taskEvidence.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.blocking" as never)}</span><span className="text-destructive font-mono">{blockerEvidence.length}</span></div>
          {taskEvidence.slice(0, 2).map((evidenceId) => (
            <div key={evidenceId} className="text-muted-foreground truncate">• {workspaceState.evidenceFlow.records.find((entry) => entry.id === evidenceId)?.title ?? evidenceId}</div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-warning" /> audit control</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">active blockers</span><span className="text-destructive font-mono">{activeBlockers.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">severity overview</span><span className="text-warning font-mono uppercase">{activeBlockers.length > 0 ? "elevated" : "stable"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.audit_link" as never)}</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "audit")?.linkedAuditId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.review_link" as never)}</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "release")?.linkedReviewId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.design_state" as never)}</span><span className="text-foreground font-mono">{workspaceState.designSession.state}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.browser_run" as never)}</span><span className="text-foreground font-mono">{workspaceState.browserSession.runState}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.mode" as never)}</span><span className="text-primary font-mono uppercase">{mode}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-1"><Bot className="h-3 w-3 text-primary" /> release command layer</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">release candidate</span><span className="text-foreground font-mono">{activeReleaseTask?.linkedReleaseCandidateId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.decision" as never)}</span><span className={`font-mono uppercase ${workspaceState.releaseControl.operations.goNoGo.status === "go" ? "text-success" : "text-destructive"}`}>{workspaceState.releaseControl.operations.goNoGo.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.blockers" as never)}</span><span className="font-mono text-destructive">{workspaceState.releaseControl.operations.blockerSummary.total}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.warnings" as never)}</span><span className="font-mono text-warning">{workspaceState.releaseControl.operations.goNoGo.warnings.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.pending_approvals" as never)}</span><span className="font-mono text-warning">{workspaceState.releaseControl.operations.approvalSummary.missing.length}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.chat_link" as never)}</span>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-muted-foreground"><span>{t("rail.session" as never)}</span><span className="text-foreground font-mono truncate max-w-[120px]">{activeSession?.title}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("rail.task_graph" as never)}</span><span className="text-foreground font-mono">{linkedContext?.taskId ?? "—"}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("rail.agent_link" as never)}</span><span className="text-foreground font-mono">{linkedContext?.agentName ?? "—"}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("rail.audit_link" as never)}</span><span className="text-foreground font-mono">{linkedContext?.auditFindingId ?? "—"}</span></div>
        </div>
      </div>


      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.backend_routing" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.conv_mode" as never)}</span><span className="text-primary font-mono uppercase">{(workspaceState.localInference.routing.conversationOverrides[workspaceState.currentChatSessionId] ?? workspaceState.localInference.routing.activeMode).replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.privacy_mode" as never)}</span><span className="text-success font-mono uppercase">{workspaceState.localInference.routing.rules.find((rule) => rule.scope === "task" && rule.scopeRefId === activeTask?.id)?.privacyMode ?? "standard"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.active_model" as never)}</span><span className="text-foreground font-mono">{workspaceState.localInference.modelRegistry.find((model) => model.id === workspaceState.localInference.ollama.selectedModelId)?.displayName ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.fallback" as never)}</span><span className={`font-mono ${workspaceState.localInference.resources.autoFallbackReady ? "text-success" : "text-warning"}`}>{workspaceState.localInference.resources.autoFallbackReady ? t("rail.yes" as never) : t("rail.no" as never)}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.local_resources" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.concurrent" as never)}</span><span className="text-foreground font-mono">{workspaceState.localInference.resources.activeJobs}/{workspaceState.localInference.resources.maxConcurrentJobs}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.queue" as never)}</span><span className="text-warning font-mono">{workspaceState.localInference.resources.queuedJobs}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.pressure" as never)}</span><span className="text-foreground font-mono uppercase">{workspaceState.localInference.resources.resourcePressure}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.degraded" as never)}</span><span className={`font-mono ${workspaceState.localInference.resources.degradedMode ? "text-warning" : "text-success"}`}>{workspaceState.localInference.resources.degradedMode ? t("rail.yes" as never) : t("rail.no" as never)}</span></div>
        </div>
      </div>


      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.local_shell" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.exec_mode" as never)}</span><span className="text-primary font-mono uppercase">{workspaceState.localShell.executionMode.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.workspace" as never)}</span><span className="text-foreground font-mono truncate max-w-[120px]">{workspaceState.localShell.project.workspaceName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.instructions" as never)}</span><span className={`font-mono ${workspaceState.localShell.project.projectInstructionsDetected ? "text-success" : "text-warning"}`}>{workspaceState.localShell.project.projectInstructionsDetected ? t("rail.detected" as never) : t("rail.missing" as never)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.git_changes" as never)}</span><span className={`font-mono ${workspaceState.localShell.project.hasLocalChanges ? "text-warning" : "text-success"}`}>{workspaceState.localShell.project.hasLocalChanges ? t("rail.dirty" as never) : t("rail.clean" as never)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.terminal" as never)}</span><span className="text-foreground font-mono">{workspaceState.localShell.terminal.state}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.capability_gates" as never)}</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          {workspaceState.localShell.capabilities.map((gate) => (
            <div key={gate.capability} className="flex justify-between gap-2 text-muted-foreground">
              <span>{gate.capability.replace(/_/g, " ")}</span>
              <span className={`font-mono ${gate.requiresApproval ? "text-warning" : "text-success"}`}>{gate.requiresApproval ? "require_approval" : "allow"}</span>
            </div>
          ))}
          {workspaceState.policyState.lastDecision ? (
            <div className="mt-2 rounded border border-warning/30 bg-warning/5 p-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-warning font-mono uppercase">policy</span>
                <span
                  className={`font-mono ${
                    workspaceState.policyState.lastDecision.blocked
                      ? "text-destructive"
                      : workspaceState.policyState.lastDecision.requiresApproval
                        ? "text-warning"
                        : "text-success"
                  }`}
                >
                  {workspaceState.policyState.lastDecision.outcome}
                </span>
              </div>
              <div className="text-muted-foreground">{workspaceState.policyState.lastDecision.rationale}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("rail.per_agent" as never)}</span>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          {workspaceState.localInference.routing.agentAssignments.slice(0, 6).map((assignment) => (
            <div key={assignment.agentId} className="flex justify-between text-muted-foreground gap-1">
              <span className="truncate">{assignment.agentRole}</span>
              <span className="text-foreground font-mono truncate">{assignment.preferredBackend}→{assignment.fallbackBackend}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("memory")}</span>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-muted-foreground"><span>{t("snapshots")}</span><span className="text-foreground font-mono">{workspaceState.memory.tasks.length}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("context")}</span><span className="text-foreground font-mono">{workspaceState.contextEnvelope.decisions.length + workspaceState.contextEnvelope.chat.recentProjectActions.length} scoped</span></div>
          <div className="flex justify-between text-muted-foreground"><span>AGENTS.md</span><span className={`font-mono ${workspaceState.memory.project.discoveredInstructions.some((entry) => entry.toLowerCase().includes("agent")) ? "text-success" : "text-warning"}`}>{workspaceState.memory.project.discoveredInstructions.length > 0 ? t("ctx.synced") : t("rail.missing" as never)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Provider defaults</span><span className="text-primary font-mono">{workspaceState.memory.providerPreferences.preferredProvider}/{workspaceState.memory.providerPreferences.preferredModelByProvider[workspaceState.memory.providerPreferences.preferredProvider]}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Task blockers</span><span className={`font-mono ${workspaceState.contextEnvelope.task?.blockerSummary.length ? "text-warning" : "text-success"}`}>{workspaceState.contextEnvelope.task?.blockerSummary.length ?? 0}</span></div>
        </div>
      </div>
    </div>
  );
}

function DesignView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const session = workspaceState.designSession;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> {t("design.agent" as never)}</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("design.state" as never)}</span><span className="font-mono text-primary">{session.state}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("design.brief" as never)}</span><span className="font-mono text-foreground">{session.brief.title}</span></div>
        <div className="text-muted-foreground">{t("design.page_structure" as never)} {session.layoutProposal.pageStructure.join(" → ")}</div>
        <div className="text-muted-foreground">{t("design.components" as never)} {session.layoutProposal.componentInventory.join(", ")}</div>
        <div className="text-muted-foreground">{t("design.variants" as never)} {session.layoutProposal.statesAndVariants.join(", ")}</div>
        <div className="text-muted-foreground">{t("design.tokens" as never)} {session.tokenHandoff.designTokens.join(", ")}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="font-mono text-primary">{t("design.ux_concerns" as never)}</div>
        {session.findings.map((finding) => (
          <div key={finding.id} className="flex items-start gap-2 text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning" />
            <span>{finding.title}: {finding.concern}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserView({ workspaceState, onRunBrowserScenario }: { workspaceState: WorkspaceRuntimeState; onRunBrowserScenario: () => Promise<void> }) {
  const { t } = useI18n();
  const session = workspaceState.browserSession;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><MonitorPlay className="h-4 w-4 text-primary" /> {t("browser.agent" as never)}</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("browser.scenario" as never)}</span><span className="font-mono text-foreground">{session.scenario.title}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("browser.linked" as never)}</span><span className="font-mono text-foreground">{session.linkedTaskId ?? "—"} / {session.linkedChatId ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("browser.run_state" as never)}</span><span className={`font-mono ${session.runState === "failed" ? "text-destructive" : "text-primary"}`}>{session.runState}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("browser.session_result" as never)}</span><span className="font-mono text-foreground">{session.sessionState} / {session.resultState}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("browser.current_step" as never)}</span><span className="font-mono text-foreground">{session.currentStepId ?? "—"}</span></div>
        {session.scenario.steps.map((step) => (
          <div key={step.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground truncate">{step.label}</span>
            <span className={`font-mono ${step.status === "failed" ? "text-destructive" : "text-success"}`}>{step.status}</span>
          </div>
        ))}
        <button className="mt-2 text-[11px] border border-border rounded px-2 py-1 hover:bg-muted" onClick={() => void onRunBrowserScenario()}>
          {t("browser.run_scenario" as never)}
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="font-mono text-primary flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> {t("browser.evidence" as never)}</div>
        {session.findings.map((finding) => (
          <div key={finding.id} className="text-muted-foreground">• {finding.findingType}: {finding.summary}</div>
        ))}
        {session.failureState.state === "failed" ? (
          <div className="text-destructive">{t("browser.failure" as never)} {session.failureState.reason} — {session.failureState.message}</div>
        ) : null}
      </div>
    </div>
  );
}

function FilesView() {
  const { t } = useI18n();
  const files = [
    { name: "src/", children: ["components/", "hooks/", "lib/", "pages/", "data/", "App.tsx", "main.tsx", "index.css"] },
    { name: "supabase/", children: ["migrations/", "functions/", "config.toml"] },
    { name: "public/", children: ["favicon.ico", "robots.txt"] },
  ];
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Files className="h-4 w-4 text-primary" /> {t("files")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 font-mono text-xs space-y-1">
        {files.map((f) => (
          <div key={f.name}>
            <div className="text-primary cursor-pointer hover:underline">{f.name}</div>
            {f.children.map((c) => (<div key={c} className="ml-4 text-foreground cursor-pointer hover:text-primary">{c}</div>))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GitView({
  workspaceState,
  onGitAction,
}: {
  workspaceState: WorkspaceRuntimeState;
  onGitAction: (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull" | "prepare_pr" | "create_pr", taskId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const activeTask =
    workspaceState.workflow.tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId) ??
    workspaceState.workflow.tasks[0];
  const activeRepo = workspaceState.workflow.github.repositories.find(
    (repository) => repository.id === workspaceState.workflow.github.activeRepositoryId,
  );
  const branchState = activeTask?.github?.branch;
  const commitState = activeTask?.github?.commitWorkflow;
  const pushState = activeTask?.github?.pushWorkflow;
  const reviewState = activeTask?.github?.pullRequest;
  const openFindings = reviewState?.findings.filter((finding) => finding.status === "open") ?? [];
  const repoConnected = workspaceState.repository.connected || Boolean(activeRepo);
  const repoName = workspaceState.repository.name ?? (activeRepo ? `${activeRepo.owner}/${activeRepo.name}` : undefined);
  const dirty = workspaceState.localShell.project.hasLocalChanges || Boolean(commitState?.stagedChanges.hasUncommittedChanges);
  const lastGitEvent = [...workspaceState.workflow.activityEvents].reverse().find((event) =>
    ["review_triggered", "execution_update", "completed", "blocked"].includes(event.type) &&
    (event.title.toLowerCase().includes("git") || event.details?.toLowerCase().includes("branch") || event.details?.toLowerCase().includes("push")),
  );

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> {t("git")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono">
        <div><span className="text-muted-foreground block">repo</span><span className={repoConnected ? "text-success" : "text-warning"}>{repoConnected ? "connected" : "disconnected"}</span></div>
        <div><span className="text-muted-foreground block">branch</span><span className="text-foreground truncate">{workspaceState.currentBranch}</span></div>
        <div><span className="text-muted-foreground block">status</span><span className={dirty ? "text-warning" : "text-success"}>{dirty ? "dirty" : "clean"}</span></div>
        <div><span className="text-muted-foreground block">sync mode</span><span className="text-foreground uppercase">{activeTask?.github?.syncMode ?? workspaceState.workflow.github.globalSyncModeDefault}</span></div>
        <div><span className="text-muted-foreground block">task branch</span><span className="text-primary truncate">{branchState?.localBranchName ?? activeTask?.branchName ?? "none"}</span></div>
        <div><span className="text-muted-foreground block">project/repo</span><span className="text-foreground truncate">{workspaceState.currentProject} / {repoName ?? "none"}</span></div>
      </div>
      {lastGitEvent ? <div className="text-[10px] text-muted-foreground border border-border rounded px-2 py-1">last action: <span className="text-foreground">{lastGitEvent.title}</span> • {lastGitEvent.createdAtIso}</div> : null}
      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.repository" as never)}</span><span className="font-mono text-foreground">{repoName ?? t("git.not_connected" as never)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.remote")}</span><span className="font-mono text-foreground">{workspaceState.repository.url ?? activeRepo?.remoteUrl ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.connection" as never)}</span><span className="font-mono text-primary uppercase">{workspaceState.repository.readyForGitWorkflow ? "ready" : workspaceState.syncStatus}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.task_branch" as never)}</span><span className="font-mono text-primary">{branchState?.localBranchName ?? activeTask?.github?.branchLifecycle ?? "no_branch"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.branch_lifecycle" as never)}</span><span className="font-mono text-foreground">{activeTask?.github?.branchLifecycle ?? "no_branch"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">repo state</span><span className={`font-mono ${workspaceState.repository.clean ? "text-success" : "text-warning"}`}>{workspaceState.repository.clean ? "clean" : "dirty"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">project relation</span><span className="font-mono text-foreground">{workspaceState.repository.relationToProject ?? "unbound"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.sync_mode" as never)}</span><span className="font-mono text-foreground uppercase">{activeTask?.github?.syncMode ?? workspaceState.workflow.github.globalSyncModeDefault}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.review_mode" as never)}</span><span className="font-mono text-foreground uppercase">{activeTask?.github?.reviewMode ?? "chat_review"}</span></div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-primary"><GitCommitHorizontal className="h-3.5 w-3.5" /> {t("git.commit_push" as never)}</div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.dirty_staged" as never)}</span><span className="font-mono text-foreground">{commitState?.stagedChanges.hasUncommittedChanges ? `${commitState.stagedChanges.filesChanged} ${t("git.files" as never)}` : t("rail.clean" as never)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.draft_message" as never)}</span><span className="font-mono text-foreground truncate max-w-[320px]">{commitState?.draftMessage ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.commit_status" as never)}</span><span className="font-mono text-primary">{commitState?.status ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.push_status" as never)}</span><span className="font-mono text-primary">{pushState?.status ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.push_approval" as never)}</span><span className={`font-mono ${pushState?.requiresApproval ? "text-warning" : "text-success"}`}>{pushState?.requiresApproval ? t("git.required" as never) : t("git.not_required" as never)}</span></div>
        {pushState?.pendingError ? <div className="text-warning">{pushState.pendingError}</div> : null}
        {commitState?.pendingError ? <div className="text-destructive">{commitState.pendingError}</div> : null}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-primary"><Upload className="h-3.5 w-3.5" /> {t("git.review_audit" as never)}</div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.pr_status" as never)}</span><span className="font-mono text-foreground">{reviewState?.status ?? "not_opened"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">PR branch</span><span className="font-mono text-foreground">{reviewState?.sourceBranch && reviewState?.targetBranch ? `${reviewState.sourceBranch} → ${reviewState.targetBranch}` : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">PR draft</span><span className="font-mono text-foreground">{reviewState?.draftPreparationStatus ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">PR creation</span><span className="font-mono text-foreground">{reviewState?.creationStatus ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.review_chat" as never)}</span><span className="font-mono text-foreground">{reviewState?.reviewChatSessionId ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.auditors" as never)}</span><span className="font-mono text-foreground">{reviewState?.linkedAuditorIds.join(", ") ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.merge_readiness" as never)}</span><span className={`font-mono ${reviewState?.mergeReadiness === "blocked" ? "text-destructive" : "text-success"}`}>{reviewState?.mergeReadiness ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.release_gate" as never)}</span><span className={`font-mono ${reviewState?.releaseGateReadiness === "blocked" ? "text-warning" : "text-success"}`}>{reviewState?.releaseGateReadiness ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.open_findings" as never)}</span><span className="font-mono text-warning">{openFindings.length}</span></div>
        {openFindings[0] ? (
          <div className="flex items-center gap-1 text-warning">
            <ShieldAlert className="h-3 w-3" />
            <span className="truncate">{openFindings[0].title}</span>
          </div>
        ) : null}
        {reviewState?.pendingError ? <div className="text-warning">{reviewState.pendingError}</div> : null}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-1 text-xs">
        <div className="text-primary font-mono text-[11px]">Branch per task visibility</div>
        {workspaceState.workflow.tasks.slice(0, 6).map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-muted-foreground truncate">{task.title}</span>
            <span className="font-mono text-foreground truncate">{task.github?.branch?.localBranchName ?? task.branchName ?? task.github?.branchLifecycle ?? "no_branch"}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => activeTask && void onGitAction("stage_all", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.stage_all" as never)}</button>
        <button onClick={() => activeTask && void onGitAction("commit", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.commit" as never)}</button>
        <button onClick={() => activeTask && void onGitAction("push", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("git.push")}</button>
        <button onClick={() => activeTask && void onGitAction("prepare_pr", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Prepare PR</button>
        <button onClick={() => activeTask && void onGitAction("create_pr", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Create PR</button>
        <button onClick={() => activeTask && void onGitAction("pull", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.pull")}</button>
        <button onClick={() => activeTask && void onGitAction("pull", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.sync")}</button>
      </div>
    </div>
  );
}

function DeployView({ workspaceState, onTriggerDeploy, onRefreshDeployStatus }: {
  workspaceState: WorkspaceRuntimeState;
  onTriggerDeploy: (environment: "preview" | "production") => Promise<{ ok: boolean; message: string }>;
  onRefreshDeployStatus: (deploymentId: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const { t } = useI18n();
  const { deployments, releaseCandidates, operations } = workspaceState.releaseControl;
  const activeReleaseCandidate = releaseCandidates.find((candidate) => candidate.id === workspaceState.releaseControl.activeCandidateId);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> {t("deploy")}</h1>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-mono text-muted-foreground">{t("deploy.go_nogo" as never)}</span>
          <span className={`font-mono uppercase ${operations.goNoGo.status === "go" ? "text-success" : "text-destructive"}`}>{operations.goNoGo.status}</span>
        </div>
        <div className="text-muted-foreground">{operations.goNoGo.summary}</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Preview readiness</span><span className="font-mono">{operations.deployReadiness.previewStatus}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Production readiness</span><span className="font-mono">{operations.deployReadiness.productionStatus}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Deploy blockers</span><span className="font-mono text-warning">{operations.deployReadiness.blockers.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Release dependencies</span><span className="font-mono">{operations.deployReadiness.dependencyState}</span></div>
        </div>
      </div>

      <div className="space-y-2">
        {deployments.map((deployment) => (
          <div key={deployment.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${deployment.status === "blocked" || deployment.status === "failed" ? "bg-destructive" : deployment.status === "preview_ready" || deployment.status === "production_ready" ? "bg-primary" : "bg-success"}`} />
                <span className="font-semibold text-foreground">{deployment.environment}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{deployment.id}</span>
              </div>
              <span className={`font-mono uppercase ${deployment.status === "blocked" ? "text-destructive" : "text-primary"}`}>{deployment.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><span className="text-muted-foreground">{t("deploy.source" as never)}</span><div className="font-mono text-foreground">{deployment.source}</div></div>
              <div><span className="text-muted-foreground">{t("deploy.rollback_label" as never)}</span><div className={`font-mono ${deployment.rollbackAvailable ? "text-success" : "text-muted-foreground"}`}>{deployment.rollbackAvailable ? t("deploy.available" as never) : t("deploy.unavailable" as never)}</div></div>
              <div><span className="text-muted-foreground">{t("deploy.preview_target" as never)}</span><div className="font-mono text-foreground truncate">{deployment.previewTarget ?? "—"}</div></div>
              <div><span className="text-muted-foreground">{t("deploy.prod_target" as never)}</span><div className="font-mono text-foreground truncate">{deployment.productionTarget ?? "—"}</div></div>
            </div>
            {deployment.blockedReason ? <div className="text-warning text-[10px]">{deployment.blockedReason}</div> : null}
          </div>
        ))}
      </div>

      {activeReleaseCandidate ? (
        <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
          <div className="font-mono text-primary">{t("deploy.rc_linkage" as never)}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("deploy.candidate" as never)}</span><span className="font-mono text-foreground">{activeReleaseCandidate.id}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.branch" as never)}</span><span className="font-mono text-foreground">{activeReleaseCandidate.linkedBranch}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("rail.review" as never)}</span><span className="font-mono text-foreground">{activeReleaseCandidate.linkedReviewId ?? "—"}</span></div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button onClick={() => void onTriggerDeploy("preview")} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">
          Trigger Preview Deploy
        </button>
        <button onClick={() => void onTriggerDeploy("production")} className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">
          Trigger Production Deploy
        </button>
        {deployments[0] ? (
          <button onClick={() => void onRefreshDeployStatus(deployments[0].id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">
            Refresh Latest Status
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DomainsView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const { domains, operations } = workspaceState.releaseControl;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("domains")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("domains.readiness" as never)}</span><span className={`font-mono uppercase ${operations.readiness.domain === "ready" ? "text-success" : "text-warning"}`}>{operations.readiness.domain}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Rollback readiness</span><span className={`font-mono uppercase ${operations.readiness.rollback === "ready" ? "text-success" : "text-warning"}`}>{operations.readiness.rollback}</span></div>
      </div>
      <div className="space-y-2">
        {domains.map((domain) => (
          <div key={domain.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${domain.assignmentState === "blocked" || domain.verificationState === "error" ? "bg-destructive" : domain.verificationState === "pending_verification" ? "bg-warning" : "bg-success"}`} />
                <span className="text-xs font-mono text-foreground">{domain.name}</span>
              </div>
              <span className={`text-[10px] font-mono uppercase ${domain.assignmentState === "blocked" ? "text-destructive" : "text-success"}`}>{domain.assignmentState}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div><span className="text-muted-foreground">{t("domains.verification" as never)}</span><div className="font-mono text-foreground">{domain.verificationState}</div></div>
              <div><span className="text-muted-foreground">{t("domains.dns" as never)}</span><div className={`font-mono ${domain.dnsState === "dns_incomplete" ? "text-warning" : "text-foreground"}`}>{domain.dnsState}</div></div>
              <div><span className="text-muted-foreground">{t("domains.target" as never)}</span><div className="font-mono text-foreground">{domain.targetEnvironment}</div></div>
              <div><span className="text-muted-foreground">{t("deploy")}</span><div className="font-mono text-foreground">{domain.relatedDeployId ?? "—"}</div></div>
            </div>
            {domain.errors[0] ? <div className="text-[10px] text-destructive">{domain.errors[0]}</div> : null}
            {domain.warnings[0] ? <div className="text-[10px] text-warning">{domain.warnings[0]}</div> : null}
          </div>
        ))}
      </div>
      <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("domains.add")}</button>
    </div>
  );
}
