import { useState } from "react";
import { useChatWorkspaceState } from "@/hooks/use-chat-workspace-state";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CenterPanel } from "@/components/layout/CenterPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { BottomPanel } from "@/components/layout/BottomPanel";
import { TopBar } from "@/components/layout/TopBar";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;

export type NavSection =
  | "workspace" | "projects" | "files" | "git" | "prompt-studio" | "prompt-library"
  | "agents" | "providers" | "audits" | "supabase-import" | "deploy"
  | "domains" | "design" | "browser" | "release" | "settings";

export type AppMode = "plan" | "build" | "audit" | "release";

export default function AppLayout() {
  const [activeSection, setActiveSection] = useState<NavSection>("workspace");
  const [mode, setMode] = useState<AppMode>("build");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomExpanded, setBottomExpanded] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("preview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [mobileBottomOpen, setMobileBottomOpen] = useState(false);

  const {
    chatState,
    workspaceState,
    chatContexts,
    setConversationType,
    setDraft,
    clearApproval,
    approveWorkflowApproval,
    runGitAction,
    runBrowserScenario,
    refreshLocalInference,
    sendMessage,
    setProviderSource,
    setActiveModel,
    setDeploymentMode,
    setRoutingProfile,
    addLocalProject,
    createProject,
    connectRepository,
    disconnectRepository,
    setActiveProject,
  } = useChatWorkspaceState();

  const handleSectionChange = (s: NavSection) => {
    setActiveSection(s);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <TopBar
        mode={mode}
        onModeChange={setMode}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onToggleRight={() => setMobileRightOpen(!mobileRightOpen)}
        onToggleBottom={() => setMobileBottomOpen(!mobileBottomOpen)}
        currentProject={workspaceState.currentProject}
        localShell={workspaceState.localShell}
        repository={workspaceState.repository}
        currentBranch={workspaceState.currentBranch}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div className="relative h-full w-56" onClick={(e) => e.stopPropagation()}>
              <AppSidebar activeSection={activeSection} onSectionChange={handleSectionChange} collapsed={false} onToggle={() => setMobileSidebarOpen(false)} workspaceState={workspaceState} isMobile />
            </div>
          </div>
        )}
        <div className="hidden md:flex">
          <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} workspaceState={workspaceState} />
        </div>
        <div className="flex flex-1 overflow-hidden min-w-0">
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <CenterPanel
              activeSection={activeSection}
              mode={mode}
              workspaceState={workspaceState}
              chatContexts={chatContexts}
              chatState={chatState}
              onConversationTypeChange={(conversation) => setConversationType(conversation as ChatTab)}
              onDraftChange={setDraft}
              onSendMessage={sendMessage}
              onApprovalResolve={clearApproval}
              onWorkflowApprovalResolve={approveWorkflowApproval}
              onGitAction={runGitAction}
              onRunBrowserScenario={runBrowserScenario}
              onRefreshLocalInference={refreshLocalInference}
              onProviderSourceChange={setProviderSource}
              onModelChange={setActiveModel}
              onDeploymentModeChange={setDeploymentMode}
              onRoutingProfileChange={setRoutingProfile}
              onAddLocalProject={addLocalProject}
              onCreateProject={createProject}
              onConnectRepository={connectRepository}
              onDisconnectRepository={disconnectRepository}
              onActiveProjectChange={setActiveProject}
            />
            <div className="hidden md:flex flex-col">
              <BottomPanel expanded={bottomExpanded} onToggle={() => setBottomExpanded(!bottomExpanded)} terminal={workspaceState.localShell.terminal} />
            </div>
          </div>
          <div className="hidden lg:flex">
            <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} workspaceState={workspaceState} />
          </div>
          {mobileRightOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileRightOpen(false)}>
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
              <div className="absolute right-0 top-0 bottom-0 w-72" onClick={(e) => e.stopPropagation()}>
                <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} workspaceState={workspaceState} isMobile onClose={() => setMobileRightOpen(false)} />
              </div>
            </div>
          )}
        </div>
      </div>
      {mobileBottomOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          <div className="bg-panel border-t border-border h-64">
            <BottomPanel expanded onToggle={() => setMobileBottomOpen(false)} terminal={workspaceState.localShell.terminal} />
          </div>
        </div>
      )}
    </div>
  );
}
