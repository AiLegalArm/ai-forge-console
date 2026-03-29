import { useState } from "react";
import { Eye, Globe, Palette, ShieldCheck, Rocket, Link, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

interface RightPanelProps {
  activeTab: string;
  onTabChange: (t: string) => void;
  workspaceState: WorkspaceRuntimeState;
  isMobile?: boolean;
  onClose?: () => void;
}

export function RightPanel({ activeTab, onTabChange, workspaceState, isMobile, onClose }: RightPanelProps) {
  const { t } = useI18n();
  const tabs = [
    { id: "preview", icon: Eye, label: t("rp.preview") },
    { id: "browser", icon: Globe, label: t("rp.browser") },
    { id: "design", icon: Palette, label: t("rp.design") },
    { id: "audit-results", icon: ShieldCheck, label: t("rp.audit") },
    { id: "deploy", icon: Rocket, label: t("rp.deploy") },
    { id: "domain", icon: Link, label: t("rp.domain") },
  ];
  const [collapsed, setCollapsed] = useState(false);

  if (!isMobile && collapsed) {
    return (
      <div className="w-8 border-l border-border bg-panel flex flex-col items-center py-2 gap-1.5 shrink-0">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => { onTabChange(tab.id); setCollapsed(false); }} className="p-1 text-muted-foreground hover:text-foreground" title={tab.label}>
            <tab.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`${isMobile ? "w-full h-full" : "w-80"} border-l border-border bg-panel flex flex-col shrink-0`}>
      <div className="flex items-center border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1 px-2 py-2 text-xs transition-colors border-b-2 shrink-0 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <tab.icon className="h-3 w-3" />
            <span className="text-[10px] sm:text-xs">{tab.label}</span>
          </button>
        ))}
        <button onClick={isMobile ? onClose : () => setCollapsed(true)} className="ml-auto px-2 text-muted-foreground hover:text-foreground shrink-0">
          {isMobile ? <X className="h-3.5 w-3.5" /> : <span>›</span>}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <RightPanelContent tab={activeTab} workspaceState={workspaceState} />
      </div>
    </div>
  );
}

function RightPanelContent({ tab, workspaceState }: { tab: string; workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  switch (tab) {
    case "preview":
      return (
        <div className="space-y-3">
          <div className="aspect-video rounded bg-surface border border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono">Live Preview</span>
          </div>
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className={`px-2 py-0.5 text-xs rounded font-mono ${workspaceState.localShell.runtime.previewRuntime === "healthy" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
              {workspaceState.localShell.runtime.previewRuntime === "healthy" ? t("rp.running") : "degraded"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">localhost:5173</span>
            <span className="text-xs text-muted-foreground font-mono">mode: {workspaceState.localShell.executionMode}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Runtime</span><span className="font-mono text-foreground uppercase">{workspaceState.localShell.runtime.localRuntime}</span></div>
            <div className="flex justify-between"><span>Providers</span><span className="font-mono text-foreground uppercase">{workspaceState.localShell.runtime.providers}</span></div>
            <div className="flex justify-between"><span>Release gate</span><span className={`font-mono ${workspaceState.localShell.runtime.releaseReadiness === "blocked" ? "text-warning" : "text-success"}`}>{workspaceState.localShell.runtime.releaseReadiness}</span></div>
          </div>
          {workspaceState.localShell.runtime.releaseReadiness === "blocked" ? (
            <div className="text-[11px] border border-warning/30 bg-warning/5 rounded p-2 text-warning">
              Release blocked: {workspaceState.localShell.runtime.releaseBlockReason}
            </div>
          ) : null}
        </div>
      );
    case "audit-results": {
      const findings = workspaceState.auditors.findings;
      const summary = findings.reduce((acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
      const noGoGates = workspaceState.auditors.gateDecisions.filter((gate) => gate.verdict === "no_go").length;
      const score = Math.max(0, 100 - summary.critical * 12 - summary.high * 7 - summary.medium * 3 - noGoGates * 5);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t("au.health")}</span>
            <span className="text-lg font-mono font-bold text-warning">{score}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-destructive/10 border border-destructive/20 rounded p-2"><span className="font-mono text-destructive text-lg">{summary.critical}</span><p className="text-muted-foreground">{t("au.critical")}</p></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-2"><span className="font-mono text-warning text-lg">{summary.high}</span><p className="text-muted-foreground">{t("au.high")}</p></div>
            <div className="bg-info/10 border border-info/20 rounded p-2"><span className="font-mono text-info text-lg">{summary.medium}</span><p className="text-muted-foreground">{t("au.medium")}</p></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-2"><span className="font-mono text-warning text-lg">{noGoGates}</span><p className="text-muted-foreground">No-Go gates</p></div>
          </div>
        </div>
      );
    }
    case "deploy":
      return (
        <div className="space-y-3 text-xs">
          <div className="bg-surface rounded p-3 border border-border space-y-2">
            <div className="font-semibold text-foreground">{t("deploy")}</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success animate-pulse" /><span className="text-muted-foreground">{t("deploy.production")}: <span className="text-success font-mono">Healthy</span></span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">{t("deploy.staging")}: <span className="text-primary font-mono">Deploying</span></span></div>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-32">
          <span className="text-xs text-muted-foreground font-mono">{tab}</span>
        </div>
      );
  }
}
