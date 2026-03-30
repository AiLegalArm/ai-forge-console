import { GitBranch, Shield, Cloud, Cpu, RefreshCw, MessageSquareMore, Bot } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ChatState } from "@/types/chat";
import type { WorkspaceRuntimeState } from "@/types/workspace";

interface ChatContextBarProps {
  workspaceState: WorkspaceRuntimeState;
  chatState: ChatState;
}

export function ChatContextBar({ workspaceState, chatState }: ChatContextBarProps) {
  const { t } = useI18n();
  const runningCount = workspaceState.activeAgents.filter((a) => a.status === "running").length;
  const isPrivate = workspaceState.privacyMode === "private";
  const isSynced = workspaceState.syncStatus === "up_to_date" || workspaceState.syncStatus === "connected";
  const activeSession = chatState.sessions.find((session) => session.id === workspaceState.currentChatSessionId);
  const conversationRoutingMode =
    workspaceState.localInference.routing.conversationOverrides[workspaceState.currentChatSessionId] ??
    workspaceState.localInference.routing.activeMode;
  const activeLocalModel = workspaceState.localInference.modelRegistry.find(
    (model) => model.id === workspaceState.localInference.ollama.selectedModelId,
  );
  const activeTask = workspaceState.workflow.tasks.find(
    (task) => task.linkedChatSessionId === workspaceState.currentChatSessionId || task.title === workspaceState.currentTask,
  );
  const currentTaskAuditFindings = workspaceState.auditors.findings.filter(
    (finding) => finding.linked.taskId === activeTask?.id,
  );
  const noGoGates = workspaceState.auditors.gateDecisions.filter((gate) => gate.verdict === "no_go").length;
  const activeTaskBlockers = workspaceState.auditors.blockers.filter(
    (blocker) => blocker.status === "active" && (blocker.entityId === activeTask?.id || blocker.entityType === "subtask"),
  );
  const ollamaState = workspaceState.localInference.ollama.serviceState;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 border-b border-border bg-panel text-[10px] font-mono overflow-x-auto shrink-0">
      <span className="text-muted-foreground hidden sm:inline">{t("ctx.project")}</span>
      <span className="text-foreground truncate">{workspaceState.currentProject}</span>
      <span className="text-border">|</span>

      <MessageSquareMore className="h-3 w-3 text-primary shrink-0" />
      <span className="text-primary uppercase">{workspaceState.currentConversationType}</span>
      <span className="text-foreground truncate max-w-[160px] hidden md:inline">{activeSession?.title}</span>
      <span className="text-border hidden sm:inline">|</span>

      <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-primary">{workspaceState.currentBranch}</span>
      <span className={workspaceState.repository.connected ? "text-success" : "text-muted-foreground"}>
        {workspaceState.repository.connected ? `repo:${workspaceState.repository.name ?? "connected"}` : "repo:disconnected"}
      </span>
      <span className="text-muted-foreground hidden md:inline">{workspaceState.repository.syncStatus ?? "idle"}</span>
      <span className="text-border hidden sm:inline">|</span>

      <span className="text-muted-foreground hidden md:inline">{t("ctx.task")}</span>
      <span className="text-foreground truncate max-w-[160px] hidden md:inline">{workspaceState.currentTask}</span>
      <span className="text-muted-foreground hidden lg:inline uppercase">{workspaceState.currentPhase}</span>
      <span className="text-primary hidden lg:inline">{workspaceState.currentTaskStatus}</span>
      <span className="text-border hidden md:inline">|</span>

      <Cloud className="h-3 w-3 text-primary shrink-0 hidden sm:block" />
      <span className="text-foreground hidden sm:inline">{activeSession?.providerMeta.provider ?? workspaceState.activeProvider}</span>
      <span className="text-muted-foreground hidden sm:inline">{activeSession?.providerMeta.model}</span>
      <span className="text-primary hidden md:inline uppercase">{workspaceState.activeBackend}</span>
      <span className="text-border hidden sm:inline">|</span>

      <span className="hidden md:inline text-muted-foreground">route</span>
      <span className="hidden md:inline text-primary uppercase">{conversationRoutingMode.replace(/_/g, " ")}</span>
      <span className="hidden md:inline text-muted-foreground">•</span>
      <span className="hidden md:inline text-foreground">{activeLocalModel?.displayName ?? "no local model"}</span>
      <span className={`hidden md:inline ${ollamaState === "available" ? "text-success" : "text-warning"}`}>
        {ollamaState}
      </span>
      <span className="text-border hidden md:inline">|</span>

      <Shield className={`h-3 w-3 shrink-0 ${isPrivate ? "text-success" : "text-warning"}`} />
      <span className={`hidden sm:inline ${isPrivate ? "text-success" : "text-warning"}`}>
        {isPrivate ? t("ctx.private") : "team"}
      </span>

      <span className="text-border hidden md:inline">|</span>
      <RefreshCw className={`h-3 w-3 shrink-0 hidden md:block ${isSynced ? "text-success" : "text-warning animate-spin"}`} />
      <span className={`hidden md:inline ${isSynced ? "text-success" : "text-warning"}`}>
        {isSynced ? t("ctx.synced") : workspaceState.syncStatus.replace("_", " ")}
      </span>

      <span className="text-border">|</span>
      <Cpu className="h-3 w-3 text-primary animate-pulse shrink-0" />
      <span className="text-primary">{runningCount} {t("ctx.active")}</span>
      <span className="text-warning hidden md:inline">{workspaceState.pendingApprovals.length} approvals</span>
      <span className="text-border hidden md:inline">|</span>
      <span className="text-warning hidden md:inline">{currentTaskAuditFindings.length} audit findings</span>
      <span className="text-destructive hidden md:inline">{activeTaskBlockers.length} blockers</span>
      <span className={`hidden md:inline ${noGoGates > 0 ? "text-destructive" : "text-success"}`}>
        {noGoGates > 0 ? `${noGoGates} no-go gates` : "all gates go"}
      </span>

      <div className="ml-auto hidden lg:flex items-center gap-1.5">
        <Bot className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">agent-linked session</span>
      </div>
    </div>
  );
}
