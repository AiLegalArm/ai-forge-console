import { releaseGates, releaseVerdict } from "@/data/mock-release";
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const gateIcons: Record<string, React.ReactNode> = {
  passed: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
};

export function ReleaseCenterView() {
  const { t } = useI18n();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> {t("rc.title")}
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-muted text-muted-foreground rounded cursor-not-allowed" disabled>
          {t("rc.deploy")}
        </button>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="text-sm font-bold text-destructive uppercase">{t("rc.blocked")}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">{t("rc.blockers")}</span><div className="font-mono text-lg text-destructive">{releaseVerdict.blockers}</div></div>
          <div><span className="text-muted-foreground">{t("rc.high_issues")}</span><div className="font-mono text-lg text-warning">{releaseVerdict.highIssues}</div></div>
          <div><span className="text-muted-foreground">{t("rc.gates_passed")}</span><div className="font-mono text-lg text-success">{releaseVerdict.passedGates}/{releaseVerdict.totalGates}</div></div>
          <div><span className="text-muted-foreground">{t("rc.rollback")}</span><div className="font-mono text-lg text-success">{t("rc.ready")}</div></div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-foreground">{t("rc.gates")}</h2>
        {releaseGates.map((g) => (
          <div key={g.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {gateIcons[g.status]}
              <span className="text-xs font-medium text-foreground">{g.name}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{g.details}</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">{t("rc.signoff")}</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("rc.tech_lead")}</span><span className="text-warning font-mono">{t("rc.pending")}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("rc.security")}</span><span className="text-destructive font-mono">{t("rc.blocked_status")}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("rc.qa")}</span><span className="text-muted-foreground font-mono">{t("rc.waiting")}</span></div>
        </div>
      </div>
    </div>
  );
}
