import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CenterPanel } from "@/components/layout/CenterPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { BottomPanel } from "@/components/layout/BottomPanel";
import { TopBar } from "@/components/layout/TopBar";

export type NavSection =
  | "projects" | "files" | "git" | "prompt-studio" | "prompt-library"
  | "agents" | "providers" | "audits" | "supabase-import" | "deploy"
  | "domains" | "release" | "settings";

export type AppMode = "plan" | "build" | "audit" | "release";

export default function AppLayout() {
  const [activeSection, setActiveSection] = useState<NavSection>("projects");
  const [mode, setMode] = useState<AppMode>("build");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomExpanded, setBottomExpanded] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("preview");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar mode={mode} onModeChange={setMode} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden">
            <CenterPanel activeSection={activeSection} mode={mode} />
            <BottomPanel expanded={bottomExpanded} onToggle={() => setBottomExpanded(!bottomExpanded)} />
          </div>
          <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} />
        </div>
      </div>
    </div>
  );
}
