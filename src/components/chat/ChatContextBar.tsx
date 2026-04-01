import { GitBranch, Shield, Cpu } from "lucide-react";
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

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-card/50 text-[10px] font-mono shrink-0">
      <span className="text-foreground font-medium truncate max-w-[160px]">{workspaceState.currentProject}</span>
      <span className="text-border-default">·</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <GitBranch className="h-3 w-3" />
        <span className="text-foreground">{workspaceState.currentBranch}</span>
      </span>
      <span className="text-border-default">·</span>
      <span className="text-muted-foreground">{workspaceState.activeModel}</span>
      <div className="ml-auto flex items-center gap-2">
        <Shield className={`h-3 w-3 ${isPrivate ? "text-success" : "text-muted-foreground"}`} />
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3 text-primary" />
          <span className="text-primary">{runningCount}</span>
        </span>
        {workspaceState.pendingApprovals.length > 0 && (
          <span className="text-warning">{workspaceState.pendingApprovals.length} pending</span>
        )}
      </div>
    </div>
  );
}
