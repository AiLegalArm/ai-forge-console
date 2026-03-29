import { GitBranch, Shield, Cloud, Cpu, RefreshCw, Eye } from "lucide-react";
import { activeAgents } from "@/data/mock-chat";

export function ChatContextBar() {
  const runningCount = activeAgents.filter(a => a.status === "running").length;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-panel text-[10px] font-mono overflow-x-auto shrink-0">
      <span className="text-muted-foreground">Project:</span>
      <span className="text-foreground">SaaS Dashboard</span>
      <span className="text-border">|</span>

      <GitBranch className="h-3 w-3 text-muted-foreground" />
      <span className="text-primary">main</span>
      <span className="text-border">|</span>

      <span className="text-muted-foreground">Task:</span>
      <span className="text-foreground truncate max-w-[140px]">User management module</span>
      <span className="text-border">|</span>

      <Cloud className="h-3 w-3 text-primary" />
      <span className="text-foreground">Anthropic</span>
      <span className="text-border">|</span>

      <Shield className="h-3 w-3 text-success" />
      <span className="text-success">Private</span>
      <span className="text-border">|</span>

      <RefreshCw className="h-3 w-3 text-success" />
      <span className="text-success">Synced</span>
      <span className="text-border">|</span>

      <Cpu className="h-3 w-3 text-primary animate-pulse" />
      <span className="text-primary">{runningCount} agents active</span>

      <div className="ml-auto flex items-center gap-1.5">
        <Eye className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">AGENTS.md</span>
      </div>
    </div>
  );
}
