import { useState } from "react";
import { workerAgents, auditorAgents, remediatorAgents, type Agent, type AgentStatus } from "@/data/mock-agents";
import { Bot, Shield, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const statusStyles: Record<AgentStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  error: "bg-destructive/20 text-destructive",
  queued: "bg-warning/20 text-warning",
};

export function AgentStudioView() {
  const { t } = useI18n();
  const tabs = [
    { id: "workers", label: t("as.workers"), icon: Bot, agents: workerAgents },
    { id: "auditors", label: t("as.auditors"), icon: Shield, agents: auditorAgents },
    { id: "remediators", label: t("as.remediators"), icon: Wrench, agents: remediatorAgents },
  ];
  const [activeTab, setActiveTab] = useState("workers");
  const current = tabs.find((tab) => tab.id === activeTab)!;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> {t("as.title")}
        </h1>
        <div className="flex gap-1.5">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("as.custom")}</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("as.templates")}</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 transition shrink-0 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
            <span className="font-mono text-[10px] bg-muted px-1 rounded">{tab.agents.length}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {current.agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useI18n();
  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition cursor-pointer">
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-foreground leading-tight">{agent.name}</h3>
        <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${statusStyles[agent.status]}`}>{agent.status}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{agent.description}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{agent.model}</span><span>•</span><span>{agent.provider}</span><span>•</span><span>{agent.successRate}%</span>
      </div>
      {agent.lastRun && <div className="text-[10px] text-muted-foreground mt-1">{t("as.last")} {agent.lastRun} • {agent.tasksCompleted} {t("as.tasks")}</div>}
    </div>
  );
}
