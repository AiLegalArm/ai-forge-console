import { type AppMode } from "./AppLayout";
import { Cloud, Cpu, Smartphone, Menu, PanelRight, Terminal, ShieldCheck, GitBranch } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { LocalShellWorkspaceState } from "@/types/local-shell";
import type { WorkspaceRepositoryState } from "@/types/workspace";

const modeKeys = {
  operator: "operator" as const,
  plan: "plan" as const,
  build: "build" as const,
  audit: "audit" as const,
  release: "release" as const,
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
    <header className="h-10 flex items-center justify-between border-b border-border bg-card px-3 shrink-0 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onToggleSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono font-semibold text-sm text-foreground">NEXUS</span>
        </div>
        <span className="text-border-default text-xs hidden sm:inline">·</span>
        <span className="text-xs text-muted-foreground font-mono hidden md:inline truncate max-w-[240px]">{currentProject}</span>
        <span className="hidden lg:inline-flex items-center gap-1 text-2xs font-mono text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span className="text-foreground">{currentBranch}</span>
          <span className={repository.connected ? "text-success" : "text-warning"}>{repository.connected ? "connected" : "disconnected"}</span>
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {(Object.keys(modeKeys) as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2 py-1 text-2xs font-mono rounded-md transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {t(modeKeys[m])}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <button
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          className="px-1.5 py-0.5 text-2xs font-mono bg-surface text-foreground rounded-md hover:bg-surface-hover transition-colors"
        >
          {lang === "ru" ? "EN" : "RU"}
        </button>
        <div className="hidden md:flex items-center gap-2 text-2xs font-mono">
          <ShieldCheck className={`h-3 w-3 ${localShell.security.safeDefaultsEnabled ? "text-success" : "text-warning"}`} />
          <span>{localShell.executionMode.replace(/_/g, " ")}</span>
          <span className="text-border-default">·</span>
          <Cloud className={`h-3 w-3 ${localShell.executionMode === "cloud_assisted" ? "text-primary" : ""}`} />
          <span>{localShell.security.privacyMode}</span>
          <span className="text-border-default">·</span>
          <Smartphone className="h-3 w-3" />
          <span>{localShell.desktopShellMode}</span>
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
