import { useState } from "react";
import {
  MessageSquare, Bot, Shield, GitPullRequest,
  Slash, AtSign, Paperclip, Cpu, Eye, Send,
  Loader2, CheckCircle, XCircle, Clock
} from "lucide-react";
import type { ChatTab, ChatMessage } from "@/data/mock-chat";
import { mainChatMessages, agentChatMessages, auditChatMessages, reviewChatMessages } from "@/data/mock-chat";

const tabs: { id: ChatTab; label: string; icon: React.ReactNode }[] = [
  { id: "main", label: "Main Chat", icon: <MessageSquare className="h-3 w-3" /> },
  { id: "agent", label: "Agent Chat", icon: <Bot className="h-3 w-3" /> },
  { id: "audit", label: "Audit Chat", icon: <Shield className="h-3 w-3" /> },
  { id: "review", label: "Review Chat", icon: <GitPullRequest className="h-3 w-3" /> },
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
  user: "bg-primary/10 border-primary/20 ml-8",
  agent: "bg-surface border-border mr-8",
  system: "bg-muted/50 border-border mx-4 text-center",
  auditor: "bg-warning/5 border-warning/20 mr-8",
};

const roleLabel: Record<string, { text: string; color: string }> = {
  user: { text: "YOU", color: "text-primary" },
  agent: { text: "AGENT", color: "text-accent" },
  system: { text: "SYSTEM", color: "text-muted-foreground" },
  auditor: { text: "AUDITOR", color: "text-warning" },
};

export function ChatPanel() {
  const [activeTab, setActiveTab] = useState<ChatTab>("main");
  const [composerMode, setComposerMode] = useState<string>("execute");
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  const messages = chatData[activeTab];

  return (
    <div className="flex flex-col h-full">
      {/* Chat tabs */}
      <div className="flex items-center border-b border-border bg-card shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`rounded-lg border p-2.5 ${roleStyles[msg.role]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              {msg.status && statusIcon[msg.status]}
              <span className={`text-[10px] font-mono font-semibold ${roleLabel[msg.role].color}`}>
                {msg.agentName || roleLabel[msg.role].text}
              </span>
              <span className="text-[9px] text-muted-foreground ml-auto">{msg.timestamp}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-2 shrink-0 space-y-1.5">
        {/* Mode toggles */}
        <div className="flex items-center gap-1 px-1">
          {["plan", "execute", "audit"].map((m) => (
            <button
              key={m}
              onClick={() => setComposerMode(m)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                composerMode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {m}
            </button>
          ))}
          <div className="flex-1" />
          <button className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded">
            <Eye className="h-2.5 w-2.5" /> local only
          </button>
          <button className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded">
            <Cpu className="h-2.5 w-2.5" /> Ollama
          </button>
        </div>

        {/* Input row */}
        <div className="relative flex items-end gap-1.5">
          <div className="flex gap-0.5">
            <button
              onClick={() => setShowSlashMenu(!showSlashMenu)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-surface-hover rounded transition-colors"
              title="Slash commands"
            >
              <Slash className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-accent hover:bg-surface-hover rounded transition-colors" title="Mention agent">
              <AtSign className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-colors" title="Attach file">
              <Paperclip className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 relative">
            <textarea
              rows={1}
              placeholder="Describe what to build, ask an agent, or run a command..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
            />
          </div>
          <button className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shrink-0">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Slash command menu */}
        {showSlashMenu && (
          <div className="absolute bottom-full left-2 mb-1 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[200px] z-50">
            {[
              { cmd: "/build", desc: "Start build pipeline" },
              { cmd: "/plan", desc: "Enter planning mode" },
              { cmd: "/audit", desc: "Run full audit" },
              { cmd: "/deploy", desc: "Deploy to staging" },
              { cmd: "/test", desc: "Run test suite" },
              { cmd: "/rollback", desc: "Rollback last deploy" },
              { cmd: "/agent", desc: "Summon specific agent" },
              { cmd: "/snapshot", desc: "Save memory snapshot" },
            ].map((item) => (
              <button
                key={item.cmd}
                onClick={() => setShowSlashMenu(false)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-surface-hover rounded transition-colors"
              >
                <span className="font-mono text-primary">{item.cmd}</span>
                <span className="text-muted-foreground">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
