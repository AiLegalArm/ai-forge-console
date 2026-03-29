import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatContextBar } from "@/components/chat/ChatContextBar";
import { AgentActivityPanel } from "@/components/chat/AgentActivityPanel";
import type { ChatState, ChatType } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
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
} from "lucide-react";

const taskStatusIcons: Record<WorkflowTask["status"], React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-success" />,
  in_progress: <Play className="h-3 w-3 text-primary animate-pulse" />,
  queued: <Clock className="h-3 w-3 text-muted-foreground" />,
  blocked: <XCircle className="h-3 w-3 text-destructive" />,
  awaiting_approval: <Clock className="h-3 w-3 text-warning" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
};

interface WorkspaceViewProps {
  section: NavSection;
  mode: AppMode;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
  chatState: ChatState;
  onConversationTypeChange: (conversation: ChatType) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve: (approvalId: string) => void;
  onGitAction: (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull", taskId: string) => Promise<void>;
  onRunBrowserScenario: () => Promise<void>;
}

export function WorkspaceView({ section, mode, workspaceState, chatContexts, chatState, onConversationTypeChange, onDraftChange, onApprovalResolve, onWorkflowApprovalResolve, onGitAction, onRunBrowserScenario }: WorkspaceViewProps) {
  if (section === "files") return <FilesView />;
  if (section === "git") return <GitView workspaceState={workspaceState} onGitAction={onGitAction} />;
  if (section === "deploy") return <DeployView workspaceState={workspaceState} />;
  if (section === "domains") return <DomainsView workspaceState={workspaceState} />;
  if (section === "design") return <DesignView workspaceState={workspaceState} />;
  if (section === "browser") return <BrowserView workspaceState={workspaceState} onRunBrowserScenario={onRunBrowserScenario} />;

  return (
    <div className="flex flex-col h-full">
      <ChatContextBar workspaceState={workspaceState} chatState={chatState} />
      <AgentActivityPanel activeAgents={workspaceState.activeAgents} events={workspaceState.workflow.activityEvents} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel workspaceState={workspaceState} chatState={chatState} chatContexts={chatContexts} onConversationTypeChange={onConversationTypeChange} onDraftChange={onDraftChange} onApprovalResolve={onApprovalResolve} onWorkflowApprovalResolve={onWorkflowApprovalResolve} />
        </div>
        <div className="w-64 border-l border-border bg-card overflow-auto shrink-0 hidden lg:block">
          <SideRail mode={mode} workspaceState={workspaceState} chatState={chatState} onWorkflowApprovalResolve={onWorkflowApprovalResolve} />
        </div>
      </div>
    </div>
  );
}

function SideRail({ mode, workspaceState, chatState, onWorkflowApprovalResolve }: { mode: AppMode; workspaceState: WorkspaceRuntimeState; chatState: ChatState; onWorkflowApprovalResolve: (approvalId: string) => void }) {
  const { t } = useI18n();
  const tasks = workspaceState.workflow.tasks;
  const completed = tasks.filter((s) => s.status === "completed").length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  const activeSession = chatState.sessions.find((session) => session.id === workspaceState.currentChatSessionId);
  const linkedContext = activeSession?.linked;
  const activeTask = tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId) ?? tasks[0];
  const taskEvidence = activeTask?.id ? workspaceState.evidenceFlow.linkedByTaskId[activeTask.id] ?? [] : [];
  const blockerEvidence = workspaceState.evidenceFlow.records.filter((record) => record.blocking);

