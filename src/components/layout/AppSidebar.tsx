import {
  FolderKanban, Files, GitBranch, Wand2, Library, Bot, Plug, ShieldCheck,
  Database, Rocket, Globe, Package, Settings, ChevronLeft, X, MessageSquare,
  Palette, MonitorPlay, CircleDot, Folder, Link2, Workflow,
} from "lucide-react";
import type { NavSection } from "./AppLayout";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

const navItems: { id: NavSection; icon: React.ElementType; labelKey: string }[] = [
  { id: "workspace", icon: MessageSquare, labelKey: "nav.workspace" },
  { id: "projects", icon: FolderKanban, labelKey: "nav.projects" },
  { id: "files", icon: Files, labelKey: "nav.files" },
  { id: "git", icon: GitBranch, labelKey: "nav.git" },
  { id: "prompt-studio", icon: Wand2, labelKey: "nav.prompt-studio" },
  { id: "prompt-library", icon: Library, labelKey: "nav.prompt-library" },
  { id: "agents", icon: Bot, labelKey: "nav.agents" },
  { id: "providers", icon: Plug, labelKey: "nav.providers" },
  { id: "audits", icon: ShieldCheck, labelKey: "nav.audits" },
  { id: "supabase-import", icon: Database, labelKey: "nav.supabase-import" },
  { id: "deploy", icon: Rocket, labelKey: "nav.deploy" },
  { id: "domains", icon: Globe, labelKey: "nav.domains" },
  { id: "design", icon: Palette, labelKey: "nav.design" },
  { id: "browser", icon: MonitorPlay, labelKey: "nav.browser" },
  { id: "release", icon: Package, labelKey: "nav.release" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (s: NavSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  workspaceState: WorkspaceRuntimeState;
  isMobile?: boolean;
}

export function AppSidebar({ activeSection, onSectionChange, collapsed, onToggle, workspaceState, isMobile }: SidebarProps) {
  const { t } = useI18n();
  const activeTask = workspaceState.workflow.tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId) ?? workspaceState.workflow.tasks[0];
  const connectedRepo = workspaceState.repository.connected || Boolean(workspaceState.workflow.github.activeRepositoryId);
  const openRouterConnected = workspaceState.localInference.cloud.status === "connected";
  const ollamaHealthy = workspaceState.localInference.ollama.connectionHealthy;
  const blockingAudits = workspaceState.auditors.gateDecisions.reduce((sum, gate) => sum + gate.blockingFindingIds.length, 0);

  return (
    <aside
      className={`flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-150 h-full ${
        isMobile ? "w-56" : collapsed ? "w-12" : "w-60"
      }`}
    >
      {!collapsed || isMobile ? (
        <div className="px-3 py-2 border-b border-border space-y-1.5 text-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground uppercase font-mono tracking-wider">project</span>
            <span className="text-foreground font-medium truncate">{workspaceState.currentProject}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1"><Link2 className={`h-3 w-3 ${connectedRepo ? "text-success" : "text-warning"}`} />repo {connectedRepo ? "ok" : "—"}</span>
            <span className="flex items-center gap-1"><Plug className={`h-3 w-3 ${openRouterConnected || ollamaHealthy ? "text-success" : "text-warning"}`} />provider {(openRouterConnected || ollamaHealthy) ? "ok" : "—"}</span>
            <span className="flex items-center gap-1"><ShieldCheck className={`h-3 w-3 ${blockingAudits > 0 ? "text-warning" : "text-success"}`} />audits {blockingAudits > 0 ? `${blockingAudits}` : "ok"}</span>
            <span className="flex items-center gap-1"><Workflow className="h-3 w-3" />{workspaceState.currentTaskStatus.replace(/_/g, " ")}</span>
          </div>
          <div className="text-muted-foreground truncate">task: <span className="text-foreground">{activeTask?.title ?? workspaceState.currentTask}</span></div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? "text-primary bg-accent/10 border-r-2 border-primary"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
              title={collapsed && !isMobile ? t(item.labelKey as any) : undefined}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="font-medium truncate flex-1 text-left">{t(item.labelKey as any)}</span>
                  {isActive && <CircleDot className="h-2.5 w-2.5 text-primary" />}
                </>
              )}
            </button>
          );
        })}
      </div>

      {!collapsed || isMobile ? (
        <div className="px-2 py-2 border-t border-border space-y-0.5">
          <button onClick={() => onSectionChange("projects")} className="w-full text-left px-2 py-1 rounded-md text-2xs font-mono text-muted-foreground hover:bg-surface-hover hover:text-foreground flex items-center gap-1.5 transition-colors"><Folder className="h-3 w-3" /> switch project</button>
          {!connectedRepo && <button onClick={() => onSectionChange("git")} className="w-full text-left px-2 py-1 rounded-md text-2xs font-mono text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">connect repository</button>}
          {!(openRouterConnected || ollamaHealthy) && <button onClick={() => onSectionChange("providers")} className="w-full text-left px-2 py-1 rounded-md text-2xs font-mono text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">connect provider</button>}
          <button onClick={() => onSectionChange("agents")} className="w-full text-left px-2 py-1 rounded-md text-2xs font-mono text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">agent activity</button>
          <button onClick={() => onSectionChange("audits")} className="w-full text-left px-2 py-1 rounded-md text-2xs font-mono text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors">audit gates</button>
        </div>
      ) : null}
      <button
        onClick={onToggle}
        className="h-8 flex items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {isMobile ? <X className="h-3.5 w-3.5" /> : <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-150 ${collapsed ? "rotate-180" : ""}`} />}
      </button>
    </aside>
  );
}
