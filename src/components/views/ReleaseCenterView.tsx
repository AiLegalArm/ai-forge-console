import { releaseControlState } from "@/data/mock-release-control";
import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const stateIcons: Record<string, React.ReactNode> = {
  go: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  ready: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  warning: <Clock className="h-3.5 w-3.5 text-warning" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  no_go: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function ReleaseCenterView() {
  const { t } = useI18n();
  const activeCandidate = releaseControlState.releaseCandidates.find((candidate) => candidate.id === releaseControlState.activeCandidateId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> {t("rc.title")}
        </h1>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="text-sm font-bold text-destructive uppercase">{releaseControlState.finalDecision.status}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">Blockers</span><div className="font-mono text-lg text-destructive">{releaseControlState.finalDecision.blockers.length}</div></div>
          <div><span className="text-muted-foreground">Warnings</span><div className="font-mono text-lg text-warning">{releaseControlState.finalDecision.warnings.length}</div></div>
          <div><span className="text-muted-foreground">Approvals pending</span><div className="font-mono text-lg text-warning">{releaseControlState.finalDecision.approvalsPending.length}</div></div>
          <div><span className="text-muted-foreground">Rollback-ready deploys</span><div className="font-mono text-lg text-success">{releaseControlState.deployments.filter((deployment) => deployment.rollbackAvailable).length}</div></div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-foreground">Release candidates</h2>
        {releaseControlState.releaseCandidates.map((candidate) => (
          <div key={candidate.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stateIcons[candidate.finalReadiness]}
              <span className="text-xs font-medium text-foreground">{candidate.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{candidate.finalReadiness} • {candidate.auditVerdict}</span>
          </div>
        ))}
      </div>

      {activeCandidate ? (
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xs font-semibold text-foreground mb-2">Current release linkage</h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Branch</span><span className="text-foreground font-mono">{activeCandidate.linkedBranch}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Review</span><span className="text-foreground font-mono">{activeCandidate.reviewState}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Deploy state</span><span className="text-warning font-mono">{activeCandidate.deploymentState}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Domain state</span><span className="text-warning font-mono">{activeCandidate.domainState}</span></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
