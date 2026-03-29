import {
  FolderKanban, Files, GitBranch, Wand2, Library, Bot, Plug, ShieldCheck,
  Database, Rocket, Globe, Package, Settings, ChevronLeft, X, MessageSquare,
} from "lucide-react";
import type { NavSection } from "./AppLayout";
import { useI18n } from "@/lib/i18n";

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
  { id: "release", icon: Package, labelKey: "nav.release" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (s: NavSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function AppSidebar({ activeSection, onSectionChange, collapsed, onToggle, isMobile }: SidebarProps) {
  const { t } = useI18n();

  return (
    <aside
      className={`flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-200 h-full ${
        isMobile ? "w-56" : collapsed ? "w-12" : "w-48"
      }`}
    >
      <div className="flex-1 overflow-y-auto py-1.5">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 md:py-1.5 text-xs transition-colors ${
                isActive
                  ? "text-primary bg-sidebar-accent border-r-2 border-primary"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
              }`}
              title={collapsed && !isMobile ? t(item.labelKey as any) : undefined}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {(!collapsed || isMobile) && <span className="font-medium truncate">{t(item.labelKey as any)}</span>}
            </button>
          );
        })}
      </div>
      <button
        onClick={onToggle}
        className="h-8 flex items-center justify-center border-t border-border text-muted-foreground hover:text-foreground"
      >
        {isMobile ? <X className="h-3.5 w-3.5" /> : <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />}
      </button>
    </aside>
  );
}
