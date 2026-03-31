import {
  AlertTriangle,
  CheckCircle,
  CircleDot,
  Clipboard,
  Clock,
  ListCheck,
  Package,
  Rocket,
  RotateCcw,
  Shield,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ReleaseOperationsSignalState } from "@/types/release";
import type { WorkspaceRuntimeState } from "@/types/workspace";

const stateIcons: Record<string, React.ReactNode> = {
  go: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  ready: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  warning: <Clock className="h-3.5 w-3.5 text-warning" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  no_go: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const statusTone: Record<ReleaseOperationsSignalState, string> = {
  ready: "text-success",
  warning: "text-warning",
  blocked: "text-destructive",
};

export function ReleaseCenterView({ workspaceState }: { workspaceState: WorkspaceRuntimeState }) {
  const { t } = useI18n();
  const releaseControlState = workspaceState.releaseControl;
  const activeCandidate = releaseControlState.releaseCandidates.find((candidate) => candidate.id === releaseControlState.activeCandidateId);
  const operations = releaseControlState.operationsPanel;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> {t("rc.title")}
        </h1>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="text-sm font-bold text-destructive uppercase">{operations.decisionSurface.status}</span>
          <span className="text-[11px] text-muted-foreground">{operations.decisionSurface.summary}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">Blockers</span><div className="font-mono text-lg text-destructive">{operations.blockerSummary.total}</div></div>
          <div><span className="text-muted-foreground">Critical blockers</span><div className="font-mono text-lg text-destructive">{operations.blockerSummary.critical}</div></div>
          <div><span className="text-muted-foreground">Approvals missing</span><div className="font-mono text-lg text-warning">{operations.approvalSummary.missing.length}</div></div>
          <div><span className="text-muted-foreground">Execution failures</span><div className="font-mono text-lg text-warning">{operations.decisionSurface.unresolvedExecutionFailures}</div></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-xs font-semibold text-foreground">Current release candidate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Candidate</span><span className="font-mono">{operations.candidate.label}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Branch</span><span className="font-mono">{operations.candidate.linkage.branch}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Task</span><span className="font-mono">{operations.candidate.linkage.taskId ?? "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Review</span><span className="font-mono">{operations.candidate.linkage.reviewId ?? "—"}</span></div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Deploy readiness</span><span className={`font-mono uppercase ${statusTone[operations.deployReadiness.status]}`}>{operations.deployReadiness.status}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Domain readiness</span><span className={`font-mono uppercase ${statusTone[operations.domainReadiness.status]}`}>{operations.domainReadiness.status}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Rollback readiness</span><span className={`font-mono uppercase ${statusTone[operations.rollbackReadiness.status]}`}>{operations.rollbackReadiness.status}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Review state</span><span className="font-mono">{operations.reviewReadiness.state}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Approval collection</h3>
          <div className="text-xs text-muted-foreground">Required: {operations.approvalSummary.required.length} • Completed: {operations.approvalSummary.completed.length} • Missing: {operations.approvalSummary.missing.length}</div>
          <div className="space-y-1 max-h-48 overflow-auto">
            {operations.approvalSummary.required.map((approval) => (
              <div key={approval.approvalId} className="rounded border border-border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{approval.title}</span>
                  <span className={`font-mono uppercase ${approval.status === "approved" ? "text-success" : "text-warning"}`}>{approval.status}</span>
                </div>
                <div className="text-muted-foreground">{approval.category} • {approval.requestedBy}</div>
                <div className="text-muted-foreground">For: {approval.relation}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-primary" /> Audit and review state</h3>
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Audit verdict</span><span className="font-mono uppercase">{operations.auditSummary.verdict}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Active blockers</span><span className="font-mono text-destructive">{operations.auditSummary.activeBlockers}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Unresolved findings</span><span className="font-mono">{operations.auditSummary.unresolvedFindings}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Review readiness</span><span className={`font-mono uppercase ${statusTone[operations.reviewReadiness.status]}`}>{operations.reviewReadiness.status}</span></div>
          </div>
          <div className="space-y-1">
            {operations.inspection.auditResults.map((result) => (
              <div key={result} className="text-[11px] text-muted-foreground">• {result}</div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-2"><Rocket className="h-3.5 w-3.5 text-primary" /> Deploy readiness surface</h3>
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Preview deploy</span><span className="font-mono">{operations.deployReadiness.previewStatus}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Production deploy</span><span className="font-mono">{operations.deployReadiness.productionStatus}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Rollout state</span><span className="font-mono">{operations.deployReadiness.rolloutState}</span></div>
          </div>
          {operations.deployReadiness.blockers.map((blocker) => (
            <div key={blocker} className="text-[11px] text-destructive">• {blocker}</div>
          ))}
          {operations.deployReadiness.dependencyState.map((dependency) => (
            <div key={dependency} className="text-[11px] text-muted-foreground">◦ {dependency}</div>
          ))}
        </section>

        <section className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-semibold flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5 text-primary" /> Rollback readiness surface</h3>
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Availability</span><span className="font-mono uppercase">{operations.rollbackReadiness.availability}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Rollback target</span><span className="font-mono">{operations.rollbackReadiness.rollbackTarget ?? "none"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Fallback planning</span><span className="font-mono">{operations.rollbackReadiness.fallbackPlanRequired ? "required" : "not required"}</span></div>
          </div>
          <p className="text-[11px] text-muted-foreground">{operations.rollbackReadiness.summary}</p>
        </section>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-xs font-semibold text-foreground">Release candidate inspection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-medium text-foreground mb-1">Tasks/Subtasks</div>
            {operations.inspection.tasks.concat(operations.inspection.subtasks).slice(0, 8).map((item) => (
              <div key={item.id} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CircleDot className="h-3 w-3" /> {item.id} · {item.status}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[11px] font-medium text-foreground mb-1">Evidence + traces</div>
            {operations.inspection.evidence.slice(0, 4).map((evidence) => (
              <div key={evidence.evidenceId} className="text-[11px] text-muted-foreground">• {evidence.title} ({evidence.severity}{evidence.blocking ? ", blocking" : ""})</div>
            ))}
            {operations.inspection.executionTraces.slice(0, 3).map((trace) => (
              <div key={trace.traceId} className="text-[11px] text-muted-foreground">◦ {trace.traceId}: {trace.outcome}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Go / No-Go decision surface</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div><span className="text-muted-foreground">Decision</span><div className="font-mono uppercase text-destructive">{operations.decisionSurface.status}</div></div>
          <div><span className="text-muted-foreground">Severity</span><div className="font-mono uppercase">{operations.decisionSurface.blockerSeverity}</div></div>
          <div><span className="text-muted-foreground">Activity refs</span><div className="font-mono">{operations.activityLinks.length}</div></div>
          <div><span className="text-muted-foreground">Review/Audit chats</span><div className="font-mono">{operations.reviewChatReferences.length + operations.auditChatReferences.length}</div></div>
        </div>
        <div className="mt-2 space-y-1">
          {operations.decisionSurface.blockers.slice(0, 5).map((blocker) => (
            <div key={blocker} className="text-[11px] text-destructive">• {blocker}</div>
          ))}
          {operations.decisionSurface.warnings.slice(0, 3).map((warning) => (
            <div key={warning} className="text-[11px] text-warning">⚠ {warning}</div>
          ))}
          {operations.decisionSurface.operatorOverrides.map((override) => (
            <div key={override} className="text-[11px] text-muted-foreground">Override: {override}</div>
          ))}
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
        </div>
      ) : null}
    </div>
  );
}
