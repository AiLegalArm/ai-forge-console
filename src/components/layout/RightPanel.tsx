import { useState } from "react";
import { Eye, Globe, Palette, ShieldCheck, Rocket, Link, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { auditGateDecisions, auditSummary } from "@/data/mock-audits";

interface RightPanelProps {
  activeTab: string;
  onTabChange: (t: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function RightPanel({ activeTab, onTabChange, isMobile, onClose }: RightPanelProps) {
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
        <RightPanelContent tab={activeTab} />
      </div>
    </div>
  );
}

function RightPanelContent({ tab }: { tab: string }) {
  const { t } = useI18n();
  switch (tab) {
    case "preview":
      return (
        <div className="space-y-3">
          <div className="aspect-video rounded bg-surface border border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono">Live Preview</span>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded font-mono">{t("rp.running")}</span>
            <span className="text-xs text-muted-foreground font-mono">localhost:5173</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>{t("rp.build_time")}</span><span className="font-mono text-foreground">1.2s</span></div>
            <div className="flex justify-between"><span>{t("rp.bundle")}</span><span className="font-mono text-foreground">247kb</span></div>
            <div className="flex justify-between"><span>{t("rp.errors")}</span><span className="font-mono text-success">0</span></div>
          </div>
        </div>
      );
    case "audit-results": {
      const noGoGates = auditGateDecisions.filter((gate) => gate.verdict === "no_go").length;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t("au.health")}</span>
            <span className="text-lg font-mono font-bold text-warning">{auditSummary.score}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-destructive/10 border border-destructive/20 rounded p-2"><span className="font-mono text-destructive text-lg">{auditSummary.critical}</span><p className="text-muted-foreground">{t("au.critical")}</p></div>
            <div className="bg-warning/10 border border-warning/20 rounded p-2"><span className="font-mono text-warning text-lg">{auditSummary.high}</span><p className="text-muted-foreground">{t("au.high")}</p></div>
            <div className="bg-info/10 border border-info/20 rounded p-2"><span className="font-mono text-info text-lg">{auditSummary.medium}</span><p className="text-muted-foreground">{t("au.medium")}</p></div>
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
