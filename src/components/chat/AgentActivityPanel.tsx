import { activeAgents } from "@/data/mock-chat";
import { Bot, Loader2, Pause } from "lucide-react";

export function AgentActivityPanel() {
  return (
    <div className="border-b border-border bg-card px-3 py-2 shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <Bot className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">Agent Activity</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {activeAgents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-1.5 bg-surface rounded px-2 py-1 shrink-0 border border-border"
          >
            {agent.status === "running" ? (
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            ) : (
              <Pause className="h-3 w-3 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-foreground leading-tight">{agent.name}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{agent.task}</span>
            </div>
            <span className="text-[8px] font-mono text-muted-foreground bg-muted rounded px-1 ml-1">{agent.provider}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
