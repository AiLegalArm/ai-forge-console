import { type AppMode } from "./AppLayout";
import { Cloud, Cpu, Smartphone, Menu, PanelRight, Terminal, ShieldCheck, GitBranch } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { LocalShellWorkspaceState } from "@/types/local-shell";
import type { WorkspaceRepositoryState } from "@/types/workspace";

const modeKeys = {
  plan: "plan" as const,
  build: "build" as const,
  audit: "audit" as const,
  release: "release" as const,
};

const modeColors: Record<AppMode, string> = {
  plan: "bg-info",
  build: "bg-primary",
  audit: "bg-warning",
  release: "bg-success",
};

interface TopBarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  onToggleSidebar?: () => void;
  onToggleRight?: () => void;
  onToggleBottom?: () => void;
  currentProject: string;
  localShell: LocalShellWorkspaceState;
  repository: WorkspaceRepositoryState;
  currentBranch: string;
}

export function TopBar({ mode, onModeChange, onToggleSidebar, onToggleRight, onToggleBottom, currentProject, localShell, repository, currentBranch }: TopBarProps) {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="h-10 flex items-center justify-between border-b border-border bg-panel px-2 md:px-3 shrink-0 gap-1">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onToggleSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold text-sm text-gradient-primary">NEXUS</span>
        </div>
        <span className="text-muted-foreground text-xs hidden sm:inline">|</span>
        <span className="text-xs text-muted-foreground font-mono hidden md:inline truncate max-w-[280px]">{currentProject}</span>
        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono border border-border rounded px-1.5 py-0.5">
          <GitBranch className="h-3 w-3" />
          <span className="text-primary">{currentBranch}</span>
          <span className={repository.connected ? "text-success" : "text-warning"}>{repository.connected ? repository.name ?? "repo connected" : "repo disconnected"}</span>
        </span>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {(Object.keys(modeKeys) as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-mono rounded transition-all ${
              mode === m
                ? `${modeColors[m]} text-primary-foreground`
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {t(modeKeys[m])}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        <button
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          className="px-1.5 py-0.5 text-[10px] font-mono bg-surface text-foreground rounded hover:bg-surface-hover transition-colors"
        >
          {lang === "ru" ? "EN" : "RU"}
        </button>
        <div className="hidden md:flex items-center gap-2">
          <ShieldCheck className={`h-3.5 w-3.5 ${localShell.security.safeDefaultsEnabled ? "text-success" : "text-warning"}`} />
          <span className="text-xs font-mono">{localShell.executionMode.replace(/_/g, " ")}</span>
          <span className="text-xs">|</span>
          <Cloud className={`h-3.5 w-3.5 ${localShell.executionMode === "cloud_assisted" ? "text-primary" : ""}`} />
          <span className="text-xs font-mono">{localShell.security.privacyMode}</span>
          <span className="text-xs">|</span>
          <Smartphone className="h-3.5 w-3.5" />
          <span className="text-xs font-mono">{localShell.desktopShellMode}</span>
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
