import { auditFindings, auditSummary } from "@/data/mock-audits";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

const severityStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: { bg: "bg-destructive/10 border-destructive/20", text: "text-destructive", icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" /> },
  high: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" /> },
  medium: { bg: "bg-info/10 border-info/20", text: "text-info", icon: <Info className="h-3.5 w-3.5 text-info" /> },
  low: { bg: "bg-muted border-border", text: "text-muted-foreground", icon: <Info className="h-3.5 w-3.5 text-muted-foreground" /> },
};

const statusBadge: Record<string, string> = {
  open: "bg-destructive/20 text-destructive",
  "in-progress": "bg-warning/20 text-warning",
  resolved: "bg-success/20 text-success",
  dismissed: "bg-muted text-muted-foreground",
};

export function AuditsView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Audits
        </h1>
        <div className="flex gap-1.5">
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">Run Full Audit</button>
          <button className="px-3 py-1 text-xs font-mono bg-secondary text-secondary-foreground rounded">Remediate All</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-warning">{auditSummary.score}</div>
          <div className="text-[10px] text-muted-foreground">Health Score</div>
        </div>
        <div className="bg-card border border-destructive/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-destructive">{auditSummary.critical}</div>
          <div className="text-[10px] text-muted-foreground">Critical</div>
        </div>
        <div className="bg-card border border-warning/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-warning">{auditSummary.high}</div>
          <div className="text-[10px] text-muted-foreground">High</div>
        </div>
        <div className="bg-card border border-info/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-info">{auditSummary.medium}</div>
          <div className="text-[10px] text-muted-foreground">Medium</div>
        </div>
        <div className="bg-card border border-success/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-bold text-success">{auditSummary.resolved}</div>
          <div className="text-[10px] text-muted-foreground">Resolved</div>
        </div>
      </div>

      {/* Go/No-Go */}
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
        <div>
          <div className="text-xs font-semibold text-warning">NO-GO — Blockers Present</div>
          <div className="text-[10px] text-muted-foreground">Resolve {auditSummary.critical} critical and {auditSummary.high} high findings before release.</div>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {auditFindings.map((f) => {
          const sev = severityStyles[f.severity];
          return (
            <div key={f.id} className={`border rounded-lg p-3 ${sev.bg} cursor-pointer hover:opacity-90 transition`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {sev.icon}
                  <div>
                    <div className="text-xs font-semibold text-foreground">{f.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{f.auditor} • {f.file ? `${f.file}:${f.line}` : "Project-wide"}</div>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${statusBadge[f.status]}`}>{f.status}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-5">{f.description}</p>
              <div className="flex items-center gap-1 mt-1.5 ml-5">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary">{f.suggestion}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
