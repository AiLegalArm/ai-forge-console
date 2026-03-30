import { Bot, Loader2, Pause, AlertTriangle, CircleCheck, CircleDashed } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AgentRuntimeState } from "@/types/workspace";
import type { AgentActivityEvent, ExecutionTrace } from "@/types/workflow";

interface AgentActivityPanelProps {
  activeAgents: AgentRuntimeState[];
  events: AgentActivityEvent[];
  traces: ExecutionTrace[];
}

const eventStyles: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
};

export function AgentActivityPanel({ activeAgents, events, traces }: AgentActivityPanelProps) {
  const { t } = useI18n();
  const latestEvents = [...events].sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso)).slice(0, 5);

  return (
    <div className="border-b border-border-subtle bg-panel px-2.5 py-1 shrink-0 space-y-1">
      <div className="flex items-center gap-2">
        <Bot className="h-3 w-3 text-primary shrink-0" />
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("agent.activity")}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {activeAgents.length === 0 ? (
          <div className="text-[10px] font-mono text-muted-foreground border border-dashed border-border-subtle px-2 py-1">
            No active agents.
          </div>
        ) : (
          activeAgents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-1.5 bg-card px-2 py-1 shrink-0 border border-border-subtle min-w-[180px]">
              {agent.status === "running" ? (
                <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
              ) : (
                <Pause className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-foreground truncate">{agent.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{agent.task}</div>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground uppercase">{agent.provider}</span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-1">
        {latestEvents.length === 0 ? (
          <div className="text-[10px] font-mono text-muted-foreground border border-dashed border-border-subtle px-2 py-1">
            Task events will appear here.
          </div>
        ) : (
          latestEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-1.5 border border-border-subtle bg-background px-2 py-1 text-[10px]">
              {event.severity === "critical" ? (
                <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
              ) : event.type === "completed" ? (
                <CircleCheck className="h-3 w-3 mt-0.5 text-success shrink-0" />
              ) : (
                <CircleDashed className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`font-mono truncate ${eventStyles[event.severity ?? "info"] ?? "text-primary"}`}>{event.title}</p>
                <p className="text-muted-foreground truncate">{event.taskId ?? t("agent.no_task" as never)} • {formatTime(event.createdAtIso)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
