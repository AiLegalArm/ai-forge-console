import { GitBranch, Shield, Cloud, Cpu, RefreshCw, MessageSquareMore } from "lucide-react";
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

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-border-subtle bg-card text-[10px] font-mono overflow-x-auto shrink-0 uppercase tracking-wide">
      <span className="text-muted-foreground">{t("ctx.project")}</span>
      <span className="text-foreground normal-case tracking-normal">{workspaceState.currentProject}</span>

      <span className="h-3 w-px bg-border-subtle mx-1" />
      <MessageSquareMore className="h-3 w-3 text-primary shrink-0" />
      <span className="text-primary">{workspaceState.currentConversationType}</span>
      <span className="text-muted-foreground hidden md:inline normal-case tracking-normal">{activeSession?.title}</span>

      <span className="h-3 w-px bg-border-subtle mx-1" />
      <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-foreground normal-case tracking-normal">{workspaceState.currentBranch}</span>
      <span className={workspaceState.repository.connected ? "text-success" : "text-warning"}>
        {workspaceState.repository.connected ? "repo:ok" : "repo:off"}
      </span>

      <span className="h-3 w-px bg-border-subtle mx-1 hidden md:inline" />
      <span className="hidden md:inline text-muted-foreground">route</span>
      <span className="hidden md:inline text-primary">{conversationRoutingMode.replace(/_/g, " ")}</span>
      <span className="hidden md:inline text-muted-foreground">{workspaceState.activeModel}</span>

      <span className="h-3 w-px bg-border-subtle mx-1" />
      <Shield className={`h-3 w-3 shrink-0 ${isPrivate ? "text-success" : "text-warning"}`} />
      <span className={`${isPrivate ? "text-success" : "text-warning"}`}>{isPrivate ? t("ctx.private") : "team"}</span>
      <RefreshCw className={`h-3 w-3 shrink-0 ${isSynced ? "text-success" : "text-warning animate-spin"}`} />
      <span className={`${isSynced ? "text-success" : "text-warning"}`}>{isSynced ? t("ctx.synced") : workspaceState.syncStatus.replace("_", " ")}</span>

      <span className="ml-auto flex items-center gap-1.5">
        <Cloud className="h-3 w-3 text-primary" />
        <span className="text-foreground normal-case tracking-normal">{activeSession?.providerMeta.provider ?? workspaceState.activeProvider}</span>
        <Cpu className="h-3 w-3 text-primary" />
        <span className="text-primary">{runningCount} active</span>
        <span className="text-warning">{workspaceState.pendingApprovals.length} approvals</span>
      </span>
    </div>
  );
}
