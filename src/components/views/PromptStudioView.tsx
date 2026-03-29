import { useState } from "react";
import { promptStudioTabs } from "@/data/mock-prompts";
import { Wand2, Play, CheckCircle, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function PromptStudioView() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(promptStudioTabs[0]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" /> {t("ps.title")}
        </h1>
        <div className="flex gap-1.5">
          <button className="px-2.5 py-1 text-xs font-mono bg-primary text-primary-foreground rounded flex items-center gap-1"><Play className="h-3 w-3" />{t("ps.execute")}</button>
          <button className="px-2.5 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("ps.save")}</button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {promptStudioTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab}</button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 min-h-[300px]">
        {activeTab === "Human Input" && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-foreground">{t("ps.describe")}</label>
            <textarea
              className="w-full h-32 bg-input border border-border rounded p-3 text-sm text-foreground font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              defaultValue="Build a SaaS analytics dashboard with real-time metrics, user management, Stripe billing integration, and a responsive mobile view."
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span>{t("ps.validated")} • 47 tokens • {t("ps.ready")}</span>
            </div>
          </div>
        )}
        {activeTab === "Requirements" && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 mb-3"><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="font-semibold text-foreground">12 {t("ps.requirements")}</span></div>
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
            <div className="flex items-center gap-2 text-xs"><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="text-foreground font-semibold">{t("ps.generated")} • 2,340 tokens</span></div>
            <div className="bg-muted rounded p-3 font-mono text-xs text-foreground leading-relaxed max-h-60 overflow-auto">
              <span className="text-primary">## System Context</span><br />
              You are a senior full-stack engineer...<br /><br />
              <span className="text-primary">## Architecture</span><br />
              - Frontend: React 18 + TypeScript + Tailwind CSS<br />
              - Backend: Supabase (Auth, Database, Edge Functions)<br />
              - Payments: Stripe SDK<br />
            </div>
          </div>
        )}
        {activeTab === "Prompt Audit" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-warning" /><span className="font-semibold text-foreground">2 {t("ps.suggestions")}</span></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-3 space-y-1">
              <div className="font-semibold text-warning">Missing error boundary specification</div>
              <div className="text-muted-foreground">Prompt should specify error handling strategy.</div>
            </div>
          </div>
        )}
        {!["Human Input", "Requirements", "Generated Prompt", "Prompt Audit"].includes(activeTab) && (
          <div className="flex items-center justify-center h-40">
            <span className="text-xs text-muted-foreground font-mono">{activeTab}</span>
          </div>
        )}
      </div>
    </div>
  );
}
