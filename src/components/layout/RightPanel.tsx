import { useState } from "react";
import { Eye, Globe, Palette, ShieldCheck, Rocket, Link } from "lucide-react";

const tabs = [
  { id: "preview", icon: Eye, label: "Preview" },
  { id: "browser", icon: Globe, label: "Browser" },
  { id: "design", icon: Palette, label: "Design" },
  { id: "audit-results", icon: ShieldCheck, label: "Audit" },
  { id: "deploy", icon: Rocket, label: "Deploy" },
  { id: "domain", icon: Link, label: "Domain" },
];

interface RightPanelProps {
  activeTab: string;
  onTabChange: (t: string) => void;
}

export function RightPanel({ activeTab, onTabChange }: RightPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-8 border-l border-border bg-panel flex flex-col items-center py-2 gap-1.5 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { onTabChange(t.id); setCollapsed(false); }}
            className="p-1 text-muted-foreground hover:text-foreground"
            title={t.label}
          >
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-border bg-panel flex flex-col shrink-0">
      <div className="flex items-center border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3 w-3" />
            <span className="hidden xl:inline">{t.label}</span>
          </button>
        ))}
        <button
          onClick={() => setCollapsed(true)}
          className="ml-auto px-2 text-muted-foreground hover:text-foreground text-xs"
        >
          ›
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <RightPanelContent tab={activeTab} />
      </div>
    </div>
  );
}

function RightPanelContent({ tab }: { tab: string }) {
  switch (tab) {
    case "preview":
      return (
        <div className="space-y-3">
          <div className="aspect-video rounded bg-surface border border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono">Live Preview</span>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded font-mono">Running</span>
            <span className="text-xs text-muted-foreground font-mono">localhost:5173</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Build time</span><span className="font-mono text-foreground">1.2s</span></div>
            <div className="flex justify-between"><span>Bundle size</span><span className="font-mono text-foreground">247kb</span></div>
            <div className="flex justify-between"><span>Errors</span><span className="font-mono text-success">0</span></div>
          </div>
        </div>
      );
    case "audit-results":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Health Score</span>
            <span className="text-lg font-mono font-bold text-warning">72</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-destructive/10 border border-destructive/20 rounded p-2"><span className="font-mono text-destructive text-lg">2</span><p className="text-muted-foreground">Critical</p></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-2"><span className="font-mono text-warning text-lg">3</span><p className="text-muted-foreground">High</p></div>
            <div className="bg-info/10 border border-info/20 rounded p-2"><span className="font-mono text-info text-lg">2</span><p className="text-muted-foreground">Medium</p></div>
            <div className="bg-success/10 border border-success/20 rounded p-2"><span className="font-mono text-success text-lg">1</span><p className="text-muted-foreground">Resolved</p></div>
          </div>
        </div>
      );
    case "deploy":
      return (
        <div className="space-y-3 text-xs">
          <div className="bg-surface rounded p-3 border border-border space-y-2">
            <div className="font-semibold text-foreground">Deploy Status</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" /><span className="text-muted-foreground">Production: <span className="text-success font-mono">Healthy</span></span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">Staging: <span className="text-primary font-mono">Deploying</span></span></div>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-32">
          <span className="text-xs text-muted-foreground font-mono">{tab} panel</span>
        </div>
      );
  }
}
