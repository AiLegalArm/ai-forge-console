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

  const contextHeader = (
    <SectionCard title="Current Context">
      <InfoRow label="Project" value={workspaceState.currentProject} />
      <InfoRow label="Task" value={workspaceState.currentTask} />
      <InfoRow label="Chat / Review" value={`${workspaceState.currentConversationType} · ${workspaceState.currentReviewId ?? "no-review"}`} />
      <InfoRow label="Provider / Runtime" value={`${workspaceState.activeProvider} · ${workspaceState.activeBackend}`} />
      <InfoRow label="Release readiness" value={workspaceState.releaseReadinessStatus} />
    </SectionCard>
  );

  switch (tab as TabId) {
    case "preview": {
      const previewUrl = workspaceState.releaseControl.deployments.find((dep) => dep.environment === "preview")?.previewTarget ?? "localhost:5173";
      const previewStatus = workspaceState.localShell.runtime.previewRuntime;
      const previewTone: Tone = previewStatus === "healthy" ? "ok" : previewStatus === "down" ? "danger" : "warn";
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Preview Surface">
            <div className="aspect-video rounded border border-border bg-background/60 flex items-center justify-center">
              <span className="text-[11px] font-mono text-muted-foreground">{previewUrl}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Status: ${previewStatus}`} tone={previewTone} />
              <StatusChip label={`Target: ${workspaceState.deploymentMode}`} tone="neutral" />
              <StatusChip label={`Branch: ${workspaceState.currentBranch}`} tone="neutral" />
            </div>
            <InfoRow label="Active task context" value={activeTask?.id ?? "No linked task"} />
            <InfoRow label="Last refresh" value={formatTime(workspaceState.localShell.terminal.output[0]?.timestampIso)} />
            <InfoRow label="Live metadata" value={workspaceState.localShell.project.runtimeResourcesAvailable ? "live-capable" : "placeholder"} />
          </SectionCard>
          {!previewUrl ? (
            <EmptyPanelState
              title="Preview is not linked"
              detail="Use this panel to validate current branch behavior before review and release."
              missing="Preview target URL"
              action="Trigger preview deploy from Deploy tab or run local preview runtime."
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

      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Browser Session">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Scenario: ${session.scenario.title}`} tone="neutral" />
              <StatusChip label={`Session: ${session.sessionState}`} tone={browserTone} />
              <StatusChip label={`Run: ${session.runState}`} tone={browserTone} />
            </div>
            <InfoRow label="Step progress" value={`${passedSteps}/${totalSteps} passed`} />
            <InfoRow label="Evidence captured" value={`${session.evidenceReferences.length} refs`} />
            <InfoRow label="Console / Network" value={`${session.consoleEvents.length} console · ${session.networkEvents.length} network`} />
            <InfoRow label="Latest result" value={session.executionLog.at(-1)?.summary ?? "No run events"} />
            <InfoRow label="Last failure" value={session.failureState.message ?? "none"} />
          </SectionCard>
          {!session.scenario.id ? (
            <EmptyPanelState
              title="No browser scenario running"
              detail="Use browser runs to produce QA evidence linked to active review and release gates."
              missing="Scenario + session"
              action="Start a browser scenario from the task chat to populate this panel."
            />
          ) : null}
          {failedStep ? <p className="text-[11px] text-warning">Blocked step: {failedStep.label}</p> : null}
        </div>
      );
    }
    case "design": {
      const session = workspaceState.designSession;
      const blockers = session.findings.filter((finding) => finding.blocking).length;
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Design Session">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Session: ${session.id}`} tone="neutral" />
              <StatusChip label={`State: ${session.state}`} tone={session.state === "approved" ? "ok" : "warn"} />
              <StatusChip label={`Target: ${session.brief.targetScreen}`} tone="neutral" />
            </div>
            <InfoRow label="Design brief" value={session.brief.title} />
            <InfoRow label="Component map" value={`${session.componentMap.length} mapped components`} />
            <InfoRow label="Token handoff" value={`${session.tokenHandoff.designTokens.length} tokens · ${session.tokenHandoff.handoffNotes.length} notes`} />
            <InfoRow label="Findings" value={`${session.findings.length} total · ${blockers} blocking`} />
            <InfoRow label="Task relation" value={activeTask?.id ?? session.componentMap[0]?.linkedTaskId ?? "No task linked"} />
            <InfoRow label="Updated" value={formatTime(session.updatedAtIso)} />
          </SectionCard>
        </div>
      );
    }
    case "deploy": {
      const deployments = workspaceState.releaseControl.deployments;
      const latest = deployments[0];
      const preview = deployments.find((deployment) => deployment.environment === "preview");
      const production = deployments.find((deployment) => deployment.environment === "production");
      const warnings = deployments.filter((deployment) => deployment.status === "blocked" || deployment.status === "failed");
      return (
        <div className="space-y-2.5">
          {contextHeader}
          <SectionCard title="Deployment State">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip label={`Latest: ${latest?.status ?? "none"}`} tone={latest?.status === "blocked" ? "danger" : "warn"} />
              <StatusChip label={`Preview: ${preview?.status ?? "none"}`} tone={preview?.status === "preview_ready" ? "ok" : "warn"} />
              <StatusChip label={`Prod readiness: ${workspaceState.releaseReadinessStatus}`} tone={workspaceState.releaseReadinessStatus === "go" ? "ok" : "warn"} />
            </div>
            <InfoRow label="Rollback availability" value={production?.rollbackAvailable ? "available" : "not available"} />
            <InfoRow label="Linked release" value={activeCandidate?.label ?? "No active release candidate"} />
            <InfoRow label="Current blocker" value={production?.blockedReason ?? "none"} />
          </SectionCard>
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
            <InfoRow label="Current assignment" value={`${current?.name ?? "none"} → ${current?.targetEnvironment ?? "unassigned"}`} />
            <InfoRow label="Prod / Preview relation" value={`${domains.filter((d) => d.targetEnvironment === "production").length} prod · ${domains.filter((d) => d.targetEnvironment === "preview").length} preview`} />
            <InfoRow label="Domain blockers" value={blocked.length ? blocked.map((domain) => domain.name).join(", ") : "none"} />
          </SectionCard>
          {domains.length === 0 ? (
            <EmptyPanelState
              title="No domains connected"
              detail="This panel tracks readiness between preview and production domains for release-safe routing."
              missing="Domain records"
              action="Connect a domain and verify DNS records to enable assignment checks."
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
            <InfoRow label="Release relation" value={`${workspaceState.currentTask} · ${workspaceState.currentReviewId ?? "no review"}`} />
          </SectionCard>
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
