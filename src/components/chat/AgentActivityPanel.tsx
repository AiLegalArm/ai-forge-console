import { Bot, Loader2, Pause } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AgentRuntimeState } from "@/types/workspace";

interface AgentActivityPanelProps {
  activeAgents: AgentRuntimeState[];
}

export function AgentActivityPanel({ activeAgents }: AgentActivityPanelProps) {
  const { t } = useI18n();

  return (
    <div className="border-b border-border bg-card px-2 sm:px-3 py-1.5 sm:py-2 shrink-0">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-3 w-3 text-primary shrink-0" />
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("agent.activity")}</span>
      </div>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5">
        {activeAgents.map((agent) => (
          <div key={agent.name} className="flex items-center gap-1.5 bg-surface rounded px-1.5 sm:px-2 py-1 shrink-0 border border-border">
            {agent.status === "running" ? (
              <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
            ) : (
              <Pause className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-foreground leading-tight truncate">{agent.name}</span>
              <span className="text-[9px] text-muted-foreground leading-tight truncate hidden sm:block">{agent.task}</span>
            </div>
            <span className="text-[8px] font-mono text-muted-foreground bg-muted rounded px-1 ml-0.5 hidden sm:inline">{agent.provider}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
