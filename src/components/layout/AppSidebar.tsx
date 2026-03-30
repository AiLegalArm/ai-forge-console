import {
  FolderKanban, Files, GitBranch, Wand2, Library, Bot, Plug, ShieldCheck,
  Database, Rocket, Globe, Package, Settings, ChevronLeft, X, MessageSquare,
  Palette, MonitorPlay, CircleDot, Folder, Link2, Workflow,
} from "lucide-react";
import type { NavSection } from "./AppLayout";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import { SidebarNavRow } from "@/ui/layout/sidebar";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";

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
      className={`flex flex-col border-r border-border-subtle bg-sidebar shrink-0 ui-transition h-full ${
        isMobile ? "w-56" : collapsed ? "w-12" : "w-56"
      }`}
    >
      {!collapsed || isMobile ? (
        <div className="px-2.5 py-2 border-b border-border-subtle space-y-1 text-[10px] font-mono">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground uppercase tracking-wider">project</span>
            <span className="text-foreground font-medium truncate">{workspaceState.currentProject}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1"><Link2 className={`h-3 w-3 ${connectedRepo ? "text-success" : "text-warning"}`} />repo {connectedRepo ? "ok" : "--"}</span>
            <span className="flex items-center gap-1"><Plug className={`h-3 w-3 ${openRouterConnected || ollamaHealthy ? "text-success" : "text-warning"}`} />runtime {(openRouterConnected || ollamaHealthy) ? "ok" : "--"}</span>
            <span className="flex items-center gap-1"><ShieldCheck className={`h-3 w-3 ${blockingAudits > 0 ? "text-warning" : "text-success"}`} />gate {blockingAudits > 0 ? `${blockingAudits}` : "ok"}</span>
            <span className="flex items-center gap-1"><Workflow className="h-3 w-3" />{workspaceState.currentTaskStatus.replace(/_/g, " ")}</span>
          </div>
          <div className="text-muted-foreground truncate">task <span className="text-foreground">{activeTask?.title ?? workspaceState.currentTask}</span></div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <SidebarNavRow
              key={item.id}
              icon={item.icon}
              active={isActive}
              onClick={() => onSectionChange(item.id)}
              label={(!collapsed || isMobile) ? t(item.labelKey as never) : ""}
              title={collapsed && !isMobile ? t(item.labelKey as never) : undefined}
              right={(!collapsed || isMobile) && isActive ? <CircleDot className="h-2.5 w-2.5 text-primary" /> : undefined}
            />
          );
        })}
      </div>

      {!collapsed || isMobile ? (
        <div className="px-2 py-2 border-t border-border-subtle space-y-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant={connectedRepo ? "success" : "warning"}>repo</Badge>
            <Badge variant={openRouterConnected || ollamaHealthy ? "success" : "warning"}>runtime</Badge>
          </div>
          <Button onClick={() => onSectionChange("projects")} variant="ghost" className="w-full justify-start text-[10px] font-mono"><Folder className="h-3 w-3" /> switch project</Button>
          {!connectedRepo && <Button onClick={() => onSectionChange("git")} variant="ghost" className="w-full justify-start text-[10px] font-mono">connect repository</Button>}
          {!(openRouterConnected || ollamaHealthy) && <Button onClick={() => onSectionChange("providers")} variant="ghost" className="w-full justify-start text-[10px] font-mono">connect provider</Button>}
        </div>
      ) : null}
      <button
        onClick={onToggle}
        className="h-8 flex items-center justify-center border-t border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
      >
        {isMobile ? <X className="h-3.5 w-3.5" /> : <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-150 ${collapsed ? "rotate-180" : ""}`} />}
      </button>
    </aside>
  );
}
