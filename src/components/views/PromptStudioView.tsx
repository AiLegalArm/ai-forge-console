import { useState } from "react";
import { promptStudioTabs } from "@/data/mock-prompts";
import { Wand2, Play, CheckCircle, AlertTriangle } from "lucide-react";

export function PromptStudioView() {
  const [activeTab, setActiveTab] = useState(promptStudioTabs[0]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" /> Prompt Studio
        </h1>
        <div className="flex gap-1.5">
          <button className="px-2.5 py-1 text-xs font-mono bg-primary text-primary-foreground rounded flex items-center gap-1"><Play className="h-3 w-3" />Execute</button>
          <button className="px-2.5 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Save</button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {promptStudioTabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 min-h-[300px]">
        {activeTab === "Human Input" && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">Describe what you want to build</label>
            <textarea
              className="w-full h-32 bg-input border border-border rounded p-3 text-sm text-foreground font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="I want to build a real-time analytics dashboard with user authentication, data visualization using charts, and a settings page for managing API keys..."
              defaultValue="Build a SaaS analytics dashboard with real-time metrics, user management, Stripe billing integration, and a responsive mobile view. Include authentication via Supabase, role-based access control, and an admin panel."
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span>Input validated • 47 tokens • Ready for extraction</span>
            </div>
          </div>
        )}
        {activeTab === "Requirements" && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 mb-3"><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="font-semibold text-foreground">12 requirements extracted</span></div>
            {["User authentication with email/password and OAuth", "Real-time dashboard with WebSocket updates", "Charts: line, bar, pie, area using Recharts", "Role-based access: admin, editor, viewer", "Stripe subscription management", "Responsive layout with mobile support", "Admin panel for user management", "API key management in settings", "Data export (CSV, JSON)", "Notification system", "Activity audit log", "Dark mode support"].map((r, i) => (
              <div key={i} className="flex items-start gap-2 py-1 border-b border-border/50">
                <span className="font-mono text-primary shrink-0">R{String(i + 1).padStart(2, "0")}</span>
                <span className="text-foreground">{r}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === "Generated Prompt" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs"><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="text-foreground font-semibold">Prompt generated • 2,340 tokens</span></div>
            <div className="bg-muted rounded p-3 font-mono text-xs text-foreground leading-relaxed max-h-60 overflow-auto">
              <span className="text-primary">## System Context</span><br />
              You are a senior full-stack engineer building a SaaS analytics dashboard...<br /><br />
              <span className="text-primary">## Architecture</span><br />
              - Frontend: React 18 + TypeScript + Tailwind CSS<br />
              - Backend: Supabase (Auth, Database, Edge Functions)<br />
              - Payments: Stripe SDK<br />
              - Charts: Recharts<br />
              - State: TanStack Query<br /><br />
              <span className="text-primary">## Implementation Steps</span><br />
              1. Set up authentication flow with Supabase Auth...<br />
              2. Create dashboard layout with responsive grid...<br />
              3. Implement real-time data subscription...<br />
            </div>
          </div>
        )}
        {activeTab === "Prompt Audit" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-warning" /><span className="font-semibold text-foreground">2 suggestions found</span></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-3 space-y-1">
              <div className="font-semibold text-warning">Missing error boundary specification</div>
              <div className="text-muted-foreground">Prompt should specify error handling strategy for API failures.</div>
            </div>
            <div className="bg-info/10 border border-info/20 rounded p-3 space-y-1">
              <div className="font-semibold text-info">Consider adding rate limiting context</div>
              <div className="text-muted-foreground">API endpoints should include rate limiting specifications.</div>
            </div>
          </div>
        )}
        {!["Human Input", "Requirements", "Generated Prompt", "Prompt Audit"].includes(activeTab) && (
          <div className="flex items-center justify-center h-40">
            <span className="text-xs text-muted-foreground font-mono">{activeTab} — content will populate during execution</span>
          </div>
        )}
      </div>
    </div>
  );
}
