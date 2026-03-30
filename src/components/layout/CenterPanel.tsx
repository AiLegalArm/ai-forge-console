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
import type { ChatState, ChatType } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import type { AppRoutingModeProfile } from "@/types/local-inference";

interface CenterPanelProps {
  activeSection: NavSection;
  mode: AppMode;
  workspaceState: WorkspaceRuntimeState;
  chatContexts: ChatContextMap;
  chatState: ChatState;
  onConversationTypeChange: (conversation: ChatType) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onSendMessage: (conversation: ChatType) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve: (approvalId: string) => void | Promise<void>;
  onGitAction: (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull", taskId: string) => Promise<void>;
  onRunBrowserScenario: () => Promise<void>;
  onRefreshLocalInference: () => Promise<void>;
  onProviderSourceChange: (source: "openrouter" | "ollama") => void;
  onModelChange: (model: string) => void;
  onDeploymentModeChange: (mode: "local" | "cloud" | "hybrid") => void;
  onRoutingProfileChange: (profile: AppRoutingModeProfile) => void;
  onAddLocalProject: (payload?: { name?: string; localPath?: string; projectRoot?: string }) => Promise<{ ok: boolean; message: string; path?: string }>;
  onCreateProject: (payload: { name: string; description?: string; projectType?: string }) => void;
  onConnectRepository: (payload: { pathOrUrl: string; name?: string; branch?: string }) => Promise<{ ok: boolean; code: string; message: string }>;
  onDisconnectRepository: () => void;
  onActiveProjectChange: (projectId: string) => void;
  onRunProjectCommand: (commandId: string) => Promise<{ ok: boolean; message: string; code?: string }>;
  onRunProjectCommandCategory: (category: "dev" | "build" | "test" | "lint" | "typecheck") => Promise<{ ok: boolean; message: string; code?: string }>;
}

export function CenterPanel({ activeSection, mode, workspaceState, chatContexts, chatState, onConversationTypeChange, onDraftChange, onSendMessage, onApprovalResolve, onWorkflowApprovalResolve, onGitAction, onRunBrowserScenario, onRefreshLocalInference, onProviderSourceChange, onModelChange, onDeploymentModeChange, onRoutingProfileChange, onAddLocalProject, onCreateProject, onConnectRepository, onDisconnectRepository, onActiveProjectChange, onRunProjectCommand, onRunProjectCommandCategory }: CenterPanelProps) {
  const isWorkspace = ["workspace", "files", "git", "deploy", "domains", "design", "browser"].includes(activeSection);

  if (isWorkspace) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <WorkspaceView
          section={activeSection}
          mode={mode}
          workspaceState={workspaceState}
          chatContexts={chatContexts}
          chatState={chatState}
          onConversationTypeChange={onConversationTypeChange}
          onDraftChange={onDraftChange}
          onSendMessage={onSendMessage}
          onApprovalResolve={onApprovalResolve}
          onWorkflowApprovalResolve={onWorkflowApprovalResolve}
          onGitAction={onGitAction}
          onRunBrowserScenario={onRunBrowserScenario}
          onProviderSourceChange={onProviderSourceChange}
          onModelChange={onModelChange}
          onDeploymentModeChange={onDeploymentModeChange}
          onRoutingProfileChange={onRoutingProfileChange}
          onAddLocalProject={onAddLocalProject}
          onCreateProject={onCreateProject}
          onConnectRepository={onConnectRepository}
          onDisconnectRepository={onDisconnectRepository}
          onActiveProjectChange={onActiveProjectChange}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "projects": return <ProjectsView workspaceState={workspaceState} onAddLocalProject={onAddLocalProject} onActiveProjectChange={onActiveProjectChange} onRunProjectCommand={onRunProjectCommand} onRunProjectCommandCategory={onRunProjectCommandCategory} />;
      case "prompt-studio": return <PromptStudioView />;
      case "prompt-library": return <PromptLibraryView />;
      case "agents": return <AgentStudioView workspaceState={workspaceState} />;
      case "providers": return <ProviderHubView workspaceState={workspaceState} onRefreshLocalInference={onRefreshLocalInference} />;
      case "audits": return <AuditsView workspaceState={workspaceState} />;
      case "supabase-import": return <SupabaseImportView />;
      case "release": return <ReleaseCenterView />;
      case "settings": return <SettingsView />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="px-4 pt-3">
        <div className="rounded border border-border/70 bg-card px-3 py-2 text-[10px] font-mono flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">project</span>
          <span className="text-foreground">{workspaceState.currentProject}</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">repo</span>
          <span className={workspaceState.repository.connected ? "text-success" : "text-warning"}>{workspaceState.repository.connected ? "connected" : "missing"}</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">provider/model</span>
          <span className="text-foreground">{workspaceState.providerSource} · {workspaceState.activeModel}</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">task</span>
          <span className="text-foreground">{workspaceState.currentTask}</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">mode</span>
          <span className="text-primary uppercase">{mode}</span>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
