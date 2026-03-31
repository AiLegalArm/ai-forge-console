import { useState, type ReactNode } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  CheckCircle, XCircle, Clock, Waypoints, Check, FolderPlus, HardDriveDownload, PlugZap, GitBranchPlus, RefreshCw, ArrowRight, Radio,
} from "lucide-react";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;
import { useI18n } from "@/lib/i18n";
import type { ChatState, ChatMessage } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import type { AppRoutingModeProfile } from "@/types/local-inference";
import { Badge } from "@/components/ui/badge";
import { SmartActionChips } from "@/components/assistive/SmartActionChips";
import { getSmartActionSuggestions, type SmartActionId } from "@/lib/ai-native-suggestions";

const tabConfig: { id: ChatTab; labelKey: string; shortKey: string; icon: ReactNode }[] = [
  { id: "main", labelKey: "chat.main", shortKey: "chat.main.short", icon: <MessageSquare className="h-3 w-3" /> },
  { id: "agent", labelKey: "chat.agent", shortKey: "chat.agent.short", icon: <Bot className="h-3 w-3" /> },
  { id: "audit", labelKey: "chat.audit", shortKey: "chat.audit.short", icon: <Shield className="h-3 w-3" /> },
  { id: "review", labelKey: "chat.review", shortKey: "chat.review.short", icon: <GitPullRequest className="h-3 w-3" /> },
];

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-success shrink-0" />,
  streaming: <span className="live-dot shrink-0" aria-hidden />,
  pending: <Clock className="h-3 w-3 text-muted-foreground shrink-0" />,
  failed: <XCircle className="h-3 w-3 text-destructive shrink-0" />,
  needs_approval: <Clock className="h-3 w-3 text-warning shrink-0" />,
};

const liveStateTone: Record<string, string> = {
  idle: "text-muted-foreground",
  preparing: "text-info",
  streaming: "text-primary",
  waiting_for_tool: "text-warning",
  waiting_for_approval: "text-warning",
  blocked: "text-destructive",
  fallback_running: "text-warning",
  completed: "text-success",
  failed: "text-destructive",
};

interface ChatPanelProps {
  workspaceState: WorkspaceRuntimeState;
  chatState: ChatState;
  chatContexts: ChatContextMap;
  onConversationTypeChange: (conversation: ChatTab) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onSendMessage: (conversation: ChatTab) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve?: (approvalId: string) => void | Promise<void>;
  onProviderSourceChange: (source: "openrouter" | "ollama") => void;
  onModelChange: (model: string) => void;
  onDeploymentModeChange: (mode: "local" | "cloud" | "hybrid") => void;
  onRoutingProfileChange: (profile: AppRoutingModeProfile) => void;
  onAddLocalProject: (payload?: { name?: string; localPath?: string; projectRoot?: string }) => Promise<{ ok: boolean; message: string; path?: string }>;
  onCreateProject: (payload: { name: string; description?: string; projectType?: string }) => void;
  onConnectRepository: (payload: { pathOrUrl: string; name?: string; branch?: string }) => Promise<{ ok: boolean; code: string; message: string }>;
  onDisconnectRepository: () => void;
  onActiveProjectChange: (projectId: string) => void;
}

