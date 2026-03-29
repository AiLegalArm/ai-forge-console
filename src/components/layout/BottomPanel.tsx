import { useState } from "react";
import { Terminal, FileText, TestTube, Code, Activity, ChevronUp, ChevronDown } from "lucide-react";

const tabs = [
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "logs", icon: FileText, label: "Logs" },
  { id: "tests", icon: TestTube, label: "Tests" },
  { id: "python", icon: Code, label: "Python" },
  { id: "agent-trace", icon: Activity, label: "Agent Trace" },
];

const mockTerminalLines = [
  { time: "14:32:01", text: "$ npm run build", type: "command" as const },
  { time: "14:32:02", text: "vite v5.4.19 building for production...", type: "info" as const },
  { time: "14:32:03", text: "✓ 142 modules transformed.", type: "success" as const },
  { time: "14:32:03", text: "dist/index.html         0.46 kB │ gzip:  0.30 kB", type: "info" as const },
  { time: "14:32:03", text: "dist/assets/index.js  247.12 kB │ gzip: 78.34 kB", type: "info" as const },
  { time: "14:32:03", text: "✓ built in 1.2s", type: "success" as const },
];

const mockAgentTrace = [
  { time: "14:31:45", agent: "Planner Agent", action: "Decomposing task into 8 subtasks", status: "done" },
  { time: "14:31:52", agent: "Prompt Generator", action: "Generating prompt for subtask #1", status: "done" },
  { time: "14:31:58", agent: "Frontend Agent", action: "Creating component: DashboardHeader.tsx", status: "done" },
  { time: "14:32:04", agent: "Frontend Agent", action: "Creating component: MetricsGrid.tsx", status: "running" },
  { time: "14:32:10", agent: "Code Auditor", action: "Queued: audit DashboardHeader.tsx", status: "queued" },
];

interface BottomPanelProps {
  expanded: boolean;
  onToggle: () => void;
}

export function BottomPanel({ expanded, onToggle }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState("terminal");
  const height = expanded ? "h-64" : "h-36";

  return (
    <div className={`${height} border-t border-border bg-panel shrink-0 flex flex-col transition-all`}>
      <div className="flex items-center border-b border-border px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </button>
        ))}
        <button
          onClick={onToggle}
          className="ml-auto px-2 text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {activeTab === "terminal" && (
          <div className="space-y-0.5">
            {mockTerminalLines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={l.type === "success" ? "text-success" : l.type === "command" ? "text-primary" : "text-foreground"}>
                  {l.text}
                </span>
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground">14:32:04</span>
              <span className="text-primary">$</span>
              <span className="w-1.5 h-3.5 bg-primary animate-pulse-glow" />
            </div>
          </div>
        )}
        {activeTab === "agent-trace" && (
          <div className="space-y-1">
            {mockAgentTrace.map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-muted-foreground shrink-0">{t.time}</span>
                <span className={`shrink-0 px-1 rounded text-[10px] ${
                  t.status === "done" ? "bg-success/20 text-success" :
                  t.status === "running" ? "bg-primary/20 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>{t.status}</span>
                <span className="text-accent shrink-0">{t.agent}</span>
                <span className="text-foreground">{t.action}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "logs" && (
          <div className="text-muted-foreground">
            <div>[INFO] Application started on port 5173</div>
            <div>[INFO] Hot module replacement enabled</div>
            <div>[WARN] Deprecation warning: useEffect cleanup</div>
            <div>[INFO] 3 routes registered</div>
          </div>
        )}
        {activeTab === "tests" && (
          <div className="space-y-0.5">
            <div><span className="text-success">✓</span> src/components/Header.test.tsx (4 tests) <span className="text-muted-foreground">120ms</span></div>
            <div><span className="text-success">✓</span> src/lib/utils.test.ts (8 tests) <span className="text-muted-foreground">45ms</span></div>
            <div><span className="text-destructive">✗</span> src/hooks/useAuth.test.ts (1 failed) <span className="text-muted-foreground">230ms</span></div>
            <div className="text-muted-foreground mt-1">Tests: 12 passed, 1 failed | Coverage: 37%</div>
          </div>
        )}
        {activeTab === "python" && (
          <div className="space-y-0.5">
            <div className="text-primary">Python 3.12.0 | Execution Environment</div>
            <div><span className="text-muted-foreground">{'>>>'}</span> import pandas as pd</div>
            <div><span className="text-muted-foreground">{'>>>'}</span> df = pd.read_csv("data.csv")</div>
            <div><span className="text-muted-foreground">{'>>>'}</span> df.shape</div>
            <div className="text-foreground">(1024, 12)</div>
          </div>
        )}
      </div>
    </div>
  );
}
