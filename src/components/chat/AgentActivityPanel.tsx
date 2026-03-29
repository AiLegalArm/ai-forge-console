import { Bot, Loader2, Pause, AlertTriangle, CircleCheck, CircleDashed } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AgentRuntimeState } from "@/types/workspace";
import type { AgentActivityEvent } from "@/types/workflow";

interface AgentActivityPanelProps {
  activeAgents: AgentRuntimeState[];
  events: AgentActivityEvent[];
}

const eventStyles: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
};

export function AgentActivityPanel({ activeAgents, events }: AgentActivityPanelProps) {
  const { t } = useI18n();
  const latestEvents = [...events].sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso)).slice(0, 4);

  return (
    <div className="border-b border-border bg-card px-2 sm:px-3 py-1.5 sm:py-2 shrink-0 space-y-1.5">
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

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {latestEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-1.5 border border-border rounded bg-background px-2 py-1.5 min-w-[210px] max-w-[260px]">
            {event.severity === "critical" ? (
              <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
            ) : event.type === "completed" ? (
              <CircleCheck className="h-3 w-3 mt-0.5 text-success shrink-0" />
            ) : (
              <CircleDashed className="h-3 w-3 mt-0.5 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-mono truncate ${eventStyles[event.severity ?? "info"] ?? "text-primary"}`}>{event.title}</p>
              <p className="text-[9px] text-muted-foreground truncate">{event.taskId ?? t("agent.no_task" as never)} • {formatTime(event.createdAtIso)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
