import { useMemo, useState } from "react";
import {
  auditFindings,
  auditGateDecisions,
  auditRuns,
  auditSummary,
  auditors,
  findingSeverityOrder,
} from "@/data/mock-audits";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, Filter, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { FindingSeverity } from "@/types/audits";
import type { WorkspaceRuntimeState } from "@/types/workspace";

const severityStyles: Record<FindingSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" /> },
  high: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" /> },
  medium: { bg: "bg-info/10 border-info/20", text: "text-info", icon: <Info className="h-3.5 w-3.5 text-info" /> },
  low: { bg: "bg-muted border-border", text: "text-muted-foreground", icon: <Info className="h-3.5 w-3.5 text-muted-foreground" /> },
  info: { bg: "bg-muted border-border", text: "text-muted-foreground", icon: <Info className="h-3.5 w-3.5 text-muted-foreground" /> },
};

const statusBadge: Record<string, string> = {
  open: "bg-destructive/20 text-destructive",
  acknowledged: "bg-warning/20 text-warning",
  resolved: "bg-success/20 text-success",
  dismissed: "bg-muted text-muted-foreground",
};

export function AuditsView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const [activeSeverity, setActiveSeverity] = useState<FindingSeverity | "all">("all");
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(auditFindings[0]?.id ?? null);

  const filteredFindings = useMemo(
    () => auditFindings.filter((finding) => activeSeverity === "all" || finding.severity === activeSeverity),
    [activeSeverity],
  );

  const selectedFinding = auditFindings.find((finding) => finding.id === selectedFindingId) ?? null;
  const blockingGateCount = auditGateDecisions.filter((gate) => gate.verdict !== "go").length;
  const activeBlockers = workspaceState.auditors.blockers.filter((blocker) => blocker.status === "active");
  const currentVerdict = workspaceState.auditGateVerdict ?? auditSummary.overall;
  const recentRuns = workspaceState.auditors.runs.slice(0, 6);
  const severitySummary = workspaceState.auditors.findings.reduce((acc, finding) => {
    acc[finding.severity] += 1;
    return acc;
  }, { info: 0, low: 0, medium: 0, high: 0, critical: 0 });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> {t("au.title")}
        </h1>
        <div className="flex gap-1.5 flex-wrap">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("au.run")}</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">{t("au.remediate")}</button>
          <button className="px-3 py-1 text-xs font-mono bg-warning/20 text-warning rounded border border-warning/30">{t("au.chat")}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-warning">{auditSummary.score}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.health")}</div>
        </div>
        <div className="bg-card border border-destructive/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-destructive">{severitySummary.critical}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.critical")}</div>
        </div>
        <div className="bg-card border border-warning/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-warning">{severitySummary.high}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.high")}</div>
        </div>
        <div className="bg-card border border-info/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-info">{severitySummary.medium}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.medium")}</div>
        </div>
        <div className="bg-card border border-success/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-success">{auditSummary.resolved}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.resolved")}</div>
        </div>
        <div className="bg-card border border-warning/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-warning">{blockingGateCount}</div>
          <div className="text-[10px] text-muted-foreground">active gates</div>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
        <div>
          <div className="text-xs font-semibold text-warning uppercase">Go / No-Go: {currentVerdict === "no_go" || currentVerdict === "fail" ? "NO-GO" : "GO"}</div>
          <div className="text-[10px] text-muted-foreground">{t("au.resolve")} {severitySummary.critical} {t("au.before_release")} • {activeBlockers.length} active workflow blockers</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3">
        <h2 className="text-xs font-semibold text-foreground mb-2">Audit-driven blockers</h2>
        <div className="space-y-1.5">
          {activeBlockers.slice(0, 6).map((blocker) => (
            <div key={blocker.id} className="border border-warning/30 bg-warning/5 rounded p-2 text-[10px]">
              <div className="text-foreground font-mono">{blocker.entityType}:{blocker.entityId} • {blocker.blockingSeverity}</div>
              <div className="text-muted-foreground">Blocked by {blocker.sourceAuditorType} auditor via {blocker.linkedFindingIds.join(", ")}.</div>
              <div className="text-primary">Unblock: {blocker.unblockCondition}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1 mb-3 text-[10px]">
          <div className="text-muted-foreground">critical <span className="text-destructive font-mono">{severitySummary.critical}</span></div>
          <div className="text-muted-foreground">high <span className="text-warning font-mono">{severitySummary.high}</span></div>
          <div className="text-muted-foreground">medium <span className="text-info font-mono">{severitySummary.medium}</span></div>
          <div className="text-muted-foreground">low <span className="text-foreground font-mono">{severitySummary.low}</span></div>
          <div className="text-muted-foreground">active task <span className="text-foreground font-mono">{workspaceState.currentTask}</span></div>
        </div>
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Severity filters</div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActiveSeverity("all")} className={`px-2 py-1 text-[10px] rounded border ${activeSeverity === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground"}`}>all</button>
          {findingSeverityOrder.map((severity) => (
            <button
              key={severity}
              onClick={() => setActiveSeverity(severity)}
              className={`px-2 py-1 text-[10px] rounded border capitalize ${activeSeverity === severity ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground"}`}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3">
        <div className="space-y-2">
          {filteredFindings.map((finding) => {
            const sev = severityStyles[finding.severity];
            return (
              <div
                key={finding.id}
                className={`border rounded-lg p-3 ${sev.bg} cursor-pointer hover:opacity-90 transition ${selectedFindingId === finding.id ? "ring-1 ring-primary" : ""}`}
                onClick={() => setSelectedFindingId(finding.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {sev.icon}
                    <div>
                      <div className="text-xs font-semibold text-foreground">{finding.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{finding.auditorType} auditor • {finding.scope.label}</div>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${statusBadge[finding.status]}`}>{finding.status}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 ml-5">{finding.description}</p>
                <div className="flex items-center gap-1 mt-1.5 ml-5">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-primary">{finding.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-3">
            <h2 className="text-xs font-semibold text-foreground mb-2">Evidence drawer</h2>
            {selectedFinding ? (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground">{selectedFinding.id} • {selectedFinding.title}</div>
                {selectedFinding.evidence.map((item) => (
                  <div key={item.id} className="border border-border rounded p-2">
                    <div className="text-[10px] font-semibold text-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> {item.title}</div>
                    <div className="text-[10px] text-muted-foreground">{item.type} • {item.reference}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">Select a finding to inspect evidence references.</div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-3">
            <h2 className="text-xs font-semibold text-foreground mb-2">Run history</h2>
            <div className="space-y-1.5">
              {(recentRuns.length > 0 ? recentRuns : auditRuns.slice(0, 6)).map((run) => (
                <div key={run.id} className="flex items-center justify-between text-[10px] border border-border rounded px-2 py-1.5">
                  <span className="text-foreground capitalize">{run.auditorType} • {run.runState}</span>
                  <span className="text-muted-foreground">{run.verdict} ({run.findingCount})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3">
            <h2 className="text-xs font-semibold text-foreground mb-2">Auditor coverage</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {auditors.map((auditor) => (
                <div key={auditor.id} className="border border-border rounded p-2 text-[10px]">
                  <div className="text-foreground">{auditor.name}</div>
                  <div className="text-muted-foreground uppercase">{auditor.verdict} • {auditor.findingCount} findings</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