  return (
    <div className="p-2.5 space-y-3 text-xs">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Task graph</span>
          <span className="text-[10px] font-mono text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <div key={task.id} className="py-1 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-1.5">
                {taskStatusIcons[task.status]}
                <span className="text-[10px] text-foreground truncate">{task.title}</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono pl-4">{task.phase} • {task.github?.branchLifecycle ?? "no_branch"}</div>
              {task.designBrowserBlockers ? (
                <div className="text-[9px] text-warning font-mono pl-4">design/browser blockers: {task.designBrowserBlockers}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Approvals</span>
        <div className="mt-1.5 space-y-1">
          {workspaceState.pendingApprovals.length === 0 ? (
            <div className="text-[10px] text-muted-foreground font-mono">No pending approvals.</div>
          ) : (
            workspaceState.pendingApprovals.map((approval: WorkflowApproval) => (
              <div key={approval.id} className="rounded border border-warning/30 bg-warning/5 p-1.5">
                <div className="text-[10px] text-warning font-mono">{approval.category}</div>
                <div className="text-[10px] text-foreground">{approval.title}</div>
                <button onClick={() => onWorkflowApprovalResolve(approval.id)} className="mt-1 text-[10px] font-mono text-primary hover:underline">
                  Approve
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">GitHub flow</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="text-foreground font-mono truncate max-w-[130px]">{activeTask?.github?.branch?.localBranchName ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Task link</span><span className="text-primary font-mono">{activeTask?.id ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sync mode</span><span className="text-foreground font-mono uppercase">{activeTask?.github?.syncMode ?? "manual"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Push gate</span><span className="text-warning font-mono">{activeTask?.github?.pushWorkflow.requiresApproval ? "Approval required" : "No gate"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Review</span><span className="text-foreground font-mono">{activeTask?.github?.pullRequest?.status ?? "—"}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Evidence drawer</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Task evidence</span><span className="text-foreground font-mono">{taskEvidence.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Blocking evidence</span><span className="text-destructive font-mono">{blockerEvidence.length}</span></div>
          {taskEvidence.slice(0, 2).map((evidenceId) => (
            <div key={evidenceId} className="text-muted-foreground truncate">• {workspaceState.evidenceFlow.records.find((entry) => entry.id === evidenceId)?.title ?? evidenceId}</div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Audit / Review</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Audit linkage</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "audit")?.linkedAuditId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Review linkage</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "release")?.linkedReviewId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Design state</span><span className="text-foreground font-mono">{workspaceState.designSession.state}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Browser run</span><span className="text-foreground font-mono">{workspaceState.browserSession.runState}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="text-primary font-mono uppercase">{mode}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Go / No-Go summary</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Decision</span><span className={`font-mono uppercase ${workspaceState.releaseControl.finalDecision.status === "go" ? "text-success" : "text-destructive"}`}>{workspaceState.releaseControl.finalDecision.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Blockers</span><span className="font-mono text-destructive">{workspaceState.releaseControl.finalDecision.blockers.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Warnings</span><span className="font-mono text-warning">{workspaceState.releaseControl.finalDecision.warnings.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pending approvals</span><span className="font-mono text-warning">{workspaceState.releaseControl.finalDecision.approvalsPending.length}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Chat link</span>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-muted-foreground"><span>Session</span><span className="text-foreground font-mono truncate max-w-[120px]">{activeSession?.title}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Task graph</span><span className="text-foreground font-mono">{linkedContext?.taskId ?? "—"}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Agent link</span><span className="text-foreground font-mono">{linkedContext?.agentName ?? "—"}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Audit link</span><span className="text-foreground font-mono">{linkedContext?.auditFindingId ?? "—"}</span></div>
        </div>
      </div>


      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Backend routing</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Conversation mode</span><span className="text-primary font-mono uppercase">{(workspaceState.localInference.routing.conversationOverrides[workspaceState.currentChatSessionId] ?? workspaceState.localInference.routing.activeMode).replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Privacy mode</span><span className="text-success font-mono uppercase">{workspaceState.localInference.routing.rules.find((rule) => rule.scope === "task" && rule.scopeRefId === activeTask?.id)?.privacyMode ?? "standard"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Active local model</span><span className="text-foreground font-mono">{workspaceState.localInference.modelRegistry.find((model) => model.id === workspaceState.localInference.ollama.selectedModelId)?.displayName ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fallback ready</span><span className={`font-mono ${workspaceState.localInference.resources.autoFallbackReady ? "text-success" : "text-warning"}`}>{workspaceState.localInference.resources.autoFallbackReady ? "yes" : "no"}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Local runtime resources</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Concurrent jobs</span><span className="text-foreground font-mono">{workspaceState.localInference.resources.activeJobs}/{workspaceState.localInference.resources.maxConcurrentJobs}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Queue</span><span className="text-warning font-mono">{workspaceState.localInference.resources.queuedJobs}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pressure</span><span className="text-foreground font-mono uppercase">{workspaceState.localInference.resources.resourcePressure}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Degraded</span><span className={`font-mono ${workspaceState.localInference.resources.degradedMode ? "text-warning" : "text-success"}`}>{workspaceState.localInference.resources.degradedMode ? "yes" : "no"}</span></div>
        </div>
      </div>


      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Local shell</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Execution mode</span><span className="text-primary font-mono uppercase">{workspaceState.localShell.executionMode.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Workspace</span><span className="text-foreground font-mono truncate max-w-[120px]">{workspaceState.localShell.project.workspaceName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Instructions</span><span className={`font-mono ${workspaceState.localShell.project.projectInstructionsDetected ? "text-success" : "text-warning"}`}>{workspaceState.localShell.project.projectInstructionsDetected ? "detected" : "missing"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Git changes</span><span className={`font-mono ${workspaceState.localShell.project.hasLocalChanges ? "text-warning" : "text-success"}`}>{workspaceState.localShell.project.hasLocalChanges ? "dirty" : "clean"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Terminal</span><span className="text-foreground font-mono">{workspaceState.localShell.terminal.state}</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Capability gates</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          {workspaceState.localShell.capabilities.map((gate) => (
            <div key={gate.capability} className="flex justify-between gap-2 text-muted-foreground">
              <span>{gate.capability.replaceAll("_", " ")}</span>
              <span className={`font-mono ${gate.requiresApproval ? "text-warning" : "text-success"}`}>{gate.requiresApproval ? "approval" : "allowed"}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Per-agent backends</span>
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
          <div className="flex justify-between text-muted-foreground"><span>{t("snapshots")}</span><span className="text-foreground font-mono">7</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("context")}</span><span className="text-foreground font-mono">48K tok</span></div>
          <div className="flex justify-between text-muted-foreground"><span>AGENTS.md</span><span className="text-success font-mono">{t("ctx.synced")}</span></div>
        </div>
      </div>
    </div>
  );
}

function DesignView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const session = workspaceState.designSession;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Design Agent</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-mono text-primary">{session.state}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Brief</span><span className="font-mono text-foreground">{session.brief.title}</span></div>
        <div className="text-muted-foreground">Page structure: {session.layoutProposal.pageStructure.join(" → ")}</div>
        <div className="text-muted-foreground">Components: {session.layoutProposal.componentInventory.join(", ")}</div>
        <div className="text-muted-foreground">Variants: {session.layoutProposal.statesAndVariants.join(", ")}</div>
        <div className="text-muted-foreground">Tokens: {session.tokenHandoff.designTokens.join(", ")}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="font-mono text-primary">UX concerns / handoff</div>
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
  const session = workspaceState.browserSession;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><MonitorPlay className="h-4 w-4 text-primary" /> Browser Agent</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">Scenario</span><span className="font-mono text-foreground">{session.scenario.title}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Linked task/chat</span><span className="font-mono text-foreground">{session.linkedTaskId ?? "—"} / {session.linkedChatId ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Run state</span><span className={`font-mono ${session.runState === "failed" ? "text-destructive" : "text-primary"}`}>{session.runState}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Session/result</span><span className="font-mono text-foreground">{session.sessionState} / {session.resultState}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Current step</span><span className="font-mono text-foreground">{session.currentStepId ?? "—"}</span></div>
        {session.scenario.steps.map((step) => (
          <div key={step.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground truncate">{step.label}</span>
            <span className={`font-mono ${step.status === "failed" ? "text-destructive" : "text-success"}`}>{step.status}</span>
          </div>
        ))}
        <button className="mt-2 text-[11px] border border-border rounded px-2 py-1 hover:bg-muted" onClick={() => void onRunBrowserScenario()}>
          Run scenario with automation
        </button>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="font-mono text-primary flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Evidence captured</div>
        {session.findings.map((finding) => (
          <div key={finding.id} className="text-muted-foreground">• {finding.findingType}: {finding.summary}</div>
        ))}
        {session.failureState.state === "failed" ? (
          <div className="text-destructive">Failure: {session.failureState.reason} — {session.failureState.message}</div>
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
  onGitAction: (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull", taskId: string) => Promise<void>;
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

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> {t("git")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Repository</span><span className="font-mono text-foreground">{activeRepo ? `${activeRepo.owner}/${activeRepo.name}` : "Not connected"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Remote</span><span className="font-mono text-foreground">{activeRepo?.remoteUrl ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Connection</span><span className="font-mono text-primary uppercase">{workspaceState.syncStatus}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Task branch</span><span className="font-mono text-primary">{branchState?.localBranchName ?? activeTask?.github?.branchLifecycle ?? "no_branch"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Branch lifecycle</span><span className="font-mono text-foreground">{activeTask?.github?.branchLifecycle ?? "no_branch"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Sync mode</span><span className="font-mono text-foreground uppercase">{activeTask?.github?.syncMode ?? workspaceState.workflow.github.globalSyncModeDefault}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Review mode</span><span className="font-mono text-foreground uppercase">{activeTask?.github?.reviewMode ?? "chat_review"}</span></div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-primary"><GitCommitHorizontal className="h-3.5 w-3.5" /> Commit & Push</div>
        <div className="flex justify-between"><span className="text-muted-foreground">Dirty / staged</span><span className="font-mono text-foreground">{commitState?.stagedChanges.hasUncommittedChanges ? `${commitState.stagedChanges.filesChanged} files` : "clean"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Draft message</span><span className="font-mono text-foreground truncate max-w-[320px]">{commitState?.draftMessage ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Commit status</span><span className="font-mono text-primary">{commitState?.status ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Push status</span><span className="font-mono text-primary">{pushState?.status ?? "idle"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Push approval</span><span className={`font-mono ${pushState?.requiresApproval ? "text-warning" : "text-success"}`}>{pushState?.requiresApproval ? "required" : "not required"}</span></div>
        {pushState?.pendingError ? <div className="text-warning">{pushState.pendingError}</div> : null}
        {commitState?.pendingError ? <div className="text-destructive">{commitState.pendingError}</div> : null}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-primary"><Upload className="h-3.5 w-3.5" /> Review & Audit</div>
        <div className="flex justify-between"><span className="text-muted-foreground">PR status</span><span className="font-mono text-foreground">{reviewState?.status ?? "not_opened"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Review chat</span><span className="font-mono text-foreground">{reviewState?.reviewChatSessionId ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Auditors</span><span className="font-mono text-foreground">{reviewState?.linkedAuditorIds.join(", ") ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Merge readiness</span><span className={`font-mono ${reviewState?.mergeReadiness === "blocked" ? "text-destructive" : "text-success"}`}>{reviewState?.mergeReadiness ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Release gate</span><span className={`font-mono ${reviewState?.releaseGateReadiness === "blocked" ? "text-warning" : "text-success"}`}>{reviewState?.releaseGateReadiness ?? "not_ready"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Open findings</span><span className="font-mono text-warning">{openFindings.length}</span></div>
        {openFindings[0] ? (
          <div className="flex items-center gap-1 text-warning">
            <ShieldAlert className="h-3 w-3" />
            <span className="truncate">{openFindings[0].title}</span>
          </div>
        ) : null}
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => activeTask && void onGitAction("stage_all", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Stage all</button>
        <button onClick={() => activeTask && void onGitAction("commit", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Commit</button>
        <button onClick={() => activeTask && void onGitAction("push", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("git.push")}</button>
        <button onClick={() => activeTask && void onGitAction("pull", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.pull")}</button>
        <button onClick={() => activeTask && void onGitAction("pull", activeTask.id)} className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.sync")}</button>
      </div>
    </div>
  );
}

function DeployView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const { deployments, releaseCandidates, finalDecision } = workspaceState.releaseControl;
  const activeReleaseCandidate = releaseCandidates.find((candidate) => candidate.id === workspaceState.releaseControl.activeCandidateId);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> {t("deploy")}</h1>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-mono text-muted-foreground">Final go/no-go</span>
          <span className={`font-mono uppercase ${finalDecision.status === "go" ? "text-success" : "text-destructive"}`}>{finalDecision.status}</span>
        </div>
        <div className="text-muted-foreground">{finalDecision.summary}</div>
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
              <div><span className="text-muted-foreground">Source</span><div className="font-mono text-foreground">{deployment.source}</div></div>
              <div><span className="text-muted-foreground">Rollback</span><div className={`font-mono ${deployment.rollbackAvailable ? "text-success" : "text-muted-foreground"}`}>{deployment.rollbackAvailable ? "available" : "unavailable"}</div></div>
              <div><span className="text-muted-foreground">Preview target</span><div className="font-mono text-foreground truncate">{deployment.previewTarget ?? "—"}</div></div>
              <div><span className="text-muted-foreground">Production target</span><div className="font-mono text-foreground truncate">{deployment.productionTarget ?? "—"}</div></div>
            </div>
            {deployment.blockedReason ? <div className="text-warning text-[10px]">{deployment.blockedReason}</div> : null}
          </div>
        ))}
      </div>

      {activeReleaseCandidate ? (
        <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
          <div className="font-mono text-primary">Release candidate linkage</div>
          <div className="flex justify-between"><span className="text-muted-foreground">Candidate</span><span className="font-mono text-foreground">{activeReleaseCandidate.id}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-mono text-foreground">{activeReleaseCandidate.linkedBranch}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Review</span><span className="font-mono text-foreground">{activeReleaseCandidate.linkedReviewId ?? "—"}</span></div>
        </div>
      ) : null}
    </div>
  );
}

function DomainsView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const { domains, finalDecision } = workspaceState.releaseControl;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("domains")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Domain readiness</span><span className={`font-mono uppercase ${finalDecision.status === "go" ? "text-success" : "text-warning"}`}>{finalDecision.status}</span></div>
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
              <div><span className="text-muted-foreground">verification</span><div className="font-mono text-foreground">{domain.verificationState}</div></div>
              <div><span className="text-muted-foreground">dns</span><div className={`font-mono ${domain.dnsState === "dns_incomplete" ? "text-warning" : "text-foreground"}`}>{domain.dnsState}</div></div>
              <div><span className="text-muted-foreground">target</span><div className="font-mono text-foreground">{domain.targetEnvironment}</div></div>
              <div><span className="text-muted-foreground">deploy</span><div className="font-mono text-foreground">{domain.relatedDeployId ?? "—"}</div></div>
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
