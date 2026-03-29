import { useState, useEffect, type ReactNode } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  Loader2, CheckCircle, XCircle, Clock, Waypoints, Check, FolderPlus, HardDriveDownload, PlugZap, GitBranchPlus, RefreshCw,
} from "lucide-react";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;
import { useI18n } from "@/lib/i18n";
import type { ChatState, ChatMessage } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import { auditSummary } from "@/data/mock-audits";
import type { AppRoutingModeProfile } from "@/types/local-inference";

const tabConfig: { id: ChatTab; labelKey: string; shortKey: string; icon: ReactNode }[] = [
  { id: "main", labelKey: "chat.main", shortKey: "chat.main.short", icon: <MessageSquare className="h-3 w-3" /> },
  { id: "agent", labelKey: "chat.agent", shortKey: "chat.agent.short", icon: <Bot className="h-3 w-3" /> },
  { id: "audit", labelKey: "chat.audit", shortKey: "chat.audit.short", icon: <Shield className="h-3 w-3" /> },
  { id: "review", labelKey: "chat.review", shortKey: "chat.review.short", icon: <GitPullRequest className="h-3 w-3" /> },
];

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-success shrink-0" />,
  streaming: <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground shrink-0" />,
  failed: <XCircle className="h-3 w-3 text-destructive shrink-0" />,
  needs_approval: <Clock className="h-3 w-3 text-warning shrink-0" />,
};

const roleStyles: Record<string, string> = {
  user: "bg-primary/10 border-primary/20 ml-4 sm:ml-8",
  orchestrator: "bg-surface border-border mr-4 sm:mr-8",
  agent: "bg-surface border-border mr-4 sm:mr-8",
  system: "bg-muted/50 border-border mx-2 sm:mx-4 text-center",
  auditor: "bg-warning/5 border-warning/20 mr-4 sm:mr-8",
  reviewer: "bg-info/5 border-info/20 mr-4 sm:mr-8",
};

