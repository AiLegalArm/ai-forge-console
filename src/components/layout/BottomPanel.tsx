import { useMemo, useState } from "react";
import { Terminal, FileText, TestTube, Code, Activity, ChevronUp, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TerminalSessionState } from "@/types/local-shell";
import type { ExecutionTrace } from "@/types/workflow";
import { Tabs, TabButton, TraceRow, Button } from "@/ui";

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
  const height = expanded ? "h-60" : "h-32";

  const latestCommand = useMemo(() => terminal.history[0], [terminal.history]);
  const latestTraces = useMemo(() => [...traces].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso)).slice(0, 5), [traces]);

  return (
    <div className={`${height} border-t border-border-subtle bg-background shrink-0 flex flex-col ui-transition`}>
      <Tabs className="px-1">
        {tabConfig.map((tab) => (
          <TabButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            active={activeTab === tab.id}
            className="h-7 flex items-center gap-1"
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </TabButton>
        ))}
        <Button onClick={onToggle} variant="ghost" className="ml-auto h-7 px-2">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
      </Tabs>
      <div className="flex-1 overflow-auto p-2 font-mono text-[10px]">
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
                <span className="text-muted-foreground shrink-0 tabular-nums">{new Date(line.timestampIso).toLocaleTimeString()}</span>
                <span className={line.stream === "stderr" ? "text-warning" : line.stream === "system" ? "text-primary" : "text-foreground"}>{line.text}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "agent-trace" && (
          <div className="space-y-1">
            {latestTraces.length === 0 ? (
              <div className="text-muted-foreground">No runtime activity yet.</div>
            ) : latestTraces.map((trace) => (
              <TraceRow
                key={trace.traceId}
                label={`${trace.provider ?? "unknown"} / ${trace.model ?? "unknown"}`}
                timestamp={new Date(trace.updatedAtIso).toLocaleTimeString()}
                status={trace.finalResultState === "failed" ? "error" : trace.fallbackUsed ? "warn" : "ok"}
                details={`${trace.taskId ?? "no-task"} · ${trace.summary.outcome}${trace.fallbackUsed ? " · fallback" : ""}`}
              />
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