export function ChatPanel({ workspaceState, chatState, chatContexts, onConversationTypeChange, onDraftChange, onSendMessage, onApprovalResolve, onWorkflowApprovalResolve, onProviderSourceChange, onModelChange, onDeploymentModeChange, onRoutingProfileChange, onAddLocalProject, onCreateProject, onConnectRepository, onDisconnectRepository, onActiveProjectChange }: ChatPanelProps) {
  const { t } = useI18n();
  const [composerMode, setComposerMode] = useState<string>("execute");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [projectDescriptionInput, setProjectDescriptionInput] = useState("");
  const [projectTypeInput, setProjectTypeInput] = useState("web-app");
  const [projectPathInput, setProjectPathInput] = useState("");
  const [projectRootInput, setProjectRootInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [repoNameInput, setRepoNameInput] = useState("");
  const [repoBranchInput, setRepoBranchInput] = useState("main");
  const [providerSelection, setProviderSelection] = useState<"openrouter" | "ollama">(workspaceState.providerSource);
  const [lastOnboardingMessage, setLastOnboardingMessage] = useState("Choose an onboarding action to get started.");

  const activeTab = workspaceState.currentConversationType;
  const messages = chatContexts[activeTab];
  const sessionId = chatState.selectedSessionIdByType[activeTab];
  const activeSession = chatState.sessions.find((session) => session.id === sessionId);
  const activeDraft = chatState.draftInputBySessionId[sessionId] ?? "";
  const activeApproval = chatState.approvalRequestBySessionId[sessionId];
  const agentCommandRequests = workspaceState.workflow.agentCommandRequests.filter((request) => request.linkedChatId === sessionId).slice(0, 4);
  const placeholders = chatState.attachmentPlaceholdersBySessionId[sessionId] ?? [];
  const hasConnectedRepo = workspaceState.repository.connected;
  const hasProviderConnection = workspaceState.providerSource === "openrouter"
    ? workspaceState.localInference.cloud.status === "connected"
    : workspaceState.localInference.ollama.connectionHealthy;
  const hasMessages = messages.length > 0;
  const hasSentFirstMessage = Object.values(chatState.messagesBySessionId)
    .some((sessionMessages) => sessionMessages.some((message) => message.role === "user"));
  const hasConnectedProvider = workspaceState.providerSource.length > 0 && workspaceState.activeModel.length > 0;
  const hasConnectedRepository = workspaceState.repository.connected;
  const firstRunChecklist = [
    { id: "project", label: "Project ready", done: Boolean(workspaceState.activeProjectId) },
    { id: "repo", label: "Git connected", done: hasConnectedRepository },
    { id: "provider", label: "Provider selected", done: hasConnectedProvider },
    { id: "chat", label: "First message", done: hasSentFirstMessage },
    { id: "activity", label: "Activity stream", done: workspaceState.workflow.activityEvents.length > 0 },
    { id: "audit", label: "Audit state", done: Boolean(workspaceState.currentReviewId || workspaceState.releaseReadinessStatus) },
  ];
  const completedChecklistItems = firstRunChecklist.filter((step) => step.done).length;
  const onboardingComplete = completedChecklistItems === firstRunChecklist.length;
  const sendDisabled = !hasConnectedProvider;
  const auditSummary = {
    critical: workspaceState.auditors.findings.filter((finding) => finding.severity === "critical").length,
    high: workspaceState.auditors.findings.filter((finding) => finding.severity === "high").length,
    score: Math.max(0, 100 - (workspaceState.auditors.findings.filter((finding) => finding.blocking).length * 8)),
  };

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    user: { label: t("chat.you"), color: "text-primary" },
    orchestrator: { label: t("chat.orchestrator" as never), color: "text-accent" },
    agent: { label: t("chat.agent_label"), color: "text-accent" },
    system: { label: t("chat.system"), color: "text-muted-foreground" },
    auditor: { label: t("chat.auditor_label"), color: "text-warning" },
    reviewer: { label: t("chat.reviewer" as never), color: "text-info" },
  };
  const smartActions = getSmartActionSuggestions(workspaceState);

  const handleSmartAction = (actionId: SmartActionId) => {
    switch (actionId) {
      case "switch_to_local_mode":
        onDeploymentModeChange("local");
        return;
      case "reconnect_provider":
        onProviderSourceChange(workspaceState.providerSource === "ollama" ? "openrouter" : "ollama");
        return;
      case "switch_provider_fallback":
        onRoutingProfileChange("cheap_fast");
        return;
      case "open_review":
      case "open_diff_review":
        onConversationTypeChange("review");
        return;
      case "run_audit":
        onConversationTypeChange("audit");
        onDraftChange(sessionId, "/audit run current task");
        return;
      case "resume_last_task":
        onConversationTypeChange("main");
        onDraftChange(sessionId, `Resume task ${workspaceState.currentTask} from latest state.`);
        return;
      case "plan_subtasks":
        onConversationTypeChange("main");
        onDraftChange(sessionId, `Plan subtasks for ${workspaceState.currentTask}.`);
        return;
      case "retry_failed_run":
        onConversationTypeChange("agent");
        onDraftChange(sessionId, `Retry failed execution for ${workspaceState.currentTask} and summarize blockers.`);
        return;
      case "approve_push":
        if (workspaceState.pendingApprovals[0]) onWorkflowApprovalResolve?.(workspaceState.pendingApprovals[0].id);
        return;
      case "run_tests":
        onConversationTypeChange("agent");
        onDraftChange(sessionId, "Run tests and report failures only.");
        return;
      case "open_terminal_output":
        onConversationTypeChange("agent");
        onDraftChange(sessionId, "Inspect terminal output and propose recovery actions.");
        return;
      default:
        onConversationTypeChange("main");
        onDraftChange(sessionId, `${smartActions.find((action) => action.id === actionId)?.label}: proceed with operator-safe defaults.`);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border-subtle px-2.5 py-1.5 bg-background">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-primary">
          <Waypoints className="h-3 w-3" />
          <span>{activeSession?.title ?? t("chat.command_surface" as never)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:inline font-mono">
            {workspaceState.routingMode.replace(/_/g, " ")} · {activeSession?.providerMeta.provider}
          </span>
          <Badge variant="outline" size="sm">state: {workspaceState.providerExecutionState}</Badge>
        </div>
      </div>

      {/* Config bar */}
      <div className="border-b border-border-subtle px-2.5 py-2 space-y-1.5 bg-card">
        <div className="border border-border-subtle p-2">
          <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Setup</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 text-[11px]">
            <div className="border border-border-subtle rounded px-2 py-1.5">
              <div className="text-muted-foreground">1. Project</div>
              <div className="text-foreground font-medium truncate">{workspaceState.currentProject}</div>
            </div>
            <div className={`border rounded px-2 py-1.5 ${hasConnectedRepo ? "border-success/30" : "border-warning/30"}`}>
              <div className="text-muted-foreground">2. Repository</div>
              <div className={`font-medium ${hasConnectedRepo ? "text-success" : "text-warning"}`}>{hasConnectedRepo ? "Connected" : "Required"}</div>
            </div>
            <div className={`border rounded px-2 py-1.5 ${hasProviderConnection ? "border-success/30" : "border-warning/30"}`}>
              <div className="text-muted-foreground">3. Provider</div>
              <div className={`font-medium ${hasProviderConnection ? "text-success" : "text-warning"}`}>{hasProviderConnection ? "Ready" : "Required"}</div>
            </div>
            <div className="border border-primary/30 rounded px-2 py-1.5">
              <div className="text-muted-foreground">4. Start</div>
              <div className="text-primary font-medium">Ask for a plan or task</div>
            </div>
          </div>
        </div>
        <SmartActionChips title="Contextual assists" suggestions={smartActions} onAction={handleSmartAction} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[10px] font-mono">
          <label className="space-y-1">
            <span className="text-muted-foreground">Provider</span>
            <select value={workspaceState.providerSource} onChange={(e) => onProviderSourceChange(e.target.value as "openrouter" | "ollama")} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Model</span>
            <select value={workspaceState.activeModel} onChange={(e) => onModelChange(e.target.value)} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
              {workspaceState.availableModels.map((model) => (
                <option key={model.id} value={model.id}>{model.displayName}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Routing</span>
            <select value={workspaceState.routingProfile} onChange={(e) => onRoutingProfileChange(e.target.value as AppRoutingModeProfile)} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
              <option value="cheap_fast">cheap_fast</option>
              <option value="balanced">balanced</option>
              <option value="quality_first">quality_first</option>
              <option value="privacy_first">privacy_first</option>
              <option value="local_only">local_only</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Mode</span>
            <select value={workspaceState.deploymentMode} onChange={(e) => onDeploymentModeChange(e.target.value as "local" | "cloud" | "hybrid")} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
              <option value="cloud">cloud</option>
              <option value="local">local</option>
              <option value="hybrid">hybrid</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
          <Badge variant="default" size="sm">{workspaceState.activeProvider} / {workspaceState.activeModel}</Badge>
          <Badge variant="outline" size="sm">last: {workspaceState.lastUsedModel}</Badge>
          <Badge variant="outline" size="sm">{workspaceState.currentProject}</Badge>
          {workspaceState.currentTask && <Badge variant="outline" size="sm">{workspaceState.currentTask}</Badge>}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["cheap_fast", "balanced", "quality_first", "privacy_first", "local_only"] as AppRoutingModeProfile[]).map((profile) => (
            <button
              key={profile}
              onClick={() => onRoutingProfileChange(profile)}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                workspaceState.routingProfile === profile ? "border-primary/40 bg-primary/10 text-primary" : "border-border-subtle text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {profile}
            </button>
          ))}
        </div>
      </div>

      {/* Chat tabs — underline style */}
      <div className="flex items-center border-b border-border shrink-0 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onConversationTypeChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono transition-colors border-b-2 shrink-0 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(tab.labelKey as never)}</span>
            <span className="sm:hidden">{t(tab.shortKey as never)}</span>
          </button>
        ))}
      </div>

      {/* Messages — compact rows, no bubbles */}
      <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0 bg-background">
        {/* Onboarding checklist */}
        <div className="border border-border-subtle p-2 space-y-2 mb-2">
          <div className={`border rounded p-2 space-y-1.5 ${onboardingComplete ? "border-success/30" : "border-border-subtle"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">First-run</span>
              <span className="text-[10px] font-mono text-muted-foreground">{completedChecklistItems}/{firstRunChecklist.length}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-[10px] font-mono">
              {firstRunChecklist.map((step) => (
                <div key={step.id} className="flex items-center gap-1">
                  {step.done ? <CheckCircle className="h-3 w-3 text-success" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                  <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground inline-flex items-center gap-1 font-mono" onClick={() => {
              onCreateProject({ name: projectNameInput || "New Project", description: projectDescriptionInput, projectType: projectTypeInput });
              setLastOnboardingMessage(`Created project "${projectNameInput || "New Project"}".`);
            }}><FolderPlus className="h-3 w-3" />Create</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border-subtle text-muted-foreground hover:text-foreground hover:bg-surface-hover inline-flex items-center gap-1 font-mono transition-colors" onClick={() => {
              void (async () => {
                const result = await onAddLocalProject({
                  name: projectNameInput || "Local Project",
                  localPath: projectPathInput || undefined,
                  projectRoot: projectRootInput || projectPathInput || undefined,
                });
                setLastOnboardingMessage(result.message);
                if (result.ok && result.path) setProjectPathInput(result.path);
              })();
            }}><HardDriveDownload className="h-3 w-3" />Add Local</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border-subtle text-muted-foreground hover:text-foreground hover:bg-surface-hover inline-flex items-center gap-1 font-mono transition-colors" onClick={() => {
              void (async () => {
                const result = await onConnectRepository({ pathOrUrl: repoInput, name: repoNameInput || undefined, branch: repoBranchInput || undefined });
                setLastOnboardingMessage(result.message);
              })();
            }}><GitBranchPlus className="h-3 w-3" />Connect Git</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border-subtle text-muted-foreground hover:text-foreground hover:bg-surface-hover inline-flex items-center gap-1 font-mono transition-colors" onClick={() => {
              onProviderSourceChange(providerSelection);
              setLastOnboardingMessage(`Provider connected: ${providerSelection}.`);
            }}><PlugZap className="h-3 w-3" />Provider</button>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{lastOnboardingMessage}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
            <input value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)} placeholder="Project name" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={projectDescriptionInput} onChange={(e) => setProjectDescriptionInput(e.target.value)} placeholder="Description" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={projectTypeInput} onChange={(e) => setProjectTypeInput(e.target.value)} placeholder="Type" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={projectPathInput} onChange={(e) => setProjectPathInput(e.target.value)} placeholder="/workspace/project" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={projectRootInput} onChange={(e) => setProjectRootInput(e.target.value)} placeholder="Project root" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <select value={providerSelection} onChange={(e) => setProviderSelection(e.target.value as "openrouter" | "ollama")} className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
            <input value={repoNameInput} onChange={(e) => setRepoNameInput(e.target.value)} placeholder="Repo name" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="Repo URL / path" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
            <input value={repoBranchInput} onChange={(e) => setRepoBranchInput(e.target.value)} placeholder="Branch" className="border border-border-subtle rounded bg-input px-2 py-1 text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="border border-border-subtle p-2 text-[10px] font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active context</span>
              <span className="text-primary">{workspaceState.currentProject}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {workspaceState.projects.map((project) => (
                <button key={project.id} onClick={() => onActiveProjectChange(project.id)} className={`px-2 py-1 rounded border transition-colors ${workspaceState.activeProjectId === project.id ? "border-primary/40 text-primary" : "border-border-subtle text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
                  {project.name} · {project.source}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={workspaceState.repository.connected ? "success" : "neutral"} size="sm">
                Repo {workspaceState.repository.connected ? "connected" : "disconnected"}
              </Badge>
              <Badge variant="outline" size="sm"><GitBranchPlus className="h-3 w-3 mr-0.5" />{workspaceState.repository.branch ?? "no-branch"}</Badge>
              <Badge variant="outline" size="sm"><RefreshCw className="h-3 w-3 mr-0.5" />{workspaceState.repository.syncStatus ?? "idle"}</Badge>
            </div>
            <div className="border border-border-subtle p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Context</span>
                <span className="text-primary uppercase">{workspaceState.currentConversationType}</span>
              </div>
              <p className="text-muted-foreground">{(
                workspaceState.currentConversationType === "main"
                  ? workspaceState.contextPackets.mainChat
                  : workspaceState.currentConversationType === "agent"
                    ? workspaceState.contextPackets.agentChat
                    : workspaceState.currentConversationType === "audit"
                      ? workspaceState.contextPackets.auditChat
                      : workspaceState.contextPackets.reviewChat
              ).summary}</p>
            </div>
            {workspaceState.repository.connected ? (
              <div className="border border-success/20 rounded p-2 space-y-1">
                <div className="text-success text-[10px]">Sync status</div>
                <div className="text-muted-foreground">{workspaceState.repository.name} · {workspaceState.repository.url} · {workspaceState.repository.clean ? "clean" : "dirty"}</div>
                <button onClick={onDisconnectRepository} className="text-destructive text-[10px] hover:underline">Disconnect</button>
              </div>
            ) : null}
            {!workspaceState.repository.connected ? (
              <div className="border border-warning/30 rounded p-2 text-warning text-[10px]">
                Connect a repository to unlock commit, review, and deploy.
              </div>
            ) : null}
          </div>
        </div>

        {activeTab === "main" && <OrchestratorSummary currentTask={workspaceState.currentTask} />}
        {activeTab === "audit" && (
          <div className="border border-warning/30 rounded p-2 text-[10px] font-mono text-warning">
            {t("chat.audit_findings" as never)} {auditSummary.critical} {t("chat.critical" as never)} · {auditSummary.high} {t("chat.high" as never)} · {t("chat.score" as never)} {auditSummary.score}
          </div>
        )}
        {activeTab === "review" && (
          <div className="border border-info/30 rounded p-2 text-[10px] font-mono text-info">
            {t("chat.review_evidence" as never)} {workspaceState.evidenceFlow.linkedByReviewId["pr-rbac-42"]?.length ?? 0} {t("chat.linked_items" as never)} ·
            {t("chat.blockers" as never)} {workspaceState.evidenceFlow.releaseReadinessBlockers.length}
          </div>
        )}

        {activeApproval && (
          <div className="border border-warning/30 rounded p-2 text-[10px] font-mono">
            <p className="text-warning">{t("chat.approval_requested" as never)} {activeApproval.title}</p>
            <p className="text-muted-foreground mt-1">{activeApproval.description}</p>
            <button onClick={() => onApprovalResolve(sessionId)} className="mt-1.5 inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground">
              <Check className="h-3 w-3" /> {t("chat.mark_approved" as never)}
            </button>
          </div>
        )}

        {workspaceState.pendingApprovals.length > 0 && (
          <div className="border border-warning/30 rounded p-2 text-[10px] font-mono space-y-1">
            <p className="text-warning">{t("chat.workflow_approvals" as never)}</p>
            {workspaceState.pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate">{approval.title}</span>
                <button onClick={() => onWorkflowApprovalResolve?.(approval.id)} className="text-[10px] rounded bg-primary px-1.5 py-0.5 text-primary-foreground">
                  {t("chat.approve" as never)}
                </button>
              </div>
            ))}
          </div>
        )}

        {agentCommandRequests.length > 0 && (
          <div className="border border-primary/30 rounded p-2 text-[10px] font-mono space-y-1.5">
            <p className="text-primary">Agent commands</p>
            {agentCommandRequests.map((request) => (
              <div key={request.id} className="border border-border-subtle rounded p-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground truncate">{request.rawCommand}</span>
                  <span className="text-muted-foreground">{request.origin.replace(/_/g, " ")}</span>
                </div>
                <p className="text-muted-foreground">{request.reason}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{request.safetyLevel} · {request.executionState} · {request.resultState}</span>
                  {request.linkedApprovalId ? (
                    <button onClick={() => onWorkflowApprovalResolve?.(request.linkedApprovalId!)} className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">
                      {t("chat.approve" as never)}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message list — compact rows, role labels, no bubbles */}
        {!hasMessages ? (
          <div className="border border-dashed border-border-subtle rounded p-3 space-y-1">
            <p className="text-xs font-medium text-foreground">No conversation yet</p>
            <p className="text-[10px] text-muted-foreground">Describe what you want to build, then track task, agent, audit, and release state.</p>
            <p className="text-[10px] font-mono text-muted-foreground">Tip: "Plan the next task for {workspaceState.currentProject}"</p>
          </div>
        ) : null}

        {messages.map((msg: ChatMessage, idx: number) => (
          <div
            key={`${msg.id}-${idx}`}
            className="py-2 border-b border-border-subtle/80 last:border-0"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabelMap[msg.role]?.color ?? "text-muted-foreground"}`}>
                {msg.authorLabel || roleLabelMap[msg.role]?.label || msg.role}
              </span>
              {msg.status === "streaming" && (
                <span className="text-[10px] text-primary font-mono">{t("chat.streaming" as never)}</span>
              )}
              <span className="text-[10px] text-muted-foreground font-mono">{msg.providerMeta?.provider ?? activeSession?.providerMeta.provider ?? workspaceState.providerSource}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{msg.providerMeta?.model ?? activeSession?.providerMeta.model ?? workspaceState.activeModel}</span>
              <span className="text-[10px] text-muted-foreground ml-auto font-mono tabular-nums">{formatTime(msg.createdAtIso)}</span>
            </div>
            {msg.status === "streaming" ? (
              <StreamingText text={msg.content} />
            ) : (
              <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
            {msg.linked?.taskTitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{t("chat.task" as never)} {msg.linked.taskTitle}</p>
            )}
            {msg.linked?.evidenceIds?.length ? (
              <p className="text-[10px] text-info mt-0.5 font-mono">{t("chat.evidence" as never)} ↔ {msg.linked.evidenceIds.join(", ")}</p>
            ) : null}
          </div>
        ))}

      </div>

      {/* Composer */}
      <div className="border-t border-border-subtle p-2 shrink-0 space-y-1.5 relative bg-card">
        <div className="flex items-center gap-1 px-1 flex-wrap">
          {[
            { key: "plan", label: t("plan") },
            { key: "execute", label: t("chat.execute") },
            { key: "audit", label: t("audit") },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setComposerMode(m.key)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                composerMode === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-colors">
            <Eye className="h-2.5 w-2.5" /> {t("chat.local")}
          </button>
          <button className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-colors">
            <Cpu className="h-2.5 w-2.5" /> <span className="hidden sm:inline">{workspaceState.activeBackend}</span>
          </button>
        </div>

        {placeholders.length > 0 && (
          <div className="px-1 text-[10px] font-mono text-muted-foreground">
            {t("chat.attachments" as never)} {placeholders.map((item) => item.name).join(", ")}
          </div>
        )}

        <div className="flex items-end gap-1">
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => setShowSlashMenu(!showSlashMenu)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-surface-hover rounded transition-colors" title="Slash commands">
              <Slash className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-surface-hover rounded transition-colors hidden sm:block" title="@agent">
              <AtSign className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              rows={1}
              value={activeDraft}
              onChange={(event) => onDraftChange(sessionId, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSendMessage(activeTab);
                }
              }}
              placeholder={t("chat.placeholder")}
              disabled={sendDisabled}
              className="w-full bg-input border border-border-subtle rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none font-mono transition-colors"
            />
          </div>
          <button
            onClick={() => onSendMessage(activeTab)}
            disabled={sendDisabled}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {sendDisabled && (
          <p className="text-[10px] font-mono text-warning px-1">Connect a provider/model above before sending.</p>
        )}

        {showSlashMenu && (
          <div className="absolute bottom-full left-2 mb-1 bg-popover border border-border-subtle rounded p-1 min-w-[200px] z-50">
            {[
              { cmd: "/build", descKey: "slash.build" },
              { cmd: "/plan", descKey: "slash.plan" },
              { cmd: "/audit", descKey: "slash.audit" },
              { cmd: "/deploy", descKey: "slash.deploy" },
              { cmd: "/test", descKey: "slash.test" },
              { cmd: "/rollback", descKey: "slash.rollback" },
              { cmd: "/agent", descKey: "slash.agent" },
              { cmd: "/snapshot", descKey: "slash.snapshot" },
            ].map((item) => (
              <button
                key={item.cmd}
                onClick={() => setShowSlashMenu(false)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] hover:bg-surface-hover rounded transition-colors"
              >
                <span className="font-mono text-primary">{item.cmd}</span>
                <span className="text-muted-foreground">{t(item.descKey as never)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  const [visibleLen, setVisibleLen] = useState(0);
  useState(() => {
    setVisibleLen(0);
  });
  useState(() => {
    if (visibleLen < text.length) {
      const timer = setTimeout(() => setVisibleLen((v) => Math.min(v + 2, text.length)), 18);
      return () => clearTimeout(timer);
    }
  });
  // Simple approach: just show full text with a cursor if streaming
  return (
    <p className="text-[12px] text-foreground leading-normal whitespace-pre-wrap">
      {text}
      <span className="inline-block w-1 h-3.5 bg-primary animate-pulse ml-0.5" />
    </p>
  );
}

function TraceInlineStatus({ traceId, workspaceState }: { traceId: string; workspaceState: WorkspaceRuntimeState }) {
  const trace = workspaceState.workflow.executionTraces.find((item) => item.traceId === traceId);
  if (!trace) return null;
  return (
    <span className="text-[10px] font-mono text-muted-foreground">
      trace:{trace.traceId} · {trace.status}
    </span>
  );
}

function TypingIndicator({ agents }: { agents: string[] }) {
  if (agents.length === 0) return null;
  return (
    <div className="flex items-center gap-2 py-1.5 animate-fade-in">
      <div className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{agents.join(", ")} typing…</span>
    </div>
  );
}

function OrchestratorSummary({ currentTask }: { currentTask: string }) {
  const { t } = useI18n();
  return (
    <div className="border border-primary/20 rounded p-2 mb-1">
      <p className="text-[10px] uppercase tracking-wider font-mono text-primary mb-0.5">{t("chat.main_workflow" as never)}</p>
      <p className="text-sm text-foreground">
        command → orchestrator → approvals → agent execution → audit/review → deploy
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{t("chat.task" as never)} {currentTask}</p>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
