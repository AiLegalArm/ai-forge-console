import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatContextBar } from "@/components/chat/ChatContextBar";
import { AgentActivityPanel } from "@/components/chat/AgentActivityPanel";
import type { ChatTab } from "@/data/mock-chat";
import type { ChatState } from "@/types/chat";
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
  onConversationTypeChange: (conversation: ChatTab) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve: (approvalId: string) => void;
}

export function WorkspaceView({ section, mode, workspaceState, chatContexts, chatState, onConversationTypeChange, onDraftChange, onApprovalResolve, onWorkflowApprovalResolve }: WorkspaceViewProps) {
  if (section === "files") return <FilesView />;
  if (section === "git") return <GitView workspaceState={workspaceState} />;
  if (section === "deploy") return <DeployView />;
  if (section === "domains") return <DomainsView />;

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
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Audit / Review</span>
        <div className="mt-1.5 space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Audit linkage</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "audit")?.linkedAuditId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Review linkage</span><span className="text-foreground font-mono">{tasks.find((task) => task.phase === "release")?.linkedReviewId ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="text-primary font-mono uppercase">{mode}</span></div>
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

function GitView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
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
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("git.push")}</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.pull")}</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.sync")}</button>
      </div>
    </div>
  );
}

function DeployView() {
  const { t } = useI18n();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> {t("deploy")}</h1>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-foreground">{t("deploy.production")}</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.4.2</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-foreground">{t("deploy.staging")}</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.5.0-rc1</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("deploy.staging_btn")}</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("deploy.promote")}</button>
        </div>
      </div>
    </div>
  );
}

function DomainsView() {
  const { t } = useI18n();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("domains")}</h1>
      <div className="space-y-2">
        {["app.example.com", "staging.example.com", "api.example.com"].map((d) => (
          <div key={d} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs font-mono text-foreground">{d}</span>
            </div>
            <span className="text-[10px] text-success">SSL ✓</span>
          </div>
        ))}
      </div>
      <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("domains.add")}</button>
    </div>
  );
}
