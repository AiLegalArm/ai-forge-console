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
import { evaluatePullRequestReviewOperations } from "@/lib/pr-review-operations";
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
  Cpu,
} from "lucide-react";
import { SmartActionChips } from "@/components/assistive/SmartActionChips";
import { getSmartActionSuggestions, type SmartActionId } from "@/lib/ai-native-suggestions";
import { ZipRepositoryView } from "@/components/views/ZipRepositoryView";
import { GitHubConnectView } from "@/components/views/GitHubConnectView";

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
      <AgentActivityPanel activeAgents={workspaceState.activeAgents} events={workspaceState.workflow.activityEvents} traces={workspaceState.workflow.executionTraces} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel workspaceState={workspaceState} chatState={chatState} chatContexts={chatContexts} onConversationTypeChange={onConversationTypeChange} onDraftChange={onDraftChange} onSendMessage={onSendMessage} onApprovalResolve={onApprovalResolve} onWorkflowApprovalResolve={onWorkflowApprovalResolve} onProviderSourceChange={onProviderSourceChange} onModelChange={onModelChange} onDeploymentModeChange={onDeploymentModeChange} onRoutingProfileChange={onRoutingProfileChange} onAddLocalProject={onAddLocalProject} onCreateProject={onCreateProject} onConnectRepository={onConnectRepository} onDisconnectRepository={onDisconnectRepository} onActiveProjectChange={onActiveProjectChange} />
        </div>
        <div className="w-72 border-l border-border-subtle bg-panel overflow-auto shrink-0 hidden lg:block">
          <SideRail mode={mode} workspaceState={workspaceState} chatState={chatState} onWorkflowApprovalResolve={onWorkflowApprovalResolve} onFocusTask={onFocusTask} onLaunchTask={onLaunchTask} />
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = false, badge, children }: { title: string; icon?: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-subtle/50 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        <span className="text-[9px]">{open ? "▾" : "▸"}</span>
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {badge}
      </button>
      {open && <div className="px-2 pb-2 space-y-1 text-[10px]">{children}</div>}
    </div>
  );
}

