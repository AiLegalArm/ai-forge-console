import {
  FolderKanban, Files, GitBranch, Wand2, Library, Bot, Plug, ShieldCheck,
  Database, Rocket, Globe, Package, Settings, ChevronLeft, X,
} from "lucide-react";
import type { NavSection } from "./AppLayout";

const navItems: { id: NavSection; icon: React.ElementType; label: string }[] = [
  { id: "projects", icon: FolderKanban, label: "Projects" },
  { id: "files", icon: Files, label: "Files" },
  { id: "git", icon: GitBranch, label: "Git" },
  { id: "prompt-studio", icon: Wand2, label: "Prompt Studio" },
  { id: "prompt-library", icon: Library, label: "Prompt Library" },
  { id: "agents", icon: Bot, label: "Agents" },
  { id: "providers", icon: Plug, label: "Providers" },
  { id: "audits", icon: ShieldCheck, label: "Audits" },
  { id: "supabase-import", icon: Database, label: "Supabase Import" },
  { id: "deploy", icon: Rocket, label: "Deploy" },
  { id: "domains", icon: Globe, label: "Domains" },
  { id: "release", icon: Package, label: "Release" },
  { id: "settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (s: NavSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function AppSidebar({ activeSection, onSectionChange, collapsed, onToggle, isMobile }: SidebarProps) {
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
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {(!collapsed || isMobile) && <span className="font-medium truncate">{item.label}</span>}
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
