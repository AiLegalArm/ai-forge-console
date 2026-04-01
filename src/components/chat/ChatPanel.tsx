import { useState, type ReactNode } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  CheckCircle, XCircle, Clock, Waypoints, Check,
} from "lucide-react";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;
import { useI18n } from "@/lib/i18n";
import type { ChatState, ChatMessage } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import type { AppRoutingModeProfile } from "@/types/local-inference";
import { Badge } from "@/ui";
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
  const [showConfig, setShowConfig] = useState(false);

  const activeTab = workspaceState.currentConversationType;
  const messages = chatContexts[activeTab];
  const sessionId = chatState.selectedSessionIdByType[activeTab];
  const activeSession = chatState.sessions.find((session) => session.id === sessionId);
  const activeDraft = chatState.draftInputBySessionId[sessionId] ?? "";
  const activeApproval = chatState.approvalRequestBySessionId[sessionId];
  const placeholders = chatState.attachmentPlaceholdersBySessionId[sessionId] ?? [];
  const hasProviderConnection = workspaceState.providerSource === "openrouter"
    ? workspaceState.localInference.cloud.status === "connected"
    : workspaceState.localInference.ollama.connectionHealthy;
  const hasMessages = messages.length > 0;
  const hasConnectedProvider = workspaceState.providerSource.length > 0 && workspaceState.activeModel.length > 0;
  const sendDisabled = !hasConnectedProvider;
  const auditSummary = {
    critical: workspaceState.auditors.findings.filter((f) => f.severity === "critical").length,
    high: workspaceState.auditors.findings.filter((f) => f.severity === "high").length,
    score: Math.max(0, 100 - (workspaceState.auditors.findings.filter((f) => f.blocking).length * 8)),
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
      case "switch_to_local_mode": onDeploymentModeChange("local"); return;
      case "reconnect_provider": onProviderSourceChange(workspaceState.providerSource === "ollama" ? "openrouter" : "ollama"); return;
      case "switch_provider_fallback": onRoutingProfileChange("cheap_fast"); return;
      case "open_review": case "open_diff_review": onConversationTypeChange("review"); return;
      case "run_audit": onConversationTypeChange("audit"); onDraftChange(sessionId, "/audit run current task"); return;
      case "resume_last_task": onConversationTypeChange("main"); onDraftChange(sessionId, `Resume task ${workspaceState.currentTask} from latest state.`); return;
      case "plan_subtasks": onConversationTypeChange("main"); onDraftChange(sessionId, `Plan subtasks for ${workspaceState.currentTask}.`); return;
      case "retry_failed_run": onConversationTypeChange("agent"); onDraftChange(sessionId, `Retry failed execution for ${workspaceState.currentTask} and summarize blockers.`); return;
      case "approve_push": if (workspaceState.pendingApprovals[0]) onWorkflowApprovalResolve?.(workspaceState.pendingApprovals[0].id); return;
      case "run_tests": onConversationTypeChange("agent"); onDraftChange(sessionId, "Run tests and report failures only."); return;
      case "open_terminal_output": onConversationTypeChange("agent"); onDraftChange(sessionId, "Inspect terminal output and propose recovery actions."); return;
      default: onConversationTypeChange("main"); onDraftChange(sessionId, `${smartActions.find((a) => a.id === actionId)?.label}: proceed with operator-safe defaults.`);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5 bg-card/30">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
          <Waypoints className="h-3 w-3" />
          <span className="uppercase tracking-wider">{activeSession?.title ?? "Command Surface"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfig ? "▾ config" : "▸ config"}
          </button>
          <Badge variant="neutral">{workspaceState.providerExecutionState}</Badge>
        </div>
      </div>

      {/* Collapsible config — hidden by default */}
      {showConfig && (
        <div className="border-b border-border-subtle px-3 py-2 bg-card/20 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
            <label className="space-y-0.5">
              <span className="text-muted-foreground">Provider</span>
              <select value={workspaceState.providerSource} onChange={(e) => onProviderSourceChange(e.target.value as "openrouter" | "ollama")} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama</option>
              </select>
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">Model</span>
              <select value={workspaceState.activeModel} onChange={(e) => onModelChange(e.target.value)} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
                {workspaceState.availableModels.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
              </select>
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">Routing</span>
              <select value={workspaceState.routingProfile} onChange={(e) => onRoutingProfileChange(e.target.value as AppRoutingModeProfile)} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
                <option value="cheap_fast">cheap_fast</option>
                <option value="balanced">balanced</option>
                <option value="quality_first">quality_first</option>
                <option value="privacy_first">privacy_first</option>
                <option value="local_only">local_only</option>
              </select>
            </label>
            <label className="space-y-0.5">
              <span className="text-muted-foreground">Mode</span>
              <select value={workspaceState.deploymentMode} onChange={(e) => onDeploymentModeChange(e.target.value as "local" | "cloud" | "hybrid")} className="w-full border border-border-subtle rounded bg-input px-2 py-1 text-foreground">
                <option value="cloud">cloud</option>
                <option value="local">local</option>
                <option value="hybrid">hybrid</option>
              </select>
            </label>
          </div>
          <SmartActionChips title="Contextual assists" suggestions={smartActions} onAction={handleSmartAction} />
        </div>
      )}

      {/* Chat tabs */}
      <div className="flex items-center border-b border-border-subtle shrink-0 bg-card/10">
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

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-2 space-y-0.5 min-h-0 bg-background">
        {activeTab === "main" && <OrchestratorSummary currentTask={workspaceState.currentTask} />}
        {activeTab === "audit" && (
          <div className="border border-warning/20 rounded px-2 py-1.5 text-[10px] font-mono text-warning mb-1">
            {t("chat.audit_findings" as never)} {auditSummary.critical} critical · {auditSummary.high} high · score {auditSummary.score}
          </div>
        )}
        {activeTab === "review" && (
          <div className="border border-info/20 rounded px-2 py-1.5 text-[10px] font-mono text-info mb-1">
            {t("chat.review_evidence" as never)} {workspaceState.evidenceFlow.linkedByReviewId["pr-rbac-42"]?.length ?? 0} linked ·
            blockers {workspaceState.evidenceFlow.releaseReadinessBlockers.length}
          </div>
        )}

        {activeApproval && (
          <div className="border border-warning/20 rounded px-2 py-1.5 text-[10px] font-mono mb-1">
            <p className="text-warning">{t("chat.approval_requested" as never)} {activeApproval.title}</p>
            <button onClick={() => onApprovalResolve(sessionId)} className="mt-1 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
              <Check className="h-3 w-3" /> {t("chat.mark_approved" as never)}
            </button>
          </div>
        )}

        {workspaceState.pendingApprovals.length > 0 && (
          <div className="border border-warning/20 rounded px-2 py-1.5 text-[10px] font-mono space-y-1 mb-1">
            {workspaceState.pendingApprovals.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate">{a.title}</span>
                <button onClick={() => onWorkflowApprovalResolve?.(a.id)} className="text-[10px] rounded bg-primary px-1.5 py-0.5 text-primary-foreground shrink-0">
                  {t("chat.approve" as never)}
                </button>
              </div>
            ))}
          </div>
        )}

        {!hasMessages && (
          <div className="border border-dashed border-border-subtle rounded p-3 text-center">
            <p className="text-xs text-foreground font-medium">No conversation yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Describe what you want to build.</p>
          </div>
        )}

        {messages.map((msg: ChatMessage, idx: number) => (
          <div key={`${msg.id}-${idx}`} className="py-1.5 border-b border-border-subtle/50 last:border-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabelMap[msg.role]?.color ?? "text-muted-foreground"}`}>
                {msg.authorLabel || roleLabelMap[msg.role]?.label || msg.role}
              </span>
              {msg.status === "streaming" && <span className="text-[10px] text-primary font-mono">{t("chat.streaming" as never)}</span>}
              <span className="text-[10px] text-muted-foreground ml-auto font-mono tabular-nums">{formatTime(msg.createdAtIso)}</span>
            </div>
            {msg.status === "streaming" ? (
              <StreamingText text={msg.content} />
            ) : (
              <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
            {msg.linked?.taskTitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">task: {msg.linked.taskTitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border-subtle p-2 shrink-0 space-y-1.5 relative bg-card/30">
        <div className="flex items-center gap-1 px-1">
          {[
            { key: "plan", label: t("plan") },
            { key: "execute", label: t("chat.execute") },
            { key: "audit", label: t("audit") },
          ].map((m) => (
            <button key={m.key} onClick={() => setComposerMode(m.key)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                composerMode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >{m.label}</button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            <Cpu className="h-2.5 w-2.5 inline mr-0.5" />{workspaceState.activeBackend}
          </span>
        </div>

        {placeholders.length > 0 && (
          <div className="px-1 text-[10px] font-mono text-muted-foreground">
            attachments: {placeholders.map((i) => i.name).join(", ")}
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
              onChange={(e) => onDraftChange(sessionId, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(activeTab); } }}
              placeholder={t("chat.placeholder")}
              disabled={sendDisabled}
              className="w-full bg-input border border-border-subtle rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none font-mono transition-colors"
            />
          </div>
          <button onClick={() => onSendMessage(activeTab)} disabled={sendDisabled}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-40">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        {showSlashMenu && (
          <div className="absolute bottom-full left-2 mb-1 bg-popover border border-border-subtle rounded p-1 min-w-[200px] z-50 shadow-lg">
            {[
              { cmd: "/build", descKey: "slash.build" },
              { cmd: "/plan", descKey: "slash.plan" },
              { cmd: "/audit", descKey: "slash.audit" },
              { cmd: "/deploy", descKey: "slash.deploy" },
              { cmd: "/test", descKey: "slash.test" },
              { cmd: "/agent", descKey: "slash.agent" },
            ].map((item) => (
              <button key={item.cmd} onClick={() => setShowSlashMenu(false)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] hover:bg-surface-hover rounded transition-colors">
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
  return (
    <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
      {text}
      <span className="inline-block w-1 h-3.5 bg-primary animate-pulse ml-0.5" />
    </p>
  );
}

function OrchestratorSummary({ currentTask }: { currentTask: string }) {
  const { t } = useI18n();
  return (
    <div className="border border-primary/15 rounded px-2 py-1.5 mb-1">
      <p className="text-[10px] uppercase tracking-wider font-mono text-primary mb-0.5">{t("chat.main_workflow" as never)}</p>
      <p className="text-[11px] text-foreground">command → orchestrator → agents → audit → deploy</p>
      <p className="text-[10px] text-muted-foreground font-mono">task: {currentTask}</p>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
