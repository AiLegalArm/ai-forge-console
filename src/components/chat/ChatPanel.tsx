import { useState } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  Loader2, CheckCircle, XCircle, Clock
} from "lucide-react";
import type { ChatTab, ChatMessage } from "@/data/mock-chat";
import { mainChatMessages, agentChatMessages, auditChatMessages, reviewChatMessages } from "@/data/mock-chat";
import { useI18n } from "@/lib/i18n";

const tabConfig: { id: ChatTab; labelKey: string; shortKey: string; icon: React.ReactNode }[] = [
  { id: "main", labelKey: "chat.main", shortKey: "chat.main.short", icon: <MessageSquare className="h-3 w-3" /> },
  { id: "agent", labelKey: "chat.agent", shortKey: "chat.agent.short", icon: <Bot className="h-3 w-3" /> },
  { id: "audit", labelKey: "chat.audit", shortKey: "chat.audit.short", icon: <Shield className="h-3 w-3" /> },
  { id: "review", labelKey: "chat.review", shortKey: "chat.review.short", icon: <GitPullRequest className="h-3 w-3" /> },
];

const chatData: Record<ChatTab, ChatMessage[]> = {
  main: mainChatMessages,
  agent: agentChatMessages,
  audit: auditChatMessages,
  review: reviewChatMessages,
};

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-success shrink-0" />,
  running: <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground shrink-0" />,
  failed: <XCircle className="h-3 w-3 text-destructive shrink-0" />,
};

const roleStyles: Record<string, string> = {
  user: "bg-primary/10 border-primary/20 ml-4 sm:ml-8",
  agent: "bg-surface border-border mr-4 sm:mr-8",
  system: "bg-muted/50 border-border mx-2 sm:mx-4 text-center",
  auditor: "bg-warning/5 border-warning/20 mr-4 sm:mr-8",
};

export function ChatPanel() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ChatTab>("main");
  const [composerMode, setComposerMode] = useState<string>("execute");
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  const messages = chatData[activeTab];

  const roleLabelMap: Record<string, { textKey: string; color: string }> = {
    user: { textKey: "chat.you", color: "text-primary" },
    agent: { textKey: "chat.agent_label", color: "text-accent" },
    system: { textKey: "chat.system", color: "text-muted-foreground" },
    auditor: { textKey: "chat.auditor_label", color: "text-warning" },
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat tabs */}
      <div className="flex items-center border-b border-border bg-card shrink-0 overflow-x-auto">
        {tabConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs font-mono transition-colors border-b-2 shrink-0 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(tab.labelKey as any)}</span>
            <span className="sm:hidden">{t(tab.shortKey as any)}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-2 sm:p-3 space-y-2 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`rounded-lg border p-2 sm:p-2.5 ${roleStyles[msg.role]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabelMap[msg.role].color}`}>
                {msg.agentName || t(roleLabelMap[msg.role].textKey as any)}
              </span>
              <span className="text-[9px] text-muted-foreground ml-auto">{msg.timestamp}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Composer */}
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
            <Cpu className="h-2.5 w-2.5" /> <span className="hidden sm:inline">Ollama</span>
          </button>
        </div>

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
                <span className="text-muted-foreground text-[10px] sm:text-xs">{t(item.descKey as any)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
