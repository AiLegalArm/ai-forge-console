import { Package, CheckCircle, XCircle, Clock, AlertTriangle, Shield, ClipboardList, Rocket, Undo2, ListChecks } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

const stateIcons: Record<string, React.ReactNode> = {
  go: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  ready: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  warning: <Clock className="h-3.5 w-3.5 text-warning" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  no_go: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function ReleaseCenterView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const releaseControlState = workspaceState.releaseControl;
  const activeCandidate = releaseControlState.releaseCandidates.find((candidate) => candidate.id === releaseControlState.activeCandidateId);
  const operations = releaseControlState.operations;
  const inspection = activeCandidate ? operations.inspections[activeCandidate.id] : undefined;

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
          <span className="text-sm font-bold text-destructive uppercase">{operations.goNoGo.status}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">Blockers</span><div className="font-mono text-lg text-destructive">{operations.blockerSummary.total}</div></div>
          <div><span className="text-muted-foreground">Warnings</span><div className="font-mono text-lg text-warning">{operations.goNoGo.warnings.length}</div></div>
          <div><span className="text-muted-foreground">Approvals missing</span><div className="font-mono text-lg text-warning">{operations.approvalSummary.missing.length}</div></div>
          <div><span className="text-muted-foreground">Rollback-ready deploys</span><div className="font-mono text-lg text-success">{releaseControlState.deployments.filter((deployment) => deployment.rollbackAvailable).length}</div></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Release context packet</span>
          <span className="text-primary uppercase">{workspaceState.contextPackets.releaseFlow.target}</span>
        </div>
        <p className="text-muted-foreground">{workspaceState.contextPackets.releaseFlow.summary}</p>
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
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5 text-primary" /> Candidate inspection</h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Current release candidate</span><span className="text-foreground font-mono">{activeCandidate.label}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Branch</span><span className="text-foreground font-mono">{activeCandidate.linkedBranch}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Task linkage</span><span className="text-foreground font-mono">{inspection?.linkedTaskIds.join(", ") ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtasks</span><span className="text-foreground font-mono">{inspection?.linkedSubtaskIds.length ?? 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Review</span><span className="text-foreground font-mono">{activeCandidate.reviewState}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Evidence refs</span><span className="text-foreground font-mono">{inspection?.evidenceReferences.join(", ") ?? "—"}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Review chat / Audit chat</span><span className="text-foreground font-mono">{operations.relatedChatSessions.reviewChatId ?? "—"} / {operations.relatedChatSessions.auditChatId ?? "—"}</span></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <h3 className="font-semibold flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 text-primary" /> Approval collection</h3>
              <div className="flex justify-between"><span className="text-muted-foreground">Required</span><span className="font-mono">{operations.approvalSummary.required.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-mono text-success">{operations.approvalSummary.completed.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Missing</span><span className="font-mono text-warning">{operations.approvalSummary.missing.length}</span></div>
              {operations.approvalSummary.missing.slice(0, 3).map((approval) => (
                <div key={approval.id} className="text-[11px] text-warning">• {approval.title} ({approval.category})</div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <h3 className="font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Blockers & audit</h3>
              <div className="flex justify-between"><span className="text-muted-foreground">Critical blockers</span><span className="font-mono text-destructive">{operations.blockerSummary.critical}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Audit verdict</span><span className="font-mono">{operations.auditSummary.verdict}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Review readiness</span><span className="font-mono">{operations.readiness.review}</span></div>
              {inspection?.executionTraceSummaries.slice(0, 2).map((trace) => (
                <div key={trace.traceId} className="text-[11px] text-muted-foreground">Trace {trace.traceId}: {trace.outcome}</div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <h3 className="font-semibold flex items-center gap-1.5"><Rocket className="h-3.5 w-3.5 text-primary" /> Deploy readiness</h3>
              <div className="flex justify-between"><span className="text-muted-foreground">Preview deploy</span><span className="font-mono">{operations.deployReadiness.previewStatus}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Production deploy</span><span className="font-mono">{operations.deployReadiness.productionStatus}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rollout state</span><span className="font-mono">{operations.deployReadiness.rolloutState}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dependencies</span><span className="font-mono">{operations.deployReadiness.dependencyState}</span></div>
              {operations.deployReadiness.blockers.map((blocker) => (
                <div key={blocker} className="text-[11px] text-destructive">• {blocker}</div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <h3 className="font-semibold flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5 text-primary" /> Rollback readiness</h3>
              <div className="flex justify-between"><span className="text-muted-foreground">Rollback availability</span><span className={`font-mono ${operations.rollbackReadiness.rollbackAvailable ? "text-success" : "text-warning"}`}>{operations.rollbackReadiness.rollbackAvailable ? "available" : "unavailable"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rollback target</span><span className="font-mono">{operations.rollbackReadiness.rollbackTarget ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guidance</span><span className="font-mono">{operations.rollbackReadiness.recommendedAction}</span></div>
              {operations.rollbackReadiness.notes.map((note) => (
                <div key={note} className="text-[11px] text-muted-foreground">• {note}</div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-xs">
            <h3 className="font-semibold flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-primary" /> Final go / no-go decision</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Decision state</span>
              <span className={`font-mono uppercase ${operations.goNoGo.status === "go" ? "text-success" : "text-destructive"}`}>{operations.goNoGo.status}</span>
            </div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Unresolved execution failures</span><span className="font-mono text-warning">{operations.decisionFactors.unresolvedExecutionFailures}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Operator override</span><span className="font-mono">{operations.decisionFactors.overrideApplied ? "applied" : "none"}</span></div>
            <div className="text-muted-foreground">{operations.goNoGo.summary}</div>
            <div className="space-y-1">
              {operations.goNoGo.noGoSignals.slice(0, 4).map((signal) => (
                <div key={signal} className="text-[11px] text-destructive">• {signal}</div>
              ))}
              {operations.goNoGo.goSignals.slice(0, 3).map((signal) => (
                <div key={signal} className="text-[11px] text-success">✓ {signal}</div>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground">Activity references: {operations.relatedActivityEventIds.slice(0, 5).join(", ")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
