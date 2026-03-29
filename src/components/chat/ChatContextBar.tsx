import { GitBranch, Shield, Cloud, Cpu, RefreshCw, Eye, MessageSquareMore } from "lucide-react";
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
  const isSynced = workspaceState.syncStatus === "synced";
  const activeSession = chatState.sessions.find((session) => session.id === workspaceState.currentChatSessionId);

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
      <span className="text-border hidden sm:inline">|</span>

      <span className="text-muted-foreground hidden md:inline">{t("ctx.task")}</span>
      <span className="text-foreground truncate max-w-[160px] hidden md:inline">{workspaceState.currentTask}</span>
      <span className="text-border hidden md:inline">|</span>

      <Cloud className="h-3 w-3 text-primary shrink-0 hidden sm:block" />
      <span className="text-foreground hidden sm:inline">{activeSession?.providerMeta.provider ?? workspaceState.activeProvider}</span>
      <span className="text-muted-foreground hidden sm:inline">{activeSession?.providerMeta.model}</span>
      <span className="text-border hidden sm:inline">|</span>

      <Shield className={`h-3 w-3 shrink-0 ${isPrivate ? "text-success" : "text-warning"}`} />
      <span className={`hidden sm:inline ${isPrivate ? "text-success" : "text-warning"}`}>
        {isPrivate ? t("ctx.private") : "team"}
      </span>

      <span className="text-border hidden md:inline">|</span>
      <RefreshCw className={`h-3 w-3 shrink-0 hidden md:block ${isSynced ? "text-success" : "text-warning animate-spin"}`} />
      <span className={`hidden md:inline ${isSynced ? "text-success" : "text-warning"}`}>
        {isSynced ? t("ctx.synced") : "syncing"}
      </span>

      <span className="text-border">|</span>
      <Cpu className="h-3 w-3 text-primary animate-pulse shrink-0" />
      <span className="text-primary">{runningCount} {t("ctx.active")}</span>

      <div className="ml-auto hidden lg:flex items-center gap-1.5">
        <Eye className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">AGENTS.md</span>
      </div>
    </div>
  );
}
