import { Envelope, GitBranch, MonitorPlay, Play, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Tabs, TabButton } from "@/components/ui/tabs";
import { Panel, PanelBody, PanelHeader, PanelFooter } from "@/components/ui/panel";
import { ListRow } from "@/components/ui/list-row";
import { TraceRow } from "@/components/ui/trace-row";
import { ChatRow } from "@/components/ui/chat-row";
import { PanelInsight } from "@/components/ui/panel-insight";

const navSections = [
  { id: "workspace", label: "Workspace" },
  { id: "tasks", label: "Tasks" },
  { id: "repo", label: "Repo" },
  { id: "agents", label: "Agents" },
  { id: "providers", label: "Providers" },
  { id: "deploy", label: "Deploy" },
];

const quickActions = [
  "Run agent",
  "Draft PR",
  "Refresh routing",
  "Trigger preview",
];

const tasks = [
  { label: "Task · build onboarding", status: "running" },
  { label: "Audit · RBAC policy", status: "queued" },
  { label: "Deploy · preview", status: "blocked" },
];

const agentLogs = [
  { label: "Frontend Agent", detail: "Compiling UI kit" },
  { label: "Backend Agent", detail: "Applying migrations" },
  { label: "Audit Agent", detail: "Reviewing access rules" },
];

export default function BuilderWorkspace() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-20 border-r border-border-subtle bg-sidebar p-4">
        <div className="mb-10 flex items-center justify-center text-xs font-mono uppercase tracking-[0.4em] text-white/70">Work</div>
        <div className="space-y-2">
          {navSections.map((section) => (
            <button key={section.id} className="flex w-full items-center justify-center rounded-2xl border border-transparent bg-white/5 px-2 py-3 text-[11px] font-semibold text-white/80 transition hover:border-primary/40 hover:text-white">
              {section.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border-subtle bg-surface px-6 py-4">
          <div>
            <Text className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Project</Text>
            <div className="flex items-center gap-3 text-lg font-semibold">AI Forge Console <Badge variant="primary">live</Badge></div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="border border-border-subtle">
              <Play className="h-4 w-4" /> Run command
            </Button>
            <Button variant="secondary" size="sm">Toggle audit</Button>
          </div>
        </header>

        <div className="flex flex-1 gap-6 p-6">
          <div className="w-96 space-y-6">
            <Card className="border border-border-subtle bg-panel p-5">
              <div className="flex items-center justify-between">
                <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI control</Text>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border hover:border-primary/60 bg-background/60 p-4">
                  <Text className="text-sm font-semibold">Main chat</Text>
                  <Text className="text-[11px] text-muted-foreground">Provider: OpenRouter · Model: gpt-4.1</Text>
                </div>
                <div className="rounded-xl border border-border hover:border-primary/60 bg-background/60 p-4">
                  <Text className="text-sm font-semibold">Routing profile</Text>
                  <Text className="text-[11px] text-muted-foreground">quality_first · cost cap 300 tok</Text>
                </div>
                <div className="rounded-xl border border-border hover:border-primary/60 bg-background/60 p-4">
                  <Text className="text-sm font-semibold">Agent directives</Text>
                  <Text className="text-[11px] text-muted-foreground">Show blockers, use audit trail</Text>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border border-border-subtle bg-surface p-5">
              <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Actions</Text>
              <div className="mt-4 grid gap-3">
                {quickActions.map((action) => (
                  <Button key={action} variant="ghost" className="justify-between border border-border-subtle bg-white/5 text-sm">{action}</Button>
                ))}
              </div>
            </Card>

            <Card className="rounded-3xl border border-border-subtle bg-surface p-5">
              <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Task graph</Text>
              <div className="mt-4 space-y-3">
                {tasks.map((task) => (
                  <div key={task.label} className="flex items-center justify-between rounded-2xl border border-border py-2 px-3">
                    <Text className="text-sm">{task.label}</Text>
                    <Badge variant={task.status === "blocked" ? "destructive" : task.status === "running" ? "primary" : "neutral"}>{task.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <div className="flex gap-6">
              <Card className="flex flex-1 flex-col gap-4 border border-border-subtle bg-surface p-6">
                <div className="flex items-center justify-between">
                  <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Canvas preview</Text>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <div className="flex flex-1 flex-col gap-3 rounded-[28px] border border-border-subtle bg-gradient-to-br from-[#011028] to-[#040d1f] p-6">
                  <Text className="text-base font-semibold text-white/90">User onboarding flow</Text>
                  <Text className="text-sm text-white/70">Stacked layout + transitions preview.</Text>
                  <div className="h-44 rounded-2xl bg-gradient-to-br from-primary/80 to-[#ff8c42]/70" />
                </div>
              </Card>

              <Card className="flex flex-1 flex-col gap-4 border border-border-subtle bg-surface p-6">
                <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live approvals</Text>
                <TraceRow label="OpenRouter" timestamp="14:32" status="ok" details="preview-auth-check" />
                <TraceRow label="Ollama" timestamp="14:31" status="warn" details="fallback engaged" />
                <Button variant="ghost" className="border border-border-subtle" size="sm">
                  See audit trail
                </Button>
              </Card>
            </div>

            <Panel className="rounded-[32px] border border-border-subtle bg-panel">
              <PanelHeader>
                <div>
                  <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Live chat</Text>
                  <Text className="text-base font-semibold">Agent orchestration</Text>
                </div>
                <PanelInsight icon={MonitorPlay} label="Streaming" value="stable" />
              </PanelHeader>
              <PanelBody>
                <ChatRow role="user" content="Build user admin schema with RBAC" meta="14:28" />
                <ChatRow role="agent" content="Generating schema + tests..." meta="14:29" />
                <ChatRow role="system" content="Agent success, pending audit." meta="14:30" />
              </PanelBody>
              <PanelFooter>
                <Button variant="secondary" size="sm">
                  Continue steps
                </Button>
                <Button variant="ghost" size="sm" className="border border-border-subtle">
                  View approvals
                </Button>
              </PanelFooter>
            </Panel>

            <Panel className="rounded-[32px] border border-border-subtle bg-panel">
              <PanelHeader>
                <Text className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Agent log</Text>
              </PanelHeader>
              <PanelBody className="space-y-3">
                {agentLogs.map((log) => (
                  <ListRow key={log.label} left={<Zap className="h-4 w-4" />} center={log.label} right={<Text className="text-[11px] text-muted-foreground">{log.detail}</Text>} />
                ))}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}