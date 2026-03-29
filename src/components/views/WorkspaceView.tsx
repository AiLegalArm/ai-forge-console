import { promptChainSteps } from "@/data/mock-prompts";
import type { NavSection, AppMode } from "@/components/layout/AppLayout";
import {
  Files, GitBranch, Rocket, Globe, MessageSquare,
  CheckCircle, Play, Clock, XCircle,
} from "lucide-react";

const stepIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  running: <Play className="h-3.5 w-3.5 text-primary animate-pulse-glow" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  skipped: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
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

  return (
    <div className="p-4 space-y-4">
      {/* Discovery Chat / Build Pipeline based on mode */}
      {mode === "plan" && <PlanModeView />}
      {mode === "build" && <BuildModeView />}
      {mode === "audit" && (
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <span className="text-xs text-muted-foreground font-mono">Audit Mode — Switch to Audits panel for details</span>
        </div>
      )}
      {mode === "release" && (
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <span className="text-xs text-muted-foreground font-mono">Release Mode — Switch to Release panel for details</span>
        </div>
      )}
    </div>
  );
}

function PlanModeView() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-primary" /> Discovery Chat
        </h2>
        <div className="space-y-3 max-h-48 overflow-auto">
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-primary shrink-0">NEXUS</span>
            <p className="text-xs text-foreground">What type of application are you building? I'll help you define the architecture and requirements.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-accent shrink-0">YOU</span>
            <p className="text-xs text-foreground">A SaaS analytics dashboard with real-time data, user management, and Stripe billing.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-primary shrink-0">NEXUS</span>
            <p className="text-xs text-foreground">Great. I've identified 12 requirements. Let me generate the architecture plan and prompt chain. Do you want to include mobile-responsive views?</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 bg-input border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Continue the conversation..." />
          <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded font-mono">Send</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Requirements Summary</h2>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-surface rounded p-2"><span className="text-muted-foreground">Features</span><div className="font-mono text-foreground">12</div></div>
          <div className="bg-surface rounded p-2"><span className="text-muted-foreground">Components</span><div className="font-mono text-foreground">24</div></div>
          <div className="bg-surface rounded p-2"><span className="text-muted-foreground">Integrations</span><div className="font-mono text-foreground">4</div></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Plan Graph</h2>
        <div className="grid grid-cols-4 gap-1">
          {["Auth", "Dashboard", "Charts", "Users", "Billing", "Settings", "API", "Admin"].map((n) => (
            <div key={n} className="bg-surface rounded p-2 text-center border border-border hover:border-primary/30 transition cursor-pointer">
              <span className="text-[10px] font-mono text-foreground">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuildModeView() {
  const completed = promptChainSteps.filter((s) => s.status === "completed").length;
  const progress = (completed / promptChainSteps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-foreground">Prompt Chain Execution</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">{completed}/{promptChainSteps.length} steps</span>
            <span className="text-[10px] font-mono text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-1.5">
          {promptChainSteps.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2">
                {stepIcons[s.status]}
                <span className="text-xs text-foreground">{s.name}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="font-mono">{s.agent}</span>
                {s.tokens && <span>{s.tokens.toLocaleString()} tok</span>}
                {s.duration && <span>{s.duration}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Approval Checkpoints</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Architecture Review</span><span className="text-success font-mono">Approved</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Prompt Chain Review</span><span className="text-success font-mono">Approved</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Implementation Review</span><span className="text-primary font-mono animate-pulse-glow">In Progress</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Security Sign-off</span><span className="text-muted-foreground font-mono">Pending</span></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Memory & Snapshots</h2>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>Snapshots</span><span className="font-mono text-foreground">7</span></div>
          <div className="flex justify-between"><span>Context tokens</span><span className="font-mono text-foreground">48,230</span></div>
          <div className="flex justify-between"><span>History entries</span><span className="font-mono text-foreground">34</span></div>
          <div className="flex justify-between"><span>AGENTS.md</span><span className="font-mono text-success">Synced</span></div>
        </div>
      </div>
    </div>
  );
}

function FilesView() {
  const files = [
    { name: "src/", type: "dir", children: ["components/", "hooks/", "lib/", "pages/", "data/", "App.tsx", "main.tsx", "index.css"] },
    { name: "supabase/", type: "dir", children: ["migrations/", "functions/", "config.toml"] },
    { name: "public/", type: "dir", children: ["favicon.ico", "robots.txt"] },
  ];
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Files className="h-4 w-4 text-primary" /> Files</h1>
      <div className="bg-card border border-border rounded-lg p-3 font-mono text-xs space-y-1">
        {files.map((f) => (
          <div key={f.name}>
            <div className="text-primary cursor-pointer hover:underline">{f.name}</div>
            {f.children.map((c) => (
              <div key={c} className="ml-4 text-foreground cursor-pointer hover:text-primary">{c}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GitView() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> Git</h1>
      <div className="bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-mono text-primary">main</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Remote</span><span className="font-mono text-foreground">github.com/user/saas-dashboard</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-mono text-success">Clean</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last push</span><span className="font-mono text-foreground">5m ago</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Commits today</span><span className="font-mono text-foreground">12</span></div>
      </div>
      <div className="flex gap-1.5">
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">Push</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Pull</button>
        <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Sync</button>
      </div>
    </div>
  );
}

function DeployView() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> Deploy</h1>
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          <span className="text-xs font-semibold text-foreground">Production</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.4.2 • deployed 2h ago</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold text-foreground">Staging</span>
          <span className="text-[10px] text-muted-foreground font-mono">v1.5.0-rc1 • deploying...</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">Deploy Staging</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Promote to Prod</button>
        </div>
      </div>
    </div>
  );
}

function DomainsView() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Domains</h1>
      <div className="space-y-2">
        {[
          { domain: "app.example.com", ssl: true, status: "active" },
          { domain: "staging.example.com", ssl: true, status: "active" },
          { domain: "api.example.com", ssl: true, status: "active" },
        ].map((d) => (
          <div key={d.domain} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs font-mono text-foreground">{d.domain}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {d.ssl && <span className="text-success">SSL ✓</span>}
              <span className="font-mono">{d.status}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">+ Add Domain</button>
    </div>
  );
}
