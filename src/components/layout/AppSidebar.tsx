import {
  FolderKanban, Files, GitBranch, Wand2, Library, Bot, Plug, ShieldCheck,
  Database, Rocket, Globe, Package, Settings, ChevronLeft, X, MessageSquare,
  Palette, MonitorPlay, CircleDot,
} from "lucide-react";
import type { NavSection } from "./AppLayout";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import { SidebarNavRow } from "@/ui";

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

  return (
    <aside
      className={`flex flex-col border-r border-border-subtle bg-sidebar shrink-0 ui-transition h-full ${
        isMobile ? "w-52" : collapsed ? "w-12" : "w-52"
      }`}
    >
      {/* Brand header */}
      {(!collapsed || isMobile) && (
        <div className="px-3 py-2.5 border-b border-border-subtle">
          <div className="text-[11px] font-mono font-medium text-foreground truncate">{workspaceState.currentProject}</div>
          <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{workspaceState.currentTaskStatus.replace(/_/g, " ")}</div>
        </div>
      )}

      {/* Navigation */}
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

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-8 flex items-center justify-center border-t border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
      >
        {isMobile ? <X className="h-3.5 w-3.5" /> : <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-150 ${collapsed ? "rotate-180" : ""}`} />}
      </button>
    </aside>
  );
}
