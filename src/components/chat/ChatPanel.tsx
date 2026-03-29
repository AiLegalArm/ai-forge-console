import { useState, type ReactNode } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  Loader2, CheckCircle, XCircle, Clock, Waypoints, Check,
} from "lucide-react";
import type { ChatType } from "@/types/chat";
type ChatTab = ChatType;
import { useI18n } from "@/lib/i18n";
import type { ChatState, ChatMessage } from "@/types/chat";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import { auditSummary } from "@/data/mock-audits";

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
  onApprovalResolve: (sessionId: string) => void;
  onWorkflowApprovalResolve?: (approvalId: string) => void;
}

export function ChatPanel({ workspaceState, chatState, chatContexts, onConversationTypeChange, onDraftChange, onApprovalResolve, onWorkflowApprovalResolve }: ChatPanelProps) {
  const { t } = useI18n();
  const [composerMode, setComposerMode] = useState<string>("execute");
  const [showSlashMenu, setShowSlashMenu] = useState(false);

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
          <span>{activeSession?.title ?? "Orchestrator-first command surface"}</span>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {activeSession?.providerMeta.backend} • {activeSession?.providerMeta.provider}
        </span>
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
        {activeTab === "main" && (
          <OrchestratorSummary currentTask={workspaceState.currentTask} />
        )}

        {activeTab === "audit" && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono text-warning">
            Audit findings: {auditSummary.critical} critical • {auditSummary.high} high • score {auditSummary.score}
          </div>
        )}
        {activeTab === "review" && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-2 text-xs font-mono text-info">
            Review evidence: {workspaceState.evidenceFlow.linkedByReviewId["pr-rbac-42"]?.length ?? 0} linked items •
            blockers {workspaceState.evidenceFlow.releaseReadinessBlockers.length}
          </div>
        )}

        {activeApproval && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono">
            <p className="text-warning">Approval requested: {activeApproval.title}</p>
            <p className="text-muted-foreground mt-1">{activeApproval.description}</p>
            <button
              onClick={() => onApprovalResolve(sessionId)}
              className="mt-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground"
            >
              <Check className="h-3 w-3" /> Mark approved
            </button>
          </div>
        )}


        {workspaceState.pendingApprovals.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs font-mono space-y-1">
            <p className="text-warning">Workflow approvals pending</p>
            {workspaceState.pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate">{approval.title}</span>
                <button
                  onClick={() => onWorkflowApprovalResolve?.(approval.id)}
                  className="text-[10px] rounded bg-primary px-1.5 py-0.5 text-primary-foreground"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg: ChatMessage) => (
          <div key={msg.id} className={`rounded-lg border p-2 sm:p-2.5 ${roleStyles[msg.role]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabelMap[msg.role].color}`}>
                {msg.authorLabel || roleLabelMap[msg.role].label}
              </span>
              <span className="text-[9px] text-muted-foreground ml-auto">{formatTime(msg.createdAtIso)}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            {msg.linked?.taskTitle && (
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">Task ↔ {msg.linked.taskTitle}</p>
            )}
            {msg.linked?.evidenceIds?.length ? (
              <p className="text-[10px] text-info mt-1 font-mono">Evidence ↔ {msg.linked.evidenceIds.join(", ")}</p>
            ) : null}
          </div>
        ))}
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
            Attachments staged: {placeholders.map((item) => item.name).join(", ")}
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
              placeholder={t("chat.placeholder")}
              className="w-full bg-input border border-border rounded-lg px-2 sm:px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
            />
          </div>
          <button className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shrink-0">
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

function OrchestratorSummary({ currentTask }: { currentTask: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 sm:p-2.5">
      <p className="text-[10px] uppercase tracking-wider font-mono text-primary mb-1">Main workflow</p>
      <p className="text-xs text-foreground">
        command → orchestrator plan → approvals → agent execution stream → audit/review summary → code/deploy
      </p>
      <p className="text-[10px] text-muted-foreground mt-1 font-mono">Task: {currentTask}</p>
    </div>
  );
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
