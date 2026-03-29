import { GitBranch, Shield, Cloud, Cpu, RefreshCw, Eye } from "lucide-react";
import { activeAgents } from "@/data/mock-chat";
import { useI18n } from "@/lib/i18n";

export function ChatContextBar() {
  const { t } = useI18n();
  const runningCount = activeAgents.filter(a => a.status === "running").length;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 border-b border-border bg-panel text-[10px] font-mono overflow-x-auto shrink-0">
      <span className="text-muted-foreground hidden sm:inline">{t("ctx.project")}</span>
      <span className="text-foreground truncate">SaaS Dashboard</span>
      <span className="text-border">|</span>

      <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-primary">main</span>
      <span className="text-border hidden sm:inline">|</span>

      <span className="text-muted-foreground hidden md:inline">{t("ctx.task")}</span>
      <span className="text-foreground truncate max-w-[120px] hidden md:inline">User management module</span>
      <span className="text-border hidden md:inline">|</span>

      <Cloud className="h-3 w-3 text-primary shrink-0 hidden sm:block" />
      <span className="text-foreground hidden sm:inline">Anthropic</span>
      <span className="text-border hidden sm:inline">|</span>

      <Shield className="h-3 w-3 text-success shrink-0" />
      <span className="text-success hidden sm:inline">{t("ctx.private")}</span>

      <span className="text-border hidden md:inline">|</span>
      <RefreshCw className="h-3 w-3 text-success shrink-0 hidden md:block" />
      <span className="text-success hidden md:inline">{t("ctx.synced")}</span>

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
