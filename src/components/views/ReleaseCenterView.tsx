import { releaseGates, releaseVerdict } from "@/data/mock-release";
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from "lucide-react";

const gateIcons: Record<string, React.ReactNode> = {
  passed: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
};

export function ReleaseCenterView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Release Center
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-muted text-muted-foreground rounded cursor-not-allowed" disabled>
          Deploy to Production
        </button>
      </div>

      {/* Verdict */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="text-sm font-bold text-destructive uppercase">Release Blocked</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">Blockers</span><div className="font-mono text-lg text-destructive">{releaseVerdict.blockers}</div></div>
          <div><span className="text-muted-foreground">High Issues</span><div className="font-mono text-lg text-warning">{releaseVerdict.highIssues}</div></div>
          <div><span className="text-muted-foreground">Gates Passed</span><div className="font-mono text-lg text-success">{releaseVerdict.passedGates}/{releaseVerdict.totalGates}</div></div>
          <div><span className="text-muted-foreground">Rollback</span><div className="font-mono text-lg text-success">Ready</div></div>
        </div>
      </div>

      {/* Gates */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-foreground">Release Gates</h2>
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

      {/* Signoff */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Signoff State</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Technical Lead</span><span className="text-warning font-mono">Pending</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Security Review</span><span className="text-destructive font-mono">Blocked</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">QA Sign-off</span><span className="text-muted-foreground font-mono">Waiting</span></div>
        </div>
      </div>
    </div>
  );
}