interface ChatPanelProps {
  workspaceState: WorkspaceRuntimeState;
  chatState: ChatState;
  chatContexts: ChatContextMap;
  onConversationTypeChange: (conversation: ChatTab) => void;
  onDraftChange: (sessionId: string, value: string) => void;
  onSendMessage: (conversation: ChatTab) => void;
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve?: (approvalId: string) => void;
  onProviderSourceChange: (source: "openrouter" | "ollama") => void;
  onModelChange: (model: string) => void;
  onDeploymentModeChange: (mode: "local" | "cloud" | "hybrid") => void;
  onRoutingProfileChange: (profile: AppRoutingModeProfile) => void;
  onAddLocalProject: (payload: { name: string; localPath: string; projectRoot?: string }) => void;
  onCreateProject: (payload: { name: string; description?: string; projectType?: string }) => void;
  onConnectRepository: (payload: { name: string; url: string; branch: string }) => void;
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
  const placeholders = chatState.attachmentPlaceholdersBySessionId[sessionId] ?? [];

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    user: { label: t("chat.you"), color: "text-primary" },
    orchestrator: { label: t("chat.orchestrator" as never), color: "text-accent" },
    agent: { label: t("chat.agent_label"), color: "text-accent" },
    system: { label: t("chat.system"), color: "text-muted-foreground" },
    auditor: { label: t("chat.auditor_label"), color: "text-warning" },
    reviewer: { label: t("chat.reviewer" as never), color: "text-info" },
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between border-b border-border bg-card px-2 py-1">
        <div className="flex items-center gap-1 text-[10px] font-mono text-primary">
          <Waypoints className="h-3 w-3" />
          <span>{activeSession?.title ?? t("chat.command_surface" as never)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {workspaceState.routingMode.replace(/_/g, " ")} • {activeSession?.providerMeta.provider}
          </span>
          <span className="text-[10px] font-mono rounded border border-border px-1.5 py-0.5 text-muted-foreground">
            exec: {workspaceState.providerExecutionState}
          </span>
        </div>
      </div>

      <div className="border-b border-border bg-card px-2 py-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
          <label className="space-y-1">
            <span className="text-muted-foreground">Provider</span>
            <select value={workspaceState.providerSource} onChange={(e) => onProviderSourceChange(e.target.value as "openrouter" | "ollama")} className="w-full border border-border rounded bg-background px-2 py-1">
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Model</span>
            <select value={workspaceState.activeModel} onChange={(e) => onModelChange(e.target.value)} className="w-full border border-border rounded bg-background px-2 py-1">
              {workspaceState.availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Routing</span>
            <select value={workspaceState.routingProfile} onChange={(e) => onRoutingProfileChange(e.target.value as AppRoutingModeProfile)} className="w-full border border-border rounded bg-background px-2 py-1">
              <option value="cheap_fast">cheap_fast</option>
              <option value="balanced">balanced</option>
              <option value="quality_first">quality_first</option>
              <option value="privacy_first">privacy_first</option>
              <option value="local_only">local_only</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Mode</span>
            <select value={workspaceState.deploymentMode} onChange={(e) => onDeploymentModeChange(e.target.value as "local" | "cloud" | "hybrid")} className="w-full border border-border rounded bg-background px-2 py-1">
              <option value="cloud">cloud</option>
              <option value="local">local</option>
              <option value="hybrid">hybrid</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span className="rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5">
            Active {workspaceState.activeProvider} / {workspaceState.activeModel}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            Last used {workspaceState.lastUsedModel}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5">
            Project {workspaceState.currentProject}
          </span>
          {workspaceState.currentTask ? (
            <span className="rounded-full border border-border px-2 py-0.5">
              Task {workspaceState.currentTask}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["cheap_fast", "balanced", "quality_first", "privacy_first", "local_only"] as AppRoutingModeProfile[]).map((profile) => (
            <button
              key={profile}
              onClick={() => onRoutingProfileChange(profile)}
              className={`px-2 py-1 rounded text-[10px] font-mono border ${
                workspaceState.routingProfile === profile ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {profile}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center border-b border-border bg-card shrink-0 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onConversationTypeChange(tab.id)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs font-mono transition-colors border-b-2 shrink-0 ${
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

      <div className="flex-1 overflow-auto p-2 sm:p-3 space-y-2 min-h-0">
        <div className="rounded-lg border border-border p-2 bg-card space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button className="px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground inline-flex items-center gap-1" onClick={() => {
              onCreateProject({ name: projectNameInput || "New Project", description: projectDescriptionInput, projectType: projectTypeInput });
              setLastOnboardingMessage(`Created project "${projectNameInput || "New Project"}".`);
            }}><FolderPlus className="h-3 w-3" />Create Project</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border inline-flex items-center gap-1" onClick={() => {
              onAddLocalProject({ name: projectNameInput || "Local Project", localPath: projectPathInput || "/workspace/my-local-project", projectRoot: projectRootInput || projectPathInput || "/workspace/my-local-project" });
              setLastOnboardingMessage(`Added local project "${projectNameInput || "Local Project"}".`);
            }}><HardDriveDownload className="h-3 w-3" />Add Local Project</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border inline-flex items-center gap-1" onClick={() => {
              const resolvedUrl = repoInput || "https://github.com/org/repo.git";
              const resolvedName = repoNameInput || resolvedUrl.split("/").pop()?.replace(".git", "") || "repo";
              onConnectRepository({ name: resolvedName, url: resolvedUrl, branch: repoBranchInput || "main" });
              setLastOnboardingMessage(`Connected repository "${resolvedName}" on ${repoBranchInput || "main"}.`);
            }}><GitBranchPlus className="h-3 w-3" />Connect Git Repository</button>
            <button className="px-2 py-1 text-[10px] rounded border border-border inline-flex items-center gap-1" onClick={() => {
              onProviderSourceChange(providerSelection);
              setLastOnboardingMessage(`Provider connected: ${providerSelection}.`);
            }}><PlugZap className="h-3 w-3" />Connect Provider</button>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">{lastOnboardingMessage}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <input value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)} placeholder="Project name" className="border border-border rounded bg-background px-2 py-1" />
            <input value={projectDescriptionInput} onChange={(e) => setProjectDescriptionInput(e.target.value)} placeholder="Short description" className="border border-border rounded bg-background px-2 py-1" />
            <input value={projectTypeInput} onChange={(e) => setProjectTypeInput(e.target.value)} placeholder="Project type / label (optional)" className="border border-border rounded bg-background px-2 py-1" />
            <input value={projectPathInput} onChange={(e) => setProjectPathInput(e.target.value)} placeholder="/workspace/my-local-project" className="border border-border rounded bg-background px-2 py-1" />
            <input value={projectRootInput} onChange={(e) => setProjectRootInput(e.target.value)} placeholder="Project root (placeholder)" className="border border-border rounded bg-background px-2 py-1" />
            <select value={providerSelection} onChange={(e) => setProviderSelection(e.target.value as "openrouter" | "ollama")} className="border border-border rounded bg-background px-2 py-1">
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
            <input value={repoNameInput} onChange={(e) => setRepoNameInput(e.target.value)} placeholder="Repository name" className="border border-border rounded bg-background px-2 py-1" />
            <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="Repository URL / path" className="border border-border rounded bg-background px-2 py-1" />
            <input value={repoBranchInput} onChange={(e) => setRepoBranchInput(e.target.value)} placeholder="Branch" className="border border-border rounded bg-background px-2 py-1" />
          </div>
          <div className="rounded border border-border/70 p-2 text-[10px] font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active project context</span>
              <span className="text-primary">{workspaceState.currentProject}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {workspaceState.projects.map((project) => (
                <button key={project.id} onClick={() => onActiveProjectChange(project.id)} className={`px-2 py-1 rounded border ${workspaceState.activeProjectId === project.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {project.name} • {project.source} • {project.projectType ?? "general"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2 py-0.5 border ${workspaceState.repository.connected ? "border-success text-success" : "border-border text-muted-foreground"}`}>
                Repo {workspaceState.repository.connected ? "connected" : "disconnected"}
              </span>
              <span className="rounded-full px-2 py-0.5 border border-border text-muted-foreground inline-flex items-center gap-1"><GitBranchPlus className="h-3 w-3" />{workspaceState.repository.branch ?? "no-branch"}</span>
              <span className="rounded-full px-2 py-0.5 border border-border text-muted-foreground inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />{workspaceState.repository.syncStatus ?? "idle"}</span>
            </div>
            {workspaceState.repository.connected ? (
              <div className="rounded border border-primary/20 bg-primary/5 p-2 space-y-1">
                <div className="text-primary">Sync status card</div>
                <div className="text-muted-foreground">{workspaceState.repository.name} • {workspaceState.repository.url}</div>
                <button onClick={onDisconnectRepository} className="text-destructive underline">Disconnect repository</button>
              </div>
            ) : null}
          </div>
        </div>

        {activeTab === "main" && (
          <OrchestratorSummary currentTask={workspaceState.currentTask} />
        )}

        {activeTab === "audit" && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono text-warning">
            {t("chat.audit_findings" as never)} {auditSummary.critical} {t("chat.critical" as never)} • {auditSummary.high} {t("chat.high" as never)} • {t("chat.score" as never)} {auditSummary.score}
          </div>
        )}
        {activeTab === "review" && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-2 text-xs font-mono text-info">
            {t("chat.review_evidence" as never)} {workspaceState.evidenceFlow.linkedByReviewId["pr-rbac-42"]?.length ?? 0} {t("chat.linked_items" as never)} •
            {t("chat.blockers" as never)} {workspaceState.evidenceFlow.releaseReadinessBlockers.length}
          </div>
        )}

        {activeApproval && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono">
            <p className="text-warning">{t("chat.approval_requested" as never)} {activeApproval.title}</p>
            <p className="text-muted-foreground mt-1">{activeApproval.description}</p>
            <button
              onClick={() => onApprovalResolve(sessionId)}
              className="mt-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground"
            >
              <Check className="h-3 w-3" /> {t("chat.mark_approved" as never)}
            </button>
          </div>
        )}


        {workspaceState.pendingApprovals.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono space-y-1">
            <p className="text-warning">{t("chat.workflow_approvals" as never)}</p>
            {workspaceState.pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate">{approval.title}</span>
                <button
                  onClick={() => onWorkflowApprovalResolve?.(approval.id)}
                  className="text-[10px] rounded bg-primary px-1.5 py-0.5 text-primary-foreground"
                >
                  {t("chat.approve" as never)}
                </button>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg: ChatMessage, idx: number) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-2 sm:p-2.5 ${roleStyles[msg.role]} animate-fade-in`}
            style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabelMap[msg.role].color}`}>
                {msg.authorLabel || roleLabelMap[msg.role].label}
              </span>
              {msg.status === "streaming" && (
                <span className="text-[9px] text-primary font-mono animate-pulse">{t("chat.streaming" as never)}</span>
              )}
              <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(msg.createdAtIso)}</span>
            </div>
            {msg.status === "streaming" ? (
              <StreamingText text={msg.content} />
            ) : (
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
            {msg.linked?.taskTitle && (
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t("chat.task" as never)} {msg.linked.taskTitle}</p>
            )}
            {msg.linked?.evidenceIds?.length ? (
              <p className="text-[10px] text-info mt-1 font-mono">{t("chat.evidence" as never)} ↔ {msg.linked.evidenceIds.join(", ")}</p>
            ) : null}
          </div>
        ))}

        <TypingIndicator agents={messages.filter(m => m.status === "streaming").map(m => m.authorLabel || roleLabelMap[m.role]?.label || "")} />
      </div>

      <div className="border-t border-border bg-card p-2 shrink-0 space-y-1.5 relative">
        <div className="flex items-center gap-0.5 sm:gap-1 px-1 flex-wrap">
          {[
            { key: "plan", label: t("plan") },
            { key: "execute", label: t("chat.execute") },
            { key: "audit", label: t("audit") },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setComposerMode(m.key)}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                composerMode === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded">
            <Eye className="h-2.5 w-2.5" /> {t("chat.local")}
          </button>
          <button className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded">
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
            <button className="p-1.5 text-muted-foreground hover:text-accent hover:bg-surface-hover rounded transition-colors hidden sm:block" title="@agent">
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
              className="w-full bg-input border border-border rounded-lg px-2 sm:px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
            />
          </div>
          <button onClick={() => onSendMessage(activeTab)} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shrink-0">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        {showSlashMenu && (
          <div className="absolute bottom-full left-2 mb-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[180px] sm:min-w-[200px] z-50">
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
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-surface-hover rounded transition-colors"
              >
                <span className="font-mono text-primary">{item.cmd}</span>
                <span className="text-muted-foreground text-[10px] sm:text-xs">{t(item.descKey as never)}</span>
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
  useEffect(() => {
    setVisibleLen(0);
    const id = setInterval(() => {
      setVisibleLen((prev) => {
        if (prev >= text.length) { clearInterval(id); return prev; }
        return Math.min(prev + 2, text.length);
      });
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
      {text.slice(0, visibleLen)}
      {visibleLen < text.length && <span className="inline-block w-1.5 h-3 bg-primary animate-pulse ml-0.5 rounded-sm" />}
    </p>
  );
}

function TypingIndicator({ agents }: { agents: string[] }) {
  if (agents.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 animate-fade-in">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">
        {agents.join(", ")} typing…
      </span>
    </div>
  );
}

function OrchestratorSummary({ currentTask }: { currentTask: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 sm:p-2.5">
      <p className="text-[10px] uppercase tracking-wider font-mono text-primary mb-1">{t("chat.main_workflow" as never)}</p>
      <p className="text-xs text-foreground">
        command → orchestrator plan → approvals → agent execution stream → audit/review summary → code/deploy
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t("chat.task" as never)} {currentTask}</p>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
