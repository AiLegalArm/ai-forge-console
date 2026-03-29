import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatContextBar } from "@/components/chat/ChatContextBar";
import { AgentActivityPanel } from "@/components/chat/AgentActivityPanel";
import { promptChainSteps } from "@/data/mock-prompts";
import type { NavSection, AppMode } from "@/components/layout/AppLayout";
import { useI18n } from "@/lib/i18n";
import {
  Files, GitBranch, Rocket, Globe,
  CheckCircle, Play, Clock, XCircle,
} from "lucide-react";

const stepIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-success" />,
  running: <Play className="h-3 w-3 text-primary animate-pulse" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
  skipped: <Clock className="h-3 w-3 text-muted-foreground" />,
};

interface WorkspaceViewProps {
  section: NavSection;
  mode: AppMode;
}

export function WorkspaceView({ section, mode }: WorkspaceViewProps) {
  if (section === "files") return <FilesView />;
  if (section === "git") return <GitView />;
  if (section === "deploy") return <DeployView />;
  if (section === "domains") return <DomainsView />;

  // Chat-first workspace (default)
  return (
    <div className="flex flex-col h-full">
      <ChatContextBar />
      <AgentActivityPanel />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ChatPanel />
        </div>
        <div className="w-64 border-l border-border bg-card overflow-auto shrink-0 hidden lg:block">
          <SideRail mode={mode} />
        </div>
      </div>
    </div>
  );
}

function SideRail({ mode }: { mode: AppMode }) {
  const { t } = useI18n();
  const completed = promptChainSteps.filter((s) => s.status === "completed").length;
  const progress = (completed / promptChainSteps.length) * 100;

  return (
    <div className="p-2.5 space-y-3 text-xs">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("pipeline")}</span>
          <span className="text-[10px] font-mono text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-0.5">
          {promptChainSteps.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 py-1 border-b border-border/30 last:border-0">
              {stepIcons[s.status]}
              <span className="text-[10px] text-foreground truncate">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("checkpoints")}</span>
        <div className="mt-1.5 space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground text-[10px]">Architecture</span><span className="text-success text-[10px] font-mono">✓</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-[10px]">Prompt Chain</span><span className="text-success text-[10px] font-mono">✓</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-[10px]">Implementation</span><span className="text-primary text-[10px] font-mono">…</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-[10px]">Security</span><span className="text-muted-foreground text-[10px] font-mono">—</span></div>
        </div>
      </div>

      <div>
        <span className="text-[10px] font-mono font-semibold text-foreground uppercase tracking-wider">{t("memory")}</span>
        <div className="mt-1.5 space-y-0.5 text-[10px]">
          <div className="flex justify-between text-muted-foreground"><span>{t("snapshots")}</span><span className="text-foreground font-mono">7</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{t("context")}</span><span className="text-foreground font-mono">48K tok</span></div>
          <div className="flex justify-between text-muted-foreground"><span>AGENTS.md</span><span className="text-success font-mono">{t("ctx.synced")}</span></div>
        </div>
      </div>
    </div>
  );
}

function FilesView() {
  const { t } = useI18n();
  const files = [
    { name: "src/", children: ["components/", "hooks/", "lib/", "pages/", "data/", "App.tsx", "main.tsx", "index.css"] },
    { name: "supabase/", children: ["migrations/", "functions/", "config.toml"] },
    { name: "public/", children: ["favicon.ico", "robots.txt"] },
  ];
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Files className="h-4 w-4 text-primary" /> {t("files")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 font-mono text-xs space-y-1">
        {files.map((f) => (
          <div key={f.name}>
            <div className="text-primary cursor-pointer hover:underline">{f.name}</div>
            {f.children.map((c) => (<div key={c} className="ml-4 text-foreground cursor-pointer hover:text-primary">{c}</div>))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GitView() {
  const { t } = useI18n();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> {t("git")}</h1>
      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.branch")}</span><span className="font-mono text-primary">main</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.remote")}</span><span className="font-mono text-foreground">github.com/user/saas-dashboard</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.status")}</span><span className="font-mono text-success">{t("git.clean")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("git.last_push")}</span><span className="font-mono text-foreground">5m ago</span></div>
      </div>
      <div className="flex gap-1.5">
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("git.push")}</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.pull")}</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("git.sync")}</button>
      </div>
    </div>
  );
}

function DeployView() {
  const { t } = useI18n();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> {t("deploy")}</h1>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-foreground">{t("deploy.production")}</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.4.2</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-foreground">{t("deploy.staging")}</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.5.0-rc1</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("deploy.staging_btn")}</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("deploy.promote")}</button>
        </div>
      </div>
    </div>
  );
}

function DomainsView() {
  const { t } = useI18n();
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> {t("domains")}</h1>
      <div className="space-y-2">
        {["app.example.com", "staging.example.com", "api.example.com"].map((d) => (
          <div key={d} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs font-mono text-foreground">{d}</span>
            </div>
            <span className="text-[10px] text-success">SSL ✓</span>
          </div>
        ))}
      </div>
      <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("domains.add")}</button>
    </div>
  );
}
