import { type AppMode } from "./AppLayout";
import { Cloud, Cpu, Smartphone } from "lucide-react";

const modeConfig: Record<AppMode, { label: string; color: string }> = {
  plan: { label: "Plan", color: "bg-info" },
  build: { label: "Build", color: "bg-primary" },
  audit: { label: "Audit", color: "bg-warning" },
  release: { label: "Release", color: "bg-success" },
};

interface TopBarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
}

export function TopBar({ mode, onModeChange }: TopBarProps) {
  return (
    <header className="h-10 flex items-center justify-between border-b border-border bg-panel px-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold text-sm text-gradient-primary">NEXUS</span>
        </div>
        <span className="text-muted-foreground text-xs">|</span>
        <span className="text-xs text-muted-foreground font-mono">SaaS Dashboard</span>
      </div>

      <div className="flex items-center gap-1">
        {(Object.keys(modeConfig) as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
              mode === m
                ? `${modeConfig[m].color} text-primary-foreground`
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {modeConfig[m].label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Cloud className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-mono">Cloud Connected</span>
        <span className="text-xs">|</span>
        <Smartphone className="h-3.5 w-3.5" />
        <span className="text-xs font-mono">Mobile Ready</span>
      </div>
    </header>
  );
}
