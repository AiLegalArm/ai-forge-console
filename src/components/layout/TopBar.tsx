import { type AppMode } from "./AppLayout";
import { Cloud, Cpu, Smartphone, Menu, PanelRight, Terminal } from "lucide-react";

const modeConfig: Record<AppMode, { label: string; color: string }> = {
  plan: { label: "Plan", color: "bg-info" },
  build: { label: "Build", color: "bg-primary" },
  audit: { label: "Audit", color: "bg-warning" },
  release: { label: "Release", color: "bg-success" },
};

interface TopBarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  onToggleSidebar?: () => void;
  onToggleRight?: () => void;
  onToggleBottom?: () => void;
}

export function TopBar({ mode, onModeChange, onToggleSidebar, onToggleRight, onToggleBottom }: TopBarProps) {
  return (
    <header className="h-10 flex items-center justify-between border-b border-border bg-panel px-2 md:px-3 shrink-0 gap-1">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onToggleSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold text-sm text-gradient-primary">NEXUS</span>
        </div>
        <span className="text-muted-foreground text-xs hidden sm:inline">|</span>
        <span className="text-xs text-muted-foreground font-mono hidden sm:inline truncate">SaaS Dashboard</span>
      </div>

      {/* Mode toggles */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {(Object.keys(modeConfig) as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-mono rounded transition-all ${
              mode === m
                ? `${modeConfig[m].color} text-primary-foreground`
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {modeConfig[m].label}
          </button>
        ))}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <Cloud className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono">Cloud</span>
          <span className="text-xs">|</span>
          <Smartphone className="h-3.5 w-3.5" />
          <span className="text-xs font-mono">Mobile</span>
        </div>
        <button onClick={onToggleBottom} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <Terminal className="h-4 w-4" />
        </button>
        <button onClick={onToggleRight} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
