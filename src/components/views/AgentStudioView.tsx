import { useMemo, useState } from "react";
import { workerAgents, auditorAgents, remediatorAgents, type Agent, type AgentStatus } from "@/data/mock-agents";
import { Bot, Shield, Wrench, ActivitySquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<AgentStatus, "neutral" | "default" | "success" | "destructive" | "warning"> = {
  idle: "neutral",
  running: "default",
  completed: "success",
  error: "destructive",
  queued: "warning",
};

export function AgentStudioView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const tabs = [
    { id: "workers", label: t("as.workers"), icon: Bot, agents: workerAgents },
    { id: "auditors", label: t("as.auditors"), icon: Shield, agents: auditorAgents },
    { id: "remediators", label: t("as.remediators"), icon: Wrench, agents: remediatorAgents },
  ];
  const [activeTab, setActiveTab] = useState("workers");
  const current = tabs.find((tab) => tab.id === activeTab)!;

  const activeRuntimeAgents = workspaceState.activeAgents;
  const runtimeByName = useMemo(() => Object.fromEntries(activeRuntimeAgents.map((agent) => [agent.name.toLowerCase(), agent])), [activeRuntimeAgents]);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-primary" /> {t("as.title")}
        </h1>
        <div className="flex gap-1">
          <button className="px-2 py-1 text-2xs font-mono bg-primary text-primary-foreground rounded-md">{t("as.custom")}</button>
          <button className="px-2 py-1 text-2xs font-mono bg-surface text-muted-foreground rounded-md hover:bg-surface-hover transition-colors">{t("as.templates")}</button>
        </div>
      </div>

      <div className="border border-border-subtle rounded-md p-2 text-2xs grid md:grid-cols-3 gap-2">
        <div className="text-muted-foreground">provider <span className="font-mono text-foreground">{workspaceState.activeProvider}</span></div>
        <div className="text-muted-foreground">model <span className="font-mono text-foreground">{workspaceState.activeModel}</span></div>
        <div className="text-muted-foreground">task <span className="font-mono text-foreground">{workspaceState.currentTask}</span></div>
        <div className="text-muted-foreground">budget <span className="font-mono text-foreground uppercase">{workspaceState.localInference.operational.budgetPressure}</span></div>
        <div className="text-muted-foreground">health <span className="font-mono text-foreground uppercase">{workspaceState.localInference.operational.providerHealth.openrouter}</span></div>
        <div className="text-muted-foreground">fallbacks <span className="font-mono text-foreground">{workspaceState.localInference.operational.fallbackEvents.length}</span></div>
      </div>

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-2xs font-mono border-b-2 transition-colors shrink-0 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
            <span className="text-2xs bg-surface px-1 rounded">{tab.agents.length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-0">
        {current.agents.map((a) => (
          <AgentRow key={a.id} agent={a} runtimeMatch={runtimeByName[a.name.toLowerCase()]} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({ agent, runtimeMatch }: { agent: Agent; runtimeMatch?: WorkspaceRuntimeState["activeAgents"][number] }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle hover:bg-surface-hover transition-colors cursor-pointer group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground truncate">{agent.name}</span>
          <Badge variant={statusVariant[agent.status]} size="sm">{agent.status}</Badge>
        </div>
        <p className="text-2xs text-muted-foreground truncate mt-0.5">{agent.description}</p>
      </div>
      <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono shrink-0">
        <span>{agent.model}</span>
        <span>{agent.successRate}%</span>
        <span className={runtimeMatch ? "text-success" : ""}>{runtimeMatch ? runtimeMatch.status : "inactive"}</span>
      </div>
      {agent.lastRun && (
        <div className="text-2xs text-muted-foreground flex items-center gap-1 shrink-0">
          <ActivitySquare className="h-3 w-3" />
          {agent.tasksCompleted}
        </div>
      )}
    </div>
  );
}
