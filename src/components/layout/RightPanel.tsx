import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Eye,
  Globe,
  Link,
  Palette,
  Rocket,
  ShieldCheck,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

type TabId = "preview" | "browser" | "design" | "audit-results" | "deploy" | "domain";
type Tone = "ok" | "warn" | "danger" | "neutral";

interface RightPanelProps {
  activeTab: string;
  onTabChange: (t: string) => void;
  workspaceState: WorkspaceRuntimeState;
  isMobile?: boolean;
  onClose?: () => void;
}

const toneClass: Record<Tone, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  warn: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-surface text-muted-foreground",
};

const formatTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${toneClass[tone]}`}>{label}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded border border-border bg-surface p-2.5 space-y-2">
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function EmptyPanelState({
  title,
  detail,
  missing,
  action,
}: {
  title: string;
  detail: string;
  missing: string;
  action: string;
}) {
  return (
    <div className="rounded border border-dashed border-border p-3 space-y-2 bg-surface/50">
      <div className="flex items-center gap-2 text-foreground">
        <CircleDashed className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
      <p className="text-[11px] text-muted-foreground">Missing: <span className="text-foreground">{missing}</span></p>
      <p className="text-[11px] text-muted-foreground">Next: <span className="text-foreground">{action}</span></p>
    </div>
  );
}

export function RightPanel({ activeTab, onTabChange, workspaceState, isMobile, onClose }: RightPanelProps) {
  const { t } = useI18n();
  const tabs: { id: TabId; icon: typeof Eye; label: string }[] = [
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
  const activeTask =
    workspaceState.workflow.tasks.find((task) => task.title === workspaceState.currentTask) ??
    workspaceState.workflow.tasks.find((task) => task.linkedChatSessionId === workspaceState.currentChatSessionId);
  const activeCandidate = workspaceState.releaseControl.releaseCandidates.find(
    (candidate) => candidate.id === workspaceState.currentReleaseCandidateId,
  );
  const latestTrace = [...workspaceState.workflow.executionTraces].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso))[0];

  const contextHeader = (
    <SectionCard title="Current Context">
      <InfoRow label="Project" value={workspaceState.currentProject} />
      <InfoRow label="Task" value={workspaceState.currentTask} />
      <InfoRow label="Chat / Review" value={`${workspaceState.currentConversationType} · ${workspaceState.currentReviewId ?? "no-review"}`} />
      <InfoRow label="Provider / Runtime" value={`${workspaceState.activeProvider} · ${workspaceState.activeBackend}`} />
      <InfoRow label="Execution trace" value={latestTrace ? `${latestTrace.traceId} · ${latestTrace.summary.outcome}` : "none"} />
      <InfoRow label="Trace provider/model" value={latestTrace ? `${latestTrace.provider ?? "unknown"} / ${latestTrace.model ?? "unknown"}` : "none"} />
      <InfoRow label="Fallback / failure" value={latestTrace ? `${latestTrace.fallbackUsed ? "fallback" : "no-fallback"} · ${latestTrace.error?.type ?? "none"}` : "none"} />
      <InfoRow label="Release readiness" value={workspaceState.releaseReadinessStatus} />
      <InfoRow label="Task status" value={`${workspaceState.currentTaskStatus} · ${workspaceState.currentPhase}`} />
    </SectionCard>
  );

  switch (tab as TabId) {
    case "preview": {
      const previewDeployment = workspaceState.releaseControl.deployments.find((dep) => dep.environment === "preview");
      const previewUrl = previewDeployment?.previewTarget;
      const previewStatus = workspaceState.localShell.runtime.previewRuntime;
      const previewTone: Tone = previewStatus === "healthy" ? "ok" : previewStatus === "down" ? "danger" : "warn";
      const hasPreviewContext = Boolean(previewDeployment || workspaceState.localShell.project.runtimeResourcesAvailable);
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Preview Surface">
            <div className="aspect-video rounded border border-border bg-background/60 flex items-center justify-center">
              <span className="text-[11px] font-mono text-muted-foreground">{previewUrl ?? "Preview target not assigned yet"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Status: ${previewStatus}`} tone={previewTone} />
              <StatusChip label={`Target: ${workspaceState.deploymentMode}`} tone="neutral" />
              <StatusChip label={`Branch: ${workspaceState.currentBranch}`} tone="neutral" />
            </div>
            <InfoRow label="Current preview target" value={previewUrl ?? "not set"} />
            <InfoRow label="Preview deploy status" value={previewDeployment?.status ?? "not deployed"} />
            <InfoRow label="Active project context" value={workspaceState.currentProject} />
            <InfoRow label="Active task context" value={activeTask?.id ?? "No linked task"} />
            <InfoRow label="Last refresh" value={formatTime(workspaceState.localShell.terminal.output[0]?.timestampIso)} />
            <InfoRow label="Last refresh age" value={formatRelativeTime(workspaceState.localShell.terminal.output[0]?.timestampIso)} />
            <InfoRow label="Live metadata" value={workspaceState.localShell.project.runtimeResourcesAvailable ? "live-ready metadata available" : "placeholder metadata only"} />
            <InfoRow label="Review relation" value={workspaceState.currentReviewId ?? "not linked to review"} />
          </SectionCard>
          {!hasPreviewContext ? (
            <EmptyPanelState
              title="Preview workspace is waiting for signal"
              detail="This area validates branch behavior before review, release gates, and domain assignment."
              missing="Preview deploy or active local runtime heartbeat"
              action="Run a preview deploy or start local preview to attach live metadata and status."
            />
          ) : null}
        </div>
      );
    }
    case "browser": {
      const session = workspaceState.browserSession;
      const totalSteps = session.scenario.steps.length;
      const passedSteps = session.scenario.steps.filter((step) => step.status === "passed").length;
      const failedStep = session.scenario.steps.find((step) => step.status === "failed");
      const browserTone: Tone = session.sessionState === "failed" ? "danger" : session.sessionState === "completed" ? "ok" : "warn";
      const latestLog = session.executionLog.at(-1);

      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Browser Session">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Scenario: ${session.scenario.title}`} tone="neutral" />
              <StatusChip label={`Session: ${session.sessionState}`} tone={browserTone} />
              <StatusChip label={`Run: ${session.runState}`} tone={browserTone} />
            </div>
            <InfoRow label="Current browser scenario" value={session.scenario.targetUrl ?? "target URL missing"} />
            <InfoRow label="Current session state" value={`${session.runtimeState} runtime · ${session.resultState} result`} />
            <InfoRow label="Step progress" value={`${passedSteps}/${totalSteps} passed`} />
            <InfoRow label="Evidence captured" value={`${session.evidenceReferences.length} refs`} />
            <InfoRow label="Console / Network" value={`${session.consoleEvents.length} events · ${session.networkEvents.length} requests`} />
            <InfoRow label="Latest result" value={latestLog?.summary ?? "No run events"} />
            <InfoRow label="Latest result age" value={formatRelativeTime(latestLog?.timestampIso)} />
            <InfoRow label="Last failure" value={session.failureState.message ?? "none"} />
            <InfoRow label="Task / review relation" value={`${session.linkedTaskId ?? workspaceState.currentTask} · ${session.linkedChatId ?? workspaceState.currentChatSessionId}`} />
          </SectionCard>
          {!session.scenario.id ? (
            <EmptyPanelState
              title="Browser evidence surface is idle"
              detail="This panel tracks scenario progress, runtime errors, and evidence that can block release."
              missing="Scenario run linked to the active task/review"
              action="Start a browser scenario from chat and attach it to the current review."
            />
          ) : null}
          {failedStep ? <p className="text-[11px] text-warning">Blocked step: {failedStep.label}</p> : null}
        </div>
      );
    }
    case "design": {
      const session = workspaceState.designSession;
      const blockers = session.findings.filter((finding) => finding.blocking).length;
      const mappedTasks = Array.from(new Set(session.componentMap.map((component) => component.linkedTaskId).filter(Boolean)));
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Design Session">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Session: ${session.id}`} tone="neutral" />
              <StatusChip label={`State: ${session.state}`} tone={session.state === "approved" ? "ok" : "warn"} />
              <StatusChip label={`Target: ${session.brief.targetScreen}`} tone="neutral" />
            </div>
            <InfoRow label="Active design session" value={session.id} />
            <InfoRow label="Design brief summary" value={`${session.brief.title} (${session.brief.goals.length} goals)`} />
            <InfoRow label="Component map" value={`${session.componentMap.length} mapped components`} />
            <InfoRow label="Token handoff" value={`${session.tokenHandoff.designTokens.length} tokens · ${session.tokenHandoff.handoffNotes.length} notes`} />
            <InfoRow label="Findings count" value={`${session.findings.length} total · ${blockers} blocking`} />
            <InfoRow label="Workspace / task relation" value={mappedTasks.length ? mappedTasks.join(", ") : activeTask?.id ?? "No task linked"} />
            <InfoRow label="Updated" value={formatTime(session.updatedAtIso)} />
          </SectionCard>
          {session.componentMap.length === 0 ? (
            <EmptyPanelState
              title="Design context has no mapped components"
              detail="Use this panel to connect design intent to implementation and release risk."
              missing="Component map + handoff details for this task"
              action="Capture a design snapshot and add mapped components tied to the active task."
            />
          ) : null}
        </div>
      );
    }
    case "deploy": {
      const deployments = workspaceState.releaseControl.deployments;
      const latest = deployments[0];
      const preview = deployments.find((deployment) => deployment.environment === "preview");
      const production = deployments.find((deployment) => deployment.environment === "production");
      const warnings = deployments.filter((deployment) => deployment.status === "blocked" || deployment.status === "failed");
      const releaseLinked = activeCandidate?.linkedDeploymentId === latest?.id || activeCandidate?.linkedDeploymentId === production?.id;
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Deployment State">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Latest: ${latest?.status ?? "none"}`} tone={latest?.status === "blocked" ? "danger" : "warn"} />
              <StatusChip label={`Preview: ${preview?.status ?? "none"}`} tone={preview?.status === "preview_ready" ? "ok" : "warn"} />
              <StatusChip label={`Prod readiness: ${workspaceState.releaseReadinessStatus}`} tone={workspaceState.releaseReadinessStatus === "go" ? "ok" : "warn"} />
            </div>
            <InfoRow label="Latest deploy state" value={`${latest?.environment ?? "none"} · ${latest?.status ?? "none"}`} />
            <InfoRow label="Preview deploy status" value={`${preview?.status ?? "missing"}${preview?.previewTarget ? ` @ ${preview.previewTarget}` : ""}`} />
            <InfoRow label="Production readiness" value={workspaceState.releaseReadinessStatus} />
            <InfoRow label="Rollback availability" value={production?.rollbackAvailable ? "available" : "not available"} />
            <InfoRow label="Linked release" value={activeCandidate?.label ?? "No active release candidate"} />
            <InfoRow label="Release link state" value={releaseLinked ? "deployment linked to current release" : "release linkage missing"} />
            <InfoRow label="Current blocker" value={production?.blockedReason ?? "none"} />
          </SectionCard>
          {deployments.length === 0 ? (
            <EmptyPanelState
              title="No deployment records in this workspace"
              detail="This panel reflects preview/prod progress and rollback posture for the active release candidate."
              missing="Deploy run history linked to active branch/release"
              action="Trigger a preview deploy from the task flow, then request production readiness checks."
            />
          ) : null}
          {warnings.length > 0 ? (
            <div className="rounded border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
              {warnings.length} deployment warnings/blockers impacting release flow.
            </div>
          ) : null}
        </div>
      );
    }
    case "domain": {
      const domains = workspaceState.releaseControl.domains;
      const current = domains[0];
      const blocked = domains.filter((domain) => domain.assignmentState === "blocked" || domain.errors.length > 0);
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Domain Routing">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Connection: ${workspaceState.repository.connectionState ?? "local"}`} tone={workspaceState.repository.connected ? "ok" : "neutral"} />
              <StatusChip label={`Verification: ${current?.verificationState ?? "unconfigured"}`} tone={current?.verificationState === "verified" ? "ok" : "warn"} />
              <StatusChip label={`DNS: ${current?.dnsState ?? "unconfigured"}`} tone={current?.dnsState === "verified" ? "ok" : "warn"} />
            </div>
            <InfoRow label="Domain connection state" value={workspaceState.repository.connected ? "repository-linked domain flow" : "local-only workspace"} />
            <InfoRow label="Verification state" value={current?.verificationState ?? "unconfigured"} />
            <InfoRow label="DNS status" value={current?.dnsState ?? "unconfigured"} />
            <InfoRow label="Current assignment" value={`${current?.name ?? "none"} → ${current?.targetEnvironment ?? "unassigned"}`} />
            <InfoRow label="Prod / Preview relation" value={`${domains.filter((d) => d.targetEnvironment === "production").length} prod · ${domains.filter((d) => d.targetEnvironment === "preview").length} preview`} />
            <InfoRow label="Domain blockers" value={blocked.length ? blocked.map((domain) => domain.name).join(", ") : "none"} />
            <InfoRow label="Release relation" value={activeCandidate?.label ?? "not tied to active release"} />
          </SectionCard>
          {domains.length === 0 ? (
            <EmptyPanelState
              title="Domain routing is unconfigured"
              detail="This panel keeps preview and production assignment status visible before promoting a release."
              missing="Verified domain + assignment targets"
              action="Connect domain records, complete DNS verification, and bind to active deploy."
            />
          ) : null}
        </div>
      );
    }
    case "audit-results": {
      const findings = workspaceState.auditors.findings;
      const summary = findings.reduce((acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
      const blockers = findings.filter((finding) => finding.blocking);
      const latestFinding = findings[0];
      const noGo = workspaceState.auditors.gateDecisions.some((gate) => gate.verdict === "no_go" || gate.verdict === "not_ready");
      const latestGate = workspaceState.auditors.gateDecisions.at(-1);

      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Audit Summary">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Go / No-Go influence</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                {noGo ? <AlertTriangle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                {noGo ? "No-Go pressure" : "Go-ready"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <div className="rounded border border-destructive/30 bg-destructive/10 p-1.5">C {summary.critical}</div>
              <div className="rounded border border-warning/30 bg-warning/10 p-1.5">H {summary.high}</div>
              <div className="rounded border border-info/30 bg-info/10 p-1.5">M {summary.medium}</div>
            </div>
            <InfoRow label="Blockers" value={`${blockers.length} blocking findings`} />
            <InfoRow label="Latest finding" value={latestFinding ? `${latestFinding.id}: ${latestFinding.title}` : "No findings"} />
            <InfoRow label="Latest gate" value={latestGate ? `${latestGate.stage} · ${latestGate.verdict}` : "no gate updates"} />
            <InfoRow label="Release relation" value={`${workspaceState.currentTask} · ${workspaceState.currentReviewId ?? "no review"} · ${activeCandidate?.id ?? "no-candidate"}`} />
          </SectionCard>
          {findings.length === 0 ? (
            <EmptyPanelState
              title="Audit stream has no findings yet"
              detail="This panel summarizes severity and release impact from current audit runs."
              missing="Audit findings linked to task/review/release"
              action="Run auditors for the active task or review to generate gate signals."
            />
          ) : null}
        </div>
      );
    }
    default:
      return (
        <div className="flex items-center justify-center h-32">
          <span className="text-xs text-muted-foreground font-mono">{tab}</span>
        </div>
      );
  }
}
