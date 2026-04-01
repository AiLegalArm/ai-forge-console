import { Bot, Loader2, Pause } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AgentRuntimeState } from "@/types/workspace";
import type { AgentActivityEvent, ExecutionTrace } from "@/types/workflow";

interface AgentActivityPanelProps {
  activeAgents: AgentRuntimeState[];
  events: AgentActivityEvent[];
  traces: ExecutionTrace[];
}

export function AgentActivityPanel({ activeAgents, events }: AgentActivityPanelProps) {
  const { t } = useI18n();
  if (activeAgents.length === 0 && events.length === 0) return null;

  return (
    <div className="border-b border-border-subtle bg-card/30 px-3 py-1.5 shrink-0">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-mono font-medium text-foreground uppercase tracking-wider">{t("agent.activity")}</span>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{activeAgents.length} active</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {activeAgents.map((agent) => (
          <div key={agent.name} className="flex items-center gap-1.5 px-2 py-1 shrink-0 border border-border-subtle rounded bg-card/50 min-w-0">
            {agent.status === "running" ? (
              <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
            ) : (
              <Pause className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className="text-[10px] font-mono text-foreground truncate max-w-[120px]">{agent.name}</span>
            <span className="text-[9px] text-muted-foreground">{agent.provider}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