function KV({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={`font-mono truncate max-w-[130px] ${color ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function SideRail({ mode, workspaceState, chatState, onWorkflowApprovalResolve, onFocusTask, onLaunchTask }: { mode: AppMode; workspaceState: WorkspaceRuntimeState; chatState: ChatState; onWorkflowApprovalResolve: (approvalId: string) => void | Promise<void>; onFocusTask: (taskId: string) => void; onLaunchTask: (taskId: string) => void }) {
  const { t } = useI18n();
  const tasks = workspaceState.workflow.tasks;
  const subtasks = workspaceState.workflow.subtasks;
  const completed = tasks.filter((s) => s.status === "completed").length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
  const activeTask = tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId) ?? tasks[0];
  const operatorMode = mode === "operator";

  return (
    <div className="text-[11px] overflow-auto">
      {/* Status summary — always visible */}
      <div className="px-2 py-2 border-b border-border-subtle bg-card/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-medium text-foreground uppercase tracking-wider flex items-center gap-1">
            <Radar className="h-3 w-3 text-primary" />
            {operatorMode ? "Operator" : "Status"}
          </span>
          <span className={`text-[9px] font-mono uppercase ${operatorMode ? "text-success" : "text-muted-foreground"}`}>
            {operatorMode ? "active" : "standby"}
          </span>
        </div>
        <div className="space-y-0.5 text-[10px]">
          <KV label="task" value={activeTask?.id ?? "—"} color="text-primary" />
          <KV label="model" value={`${workspaceState.providerSource}/${workspaceState.activeModel}`} />
          <KV label="release" value={workspaceState.releaseControl.operations.goNoGo.status} color={workspaceState.releaseControl.operations.goNoGo.status === "go" ? "text-success" : "text-destructive"} />
        </div>
      </div>

      {/* Task graph */}
      <CollapsibleSection title="Task Graph" icon={<Flag className="h-3 w-3 text-primary" />} defaultOpen badge={<span className="text-primary font-mono">{Math.round(progress)}%</span>}>
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-0.5">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-1.5 py-0.5 group">
              {taskStatusIcons[task.status]}
              <span className="text-foreground truncate flex-1">{task.title}</span>
              <button onClick={() => onLaunchTask(task.id)} className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">▶</button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Approvals */}
      {workspaceState.pendingApprovals.length > 0 && (
        <CollapsibleSection title="Approvals" icon={<Flag className="h-3 w-3 text-warning" />} defaultOpen badge={<span className="text-warning font-mono">{workspaceState.pendingApprovals.length}</span>}>
          {workspaceState.pendingApprovals.map((approval) => (
            <div key={approval.id} className="flex items-center justify-between gap-1 py-0.5">
              <span className="text-foreground truncate">{approval.title}</span>
              <button onClick={() => onWorkflowApprovalResolve(approval.id)} className="text-[9px] font-mono text-primary hover:underline shrink-0">approve</button>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Release */}
      <CollapsibleSection title="Release" icon={<Bot className="h-3 w-3 text-primary" />}>
        <KV label="go/no-go" value={workspaceState.releaseControl.operations.goNoGo.status} color={workspaceState.releaseControl.operations.goNoGo.status === "go" ? "text-success" : "text-destructive"} />
        <KV label="blockers" value={workspaceState.releaseControl.operations.blockerSummary.total} color="text-destructive" />
        <KV label="warnings" value={workspaceState.releaseControl.operations.goNoGo.warnings.length} color="text-warning" />
        <KV label="missing approvals" value={workspaceState.releaseControl.operations.approvalSummary.missing.length} color="text-warning" />
      </CollapsibleSection>

      {/* GitHub */}
      <CollapsibleSection title="GitHub" icon={<GitCommitHorizontal className="h-3 w-3" />}>
        <KV label="branch" value={activeTask?.github?.branch?.localBranchName ?? "—"} />
        <KV label="sync" value={activeTask?.github?.syncMode ?? "manual"} />
        <KV label="push gate" value={activeTask?.github?.pushWorkflow.requiresApproval ? "required" : "none"} color={activeTask?.github?.pushWorkflow.requiresApproval ? "text-warning" : "text-success"} />
        <KV label="review" value={activeTask?.github?.pullRequest?.status ?? "—"} />
      </CollapsibleSection>

      {/* Routing */}
      <CollapsibleSection title="Routing" icon={<Cpu className="h-3 w-3" />}>
        <KV label="mode" value={workspaceState.localInference.routing.activeMode.replace(/_/g, " ")} color="text-primary" />
        <KV label="fallback" value={workspaceState.localInference.resources.autoFallbackReady ? "ready" : "not ready"} color={workspaceState.localInference.resources.autoFallbackReady ? "text-success" : "text-warning"} />
        <KV label="pressure" value={workspaceState.localInference.operational.budgetPressure} color={workspaceState.localInference.operational.budgetPressure === "critical" ? "text-destructive" : "text-foreground"} />
        <KV label="jobs" value={`${workspaceState.localInference.resources.activeJobs}/${workspaceState.localInference.resources.maxConcurrentJobs}`} />
      </CollapsibleSection>

      {/* Shell */}
      <CollapsibleSection title="Shell" icon={<Globe className="h-3 w-3" />}>
        <KV label="exec mode" value={workspaceState.localShell.executionMode.replace(/_/g, " ")} color="text-primary" />
        <KV label="changes" value={workspaceState.localShell.project.hasLocalChanges ? "dirty" : "clean"} color={workspaceState.localShell.project.hasLocalChanges ? "text-warning" : "text-success"} />
        <KV label="terminal" value={workspaceState.localShell.terminal.state} />
      </CollapsibleSection>

      {/* Memory */}
      <CollapsibleSection title="Memory">
        <KV label="snapshots" value={workspaceState.memory.tasks.length} />
        <KV label="context" value={`${workspaceState.contextEnvelope.decisions.length} scoped`} />
        <KV label="provider" value={`${workspaceState.memory.providerPreferences.preferredProvider}`} color="text-primary" />
      </CollapsibleSection>
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
  const [activeTab, setActiveTab] = useState<"project" | "zip">("zip");
  const files = [
    { name: "src/", children: ["components/", "hooks/", "lib/", "pages/", "data/", "App.tsx", "main.tsx", "index.css"] },
    { name: "supabase/", children: ["migrations/", "functions/", "config.toml"] },
    { name: "public/", children: ["favicon.ico", "robots.txt"] },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab("project")}
          className={`px-2 py-1 text-[10px] font-mono rounded ${activeTab === "project" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Проект
        </button>
        <button
          onClick={() => setActiveTab("zip")}
          className={`px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 ${activeTab === "zip" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Upload className="h-3 w-3" /> ZIP-репо
        </button>
      </div>
      {activeTab === "project" ? (
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
      ) : (
        <ZipRepositoryView />
      )}
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
  const reviewOps = evaluatePullRequestReviewOperations({
    task: activeTask,
    pullRequest: reviewState,
    workflow: workspaceState.workflow,
    auditors: workspaceState.auditors,
    evidenceFlow: workspaceState.evidenceFlow,
    defaultBranch: workspaceState.workflow.github.repositories.find((repo) => repo.id === activeTask?.github?.repositoryId)?.defaultBranch,
    releaseGateBlocked: workspaceState.releaseReadinessStatus === "blocked" || workspaceState.releaseReadinessStatus === "no_go",
  });
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
        <div className="flex justify-between"><span className="text-muted-foreground">Review readiness</span><span className={`font-mono ${reviewOps?.reviewReadiness.state === "blocked" ? "text-destructive" : "text-foreground"}`}>{reviewOps?.reviewReadiness.state ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Merge evaluation</span><span className={`font-mono ${reviewOps?.mergeReadiness.state === "ready" ? "text-success" : reviewOps?.mergeReadiness.state === "blocked" ? "text-destructive" : "text-warning"}`}>{reviewOps?.mergeReadiness.state ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Release handoff</span><span className={`font-mono ${reviewOps?.releaseHandoff.state === "ready" ? "text-success" : "text-warning"}`}>{reviewOps?.releaseHandoff.state ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Review blockers</span><span className="font-mono text-warning">{reviewOps?.blockers.length ?? 0}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.open_findings" as never)}</span><span className="font-mono text-warning">{openFindings.length}</span></div>
        {reviewOps?.recommendedNextSteps[0] ? <div className="text-[11px] text-muted-foreground">Next: {reviewOps.recommendedNextSteps[0]}</div> : null}
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
        <div className="text-muted-foreground">{operations.goNoGo.warnings?.join(", ") || "—"}</div>
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
                <span className={`w-2 h-2  ${deployment.status === "blocked" || deployment.status === "failed" ? "bg-destructive" : deployment.status === "preview_ready" || deployment.status === "production_ready" ? "bg-primary" : "bg-success"}`} />
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
                <span className={`w-2 h-2  ${domain.assignmentState === "blocked" || domain.verificationState === "error" ? "bg-destructive" : domain.verificationState === "pending_verification" ? "bg-warning" : "bg-success"}`} />
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
