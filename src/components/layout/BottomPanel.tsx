import { useMemo, useState } from "react";
import { Terminal, FileText, TestTube, Code, Activity, ChevronUp, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TerminalSessionState } from "@/types/local-shell";
import type { ExecutionTrace } from "@/types/workflow";

interface BottomPanelProps {
  expanded: boolean;
  onToggle: () => void;
  terminal: TerminalSessionState;
  traces: ExecutionTrace[];
}

export function BottomPanel({ expanded, onToggle, terminal, traces }: BottomPanelProps) {
  const { t } = useI18n();
  const tabConfig = [
    { id: "terminal", icon: Terminal, label: t("bp.terminal") },
    { id: "logs", icon: FileText, label: t("bp.logs") },
    { id: "tests", icon: TestTube, label: t("bp.tests") },
    { id: "python", icon: Code, label: t("bp.python") },
    { id: "agent-trace", icon: Activity, label: "Runtime" },
  ];
  const [activeTab, setActiveTab] = useState("terminal");
  const height = expanded ? "h-64" : "h-36";

  const latestCommand = useMemo(() => terminal.history[0], [terminal.history]);
  const recentActivity = useMemo(
    () => [...terminal.output].slice(0, 6),
    [terminal.output],
  );
  const latestTraces = useMemo(() => [...traces].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso)).slice(0, 5), [traces]);

  return (
    <div className={`${height} border-t border-border bg-card shrink-0 flex flex-col transition-all duration-150`}>
      <div className="flex items-center border-b border-border px-1 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2 py-1.5 text-2xs font-mono transition-colors border-b-2 shrink-0 ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
        <button onClick={onToggle} className="ml-auto px-2 text-muted-foreground hover:text-foreground shrink-0">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-2xs">
        {activeTab === "terminal" && (
          <div className="space-y-0.5">
            <div className="text-muted-foreground mb-1">session {terminal.sessionId} · cwd {terminal.workingDirectory}</div>
            {latestCommand ? (
              <div className="text-muted-foreground mb-1">
                origin {latestCommand.origin ?? "user"} {latestCommand.linkedAgentId ? `· agent ${latestCommand.linkedAgentId}` : ""}
              </div>
            ) : null}
            {terminal.output.map((line) => (
              <div key={line.id} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{new Date(line.timestampIso).toLocaleTimeString()}</span>
                <span className={line.stream === "stderr" ? "text-warning" : line.stream === "system" ? "text-primary" : "text-foreground"}>{line.text}</span>
              </div>
            ))}
            {latestCommand?.state === "running" ? (
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">now</span>
                <span className="text-primary">$</span>
                <span className="w-1.5 h-3 bg-primary animate-pulse" />
              </div>
            ) : null}
          </div>
        )}
        {activeTab === "agent-trace" && (
          <div className="space-y-1">
            {latestTraces.length === 0 ? (
              <div className="text-muted-foreground">No runtime activity yet.</div>
            ) : latestTraces.map((trace) => (
              <div key={trace.traceId} className="border border-border-subtle rounded-md px-2 py-1.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">{new Date(trace.updatedAtIso).toLocaleTimeString()}</span>
                  <span className={`shrink-0 px-1 rounded-md text-2xs ${trace.finalResultState === "failed" ? "bg-destructive/15 text-destructive" : trace.fallbackUsed ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{trace.status}</span>
                  <span className="text-foreground truncate">{trace.provider ?? "unknown"} / {trace.model ?? "unknown"}</span>
                </div>
                <div className="text-muted-foreground truncate">
                  {trace.taskId ?? "no-task"} · {trace.summary.outcome}
                  {trace.fallbackUsed ? " · fallback" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === "logs" && <div className="text-muted-foreground">Local runtime logs routed to the desktop shell.</div>}
        {activeTab === "tests" && <div className="text-muted-foreground">Tests are available from task-bound terminal commands.</div>}
        {activeTab === "python" && <div className="text-muted-foreground">Python runtime is available when enabled by local capabilities.</div>}
      </div>
    </div>
  );
}
