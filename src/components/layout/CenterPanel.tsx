import type { NavSection, AppMode } from "./AppLayout";
import { ProjectsView } from "@/components/views/ProjectsView";
import { PromptStudioView } from "@/components/views/PromptStudioView";
import { PromptLibraryView } from "@/components/views/PromptLibraryView";
import { AgentStudioView } from "@/components/views/AgentStudioView";
import { ProviderHubView } from "@/components/views/ProviderHubView";
import { AuditsView } from "@/components/views/AuditsView";
import { SupabaseImportView } from "@/components/views/SupabaseImportView";
import { ReleaseCenterView } from "@/components/views/ReleaseCenterView";
import { WorkspaceView } from "@/components/views/WorkspaceView";
import { SettingsView } from "@/components/views/SettingsView";

interface CenterPanelProps {
  activeSection: NavSection;
  mode: AppMode;
}

export function CenterPanel({ activeSection, mode }: CenterPanelProps) {
  // Workspace view manages its own layout/scroll
  const isWorkspace = !["projects","prompt-studio","prompt-library","agents","providers","audits","supabase-import","release","settings"].includes(activeSection);

  if (isWorkspace) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <WorkspaceView section={activeSection} mode={mode} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "projects": return <ProjectsView />;
      case "prompt-studio": return <PromptStudioView />;
      case "prompt-library": return <PromptLibraryView />;
      case "agents": return <AgentStudioView />;
      case "providers": return <ProviderHubView />;
      case "audits": return <AuditsView />;
      case "supabase-import": return <SupabaseImportView />;
      case "release": return <ReleaseCenterView />;
      case "settings": return <SettingsView />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto min-h-0">
      {renderContent()}
    </div>
  );
}
