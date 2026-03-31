import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatWorkspaceState } from "@/hooks/use-chat-workspace-state";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CenterPanel } from "@/components/layout/CenterPanel";
import { RightPanel } from "@/components/layout/RightPanel";
import { BottomPanel } from "@/components/layout/BottomPanel";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalCommandPalette, type KeyboardCommand } from "@/components/layout/GlobalCommandPalette";
import { toast } from "@/hooks/use-toast";
import { Bot, CheckCheck, CheckCircle2, Compass, FolderOpen, Gauge, Layers, PlayCircle, RefreshCcw, Rocket, Settings, Square, XCircle } from "lucide-react";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;

export type NavSection =
  | "workspace" | "projects" | "files" | "git" | "prompt-studio" | "prompt-library"
  | "agents" | "providers" | "audits" | "supabase-import" | "deploy"
  | "domains" | "design" | "browser" | "release" | "settings";

export type AppMode = "operator" | "plan" | "build" | "audit" | "release";

export default function AppLayout() {
  const [activeSection, setActiveSection] = useState<NavSection>("workspace");
  const [mode, setMode] = useState<AppMode>("build");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomExpanded, setBottomExpanded] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState("preview");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<"sidebar" | "main" | "right">("main");
  const [lastAgentTaskId, setLastAgentTaskId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [mobileBottomOpen, setMobileBottomOpen] = useState(false);
  const sidebarPanelRef = useRef<HTMLDivElement | null>(null);
  const mainPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

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
    runProjectCommand,
    runProjectCommandCategory,
    focusTask,
    launchTask,
    triggerDeploy,
    refreshDeployStatus,
  } = useChatWorkspaceState();

  const handleSectionChange = (s: NavSection) => {
    setActiveSection(s);
    setMobileSidebarOpen(false);
  };

  const activeTask = useMemo(
    () => workspaceState.workflow.tasks.find((task) => task.id === workspaceState.currentTask) ?? workspaceState.workflow.tasks[0],
    [workspaceState.currentTask, workspaceState.workflow.tasks],
  );
  const pendingApproval = workspaceState.pendingApprovals[0];
  const primaryProjectCommandId = workspaceState.projectCommandRegistry.primaryCommandIds[0] ?? workspaceState.projectCommandRegistry.commands[0]?.id;

  const executeTaskCommand = useCallback(async (taskId: string, modeLabel: string) => {
    await launchTask(taskId);
    setLastAgentTaskId(taskId);
    toast({ title: `${modeLabel} started`, description: `Task ${taskId} is now running.` });
  }, [launchTask]);

  const commands = useMemo<KeyboardCommand[]>(() => {
    const navCommands: KeyboardCommand[] = [
      { id: "nav.open-projects", label: "Open projects", category: "navigation", icon: FolderOpen, shortcut: "⌘P", keywords: ["switch project"], handler: () => handleSectionChange("projects") },
      { id: "nav.open-chat", label: "Open chat workspace", category: "navigation", icon: Compass, handler: () => handleSectionChange("workspace") },
      { id: "nav.open-tasks", label: "Open task graph", category: "navigation", icon: Layers, handler: () => handleSectionChange("workspace") },
      { id: "nav.open-release", label: "Open release panel", category: "navigation", icon: Rocket, handler: () => handleSectionChange("release") },
      { id: "nav.open-settings", label: "Open settings", category: "navigation", icon: Settings, handler: () => handleSectionChange("settings") },
    ];

    const taskCommands: KeyboardCommand[] = activeTask
      ? [
          { id: "task.create", label: "Create task (launch current)", category: "tasks", icon: PlayCircle, handler: () => executeTaskCommand(activeTask.id, "Task") },
          { id: "task.focus", label: `Focus task ${activeTask.id}`, category: "tasks", icon: Gauge, handler: () => focusTask(activeTask.id) },
          { id: "task.assign-agent", label: `Assign/Run agent for ${activeTask.id}`, category: "tasks", icon: Bot, handler: () => executeTaskCommand(activeTask.id, "Agent") },
          { id: "task.complete", label: `Mark ${activeTask.id} complete`, category: "tasks", icon: CheckCircle2, handler: () => toast({ title: "Task command queued", description: "Completion is handled by workflow execution state." }) },
          { id: "task.reopen", label: `Reopen ${activeTask.id}`, category: "tasks", icon: RefreshCcw, handler: () => toast({ title: "Task command queued", description: "Use workflow controls to reopen this task." }) },
        ]
      : [];

    const executionCommands: KeyboardCommand[] = [
      {
        id: "exec.run-command",
        label: "Run project command",
        category: "execution",
        icon: PlayCircle,
        shortcut: "⌘↵",
        handler: async () => {
          if (!primaryProjectCommandId) {
            toast({ title: "No command available", description: "Project command registry is empty." });
            return;
          }
          const result = await runProjectCommand(primaryProjectCommandId);
          toast({ title: result.ok ? "Command executed" : "Command failed", description: result.message });
        },
      },
      { id: "exec.retry-run", label: "Retry latest run", category: "execution", icon: RefreshCcw, shortcut: "R", handler: async () => { if (activeTask) await executeTaskCommand(activeTask.id, "Retry"); else toast({ title: "No active task to retry" }); } },
      { id: "exec.stop-run", label: "Stop run", category: "execution", icon: Square, shortcut: "S", handler: () => { toast({ title: "Stop requested", description: "The stop action was queued for active execution." }); } },
      { id: "exec.force-fallback", label: "Force fallback mode", category: "execution", icon: Gauge, handler: () => { setRoutingProfile("cheap_fast"); toast({ title: "Routing changed", description: "Fallback-leaning routing profile applied." }); } },
    ];

    const approvalCommands: KeyboardCommand[] = pendingApproval
      ? [
          { id: "approval.approve", label: `Approve ${pendingApproval.title}`, category: "approvals", icon: CheckCheck, shortcut: "A", handler: () => { void approveWorkflowApproval(pendingApproval.id); toast({ title: "Approval granted", description: pendingApproval.title }); } },
          { id: "approval.reject", label: `Reject ${pendingApproval.title}`, category: "approvals", icon: XCircle, shortcut: "X", handler: () => toast({ title: "Reject action", description: "Reject workflow is not wired in the current mock state." }) },
        ]
      : [];

    const releaseCommands: KeyboardCommand[] = [
      { id: "release.open", label: "Open release panel", category: "release", icon: Rocket, handler: () => handleSectionChange("release") },
      { id: "release.approve", label: "Approve release checks", category: "release", icon: CheckCheck, handler: () => pendingApproval ? void approveWorkflowApproval(pendingApproval.id) : toast({ title: "No pending approval" }) },
      { id: "release.trigger", label: "Trigger preview release", category: "release", icon: Rocket, handler: async () => { const result = await triggerDeploy("preview"); toast({ title: result.ok ? "Release triggered" : "Release blocked", description: result.message }); } },
    ];

    const systemCommands: KeyboardCommand[] = [
      { id: "sys.model", label: "Change model (toggle)", category: "system", icon: Settings, handler: () => setActiveModel(workspaceState.providerSource === "openrouter" ? "openai/gpt-4.1" : "qwen3-coder:14b") },
      { id: "sys.provider", label: "Change provider", category: "system", icon: Settings, handler: () => setProviderSource(workspaceState.providerSource === "openrouter" ? "ollama" : "openrouter") },
      { id: "sys.routing", label: "Change routing mode", category: "system", icon: Gauge, handler: () => setRoutingProfile(workspaceState.routingProfile === "balanced" ? "quality_max" : "balanced") },
      { id: "sys.deployment", label: "Toggle local/cloud", category: "system", icon: Settings, handler: () => setDeploymentMode(workspaceState.deploymentMode === "local" ? "cloud" : "local") },
    ];

    const agentCommands: KeyboardCommand[] = [
      { id: "agent.run", label: "Run agent on current task", category: "agents", icon: Bot, shortcut: "⌘⇧R", handler: async () => activeTask ? executeTaskCommand(activeTask.id, "Agent") : toast({ title: "No active task" }) },
      { id: "agent.rerun", label: "Re-run last agent", category: "agents", icon: RefreshCcw, handler: async () => lastAgentTaskId ? executeTaskCommand(lastAgentTaskId, "Agent rerun") : toast({ title: "No previous agent run" }) },
      { id: "agent.change", label: "Change agent (focus tasks)", category: "agents", icon: Bot, handler: () => handleSectionChange("agents") },
    ];

    return [...navCommands, ...taskCommands, ...agentCommands, ...executionCommands, ...approvalCommands, ...releaseCommands, ...systemCommands];
  }, [activeTask, approveWorkflowApproval, executeTaskCommand, focusTask, lastAgentTaskId, pendingApproval, primaryProjectCommandId, runProjectCommand, setActiveModel, setDeploymentMode, setProviderSource, setRoutingProfile, triggerDeploy, workspaceState.deploymentMode, workspaceState.providerSource, workspaceState.routingProfile]);

  useEffect(() => {
    const isEditableTarget = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    };

    const focusPanel = (panel: "sidebar" | "main" | "right") => {
      setFocusedPanel(panel);
      const map = { sidebar: sidebarPanelRef, main: mainPanelRef, right: rightPanelRef };
      map[panel].current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (commandPaletteOpen) return;
      if (isEditableTarget(event) && !(mod && event.key === "Enter")) return;

      if (mod && event.key === "Enter") {
        event.preventDefault();
        if (activeTask) void executeTaskCommand(activeTask.id, "Run");
        return;
      }
      if (mod && event.key === "/") {
        event.preventDefault();
        setRightPanelVisible((prev) => !prev);
        setBottomExpanded((prev) => !prev);
        return;
      }
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((prev) => !prev);
        return;
      }
      if (mod && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setBottomExpanded(true);
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (activeTask) void executeTaskCommand(activeTask.id, "Agent");
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleSectionChange("release");
        return;
      }
      if (mod && !event.shiftKey && event.key === "1") {
        event.preventDefault();
        focusPanel("sidebar");
        return;
      }
      if (mod && !event.shiftKey && event.key === "2") {
        event.preventDefault();
        focusPanel("main");
        return;
      }
      if (mod && !event.shiftKey && event.key === "3") {
        event.preventDefault();
        focusPanel("right");
        return;
      }

      if (event.key.toLowerCase() === "a" && pendingApproval) {
        event.preventDefault();
        void approveWorkflowApproval(pendingApproval.id);
        toast({ title: "Approval granted", description: pendingApproval.title });
      }
      if (event.key.toLowerCase() === "x" && pendingApproval) {
        event.preventDefault();
        toast({ title: "Reject action", description: "Reject workflow is not wired in the current mock state." });
      }
      if (event.key.toLowerCase() === "r" && activeTask) {
        event.preventDefault();
        void executeTaskCommand(activeTask.id, "Retry");
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        toast({ title: "Stop requested", description: "The stop action was queued for active execution." });
      }
      if (event.key === "Enter" && activeTask) {
        event.preventDefault();
        void executeTaskCommand(activeTask.id, "Run");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTask, approveWorkflowApproval, commandPaletteOpen, executeTaskCommand, pendingApproval]);

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
        <div
          ref={sidebarPanelRef}
          tabIndex={-1}
          className={`hidden md:flex outline-none ${focusedPanel === "sidebar" ? "ring-1 ring-primary/60" : ""}`}
          onFocus={() => setFocusedPanel("sidebar")}
        >
          <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} workspaceState={workspaceState} />
        </div>
        <div className="flex flex-1 overflow-hidden min-w-0">
          <div
            ref={mainPanelRef}
            tabIndex={-1}
            className={`flex flex-col flex-1 overflow-hidden min-w-0 outline-none ${focusedPanel === "main" ? "ring-1 ring-primary/60" : ""}`}
            onFocus={() => setFocusedPanel("main")}
          >
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
              onRunProjectCommand={runProjectCommand}
              onRunProjectCommandCategory={runProjectCommandCategory}
              onFocusTask={focusTask}
              onLaunchTask={launchTask}
              onTriggerDeploy={triggerDeploy}
              onRefreshDeployStatus={refreshDeployStatus}
            />
            <div className="hidden md:flex flex-col">
              {bottomExpanded ? (
                <BottomPanel
                  expanded={bottomExpanded}
                  onToggle={() => setBottomExpanded(!bottomExpanded)}
                  terminal={workspaceState.localShell.terminal}
                  traces={workspaceState.workflow.executionTraces}
                />
              ) : null}
            </div>
          </div>
          {rightPanelVisible ? (
            <div
              ref={rightPanelRef}
              tabIndex={-1}
              className={`hidden lg:flex outline-none ${focusedPanel === "right" ? "ring-1 ring-primary/60" : ""}`}
              onFocus={() => setFocusedPanel("right")}
            >
              <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} workspaceState={workspaceState} />
            </div>
          ) : null}
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
            <BottomPanel
              expanded
              onToggle={() => setMobileBottomOpen(false)}
              terminal={workspaceState.localShell.terminal}
              traces={workspaceState.workflow.executionTraces}
            />
          </div>
        </div>
      )}
      <GlobalCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} commands={commands} />
    </div>
  );
}
