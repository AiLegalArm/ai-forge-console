import { buildAuditBlockers } from "@/lib/workflow-gating";
import type {
  AuditEvidenceReference,
  AuditGateDecision,
  AuditRunGroup,
  AuditorControlState,
  AuditorFinding,
  AuditorProfile,
  AuditorRun,
  AuditorType,
  FindingSeverity,
  SeveritySummary,
} from "@/types/audits";
import type { BrowserSession } from "@/types/agents";
import type { EvidenceFlowState } from "@/types/evidence";
import type { LocalInferenceRuntimeState } from "@/types/local-inference";
import type { LocalShellWorkspaceState } from "@/types/local-shell";
import type { ReleaseControlState } from "@/types/release";
import type { WorkflowState } from "@/types/workflow";
import type { WorkspaceRepositoryState } from "@/types/workspace";

interface AuditorEngineInput {
  workflow: WorkflowState;
  localShell: LocalShellWorkspaceState;
  localInference: LocalInferenceRuntimeState;
  browserSession: BrowserSession;
  evidenceFlow: EvidenceFlowState;
  releaseControl: ReleaseControlState;
  repository: WorkspaceRepositoryState;
  currentTaskId?: string;
  currentChatSessionId?: string;
  currentReviewId?: string;
  currentReleaseCandidateId?: string;
}

const AUDITOR_TYPES: readonly AuditorType[] = ["code", "security", "prompt", "tool", "git", "test", "release", "ai"];
const ENGINE_VERSION = "v1-real";

const emptySeverity = (): SeveritySummary => ({ info: 0, low: 0, medium: 0, high: 0, critical: 0 });

const summarize = (findings: AuditorFinding[]): SeveritySummary => findings.reduce((acc, finding) => {
  acc[finding.severity] += 1;
  return acc;
}, emptySeverity());

const evidence = (
  type: AuditEvidenceReference["type"],
  title: string,
  reference: string,
  details?: string,
): AuditEvidenceReference => ({
  id: `ev-${Math.random().toString(36).slice(2, 10)}`,
  type,
  title,
  reference,
  details,
  createdAtIso: new Date().toISOString(),
});

interface FindingDraft {
  title: string;
  description: string;
  severity: FindingSeverity;
  blocking: boolean;
  recommendation: string;
  evidence: AuditEvidenceReference[];
  scopeId?: string;
  scopeLabel?: string;
}

function runAuditor(type: AuditorType, input: AuditorEngineInput): { findings: FindingDraft[]; runState: AuditorRun["runState"] } {
  const findings: FindingDraft[] = [];
  const currentTask = input.workflow.tasks.find((task) => task.id === input.currentTaskId) ?? input.workflow.tasks[0];

  if (type === "code") {
    const latestTraceFailures = input.workflow.executionTraces.filter((trace) => trace.finalResultState === "failed").slice(0, 2);
    if (latestTraceFailures.length > 0) {
      findings.push({
        title: "Execution traces show failed implementation paths",
        description: `Found ${latestTraceFailures.length} failed execution trace(s) linked to active workflow.`,
        severity: "medium",
        blocking: false,
        recommendation: "Address failing steps and rerun implementation traces before review handoff.",
        evidence: latestTraceFailures.map((trace) => evidence("runtime_event", "Execution trace failure", `trace://${trace.traceId}`, trace.error?.message)),
        scopeId: currentTask?.id,
        scopeLabel: currentTask?.title,
      });
    }
    if (input.workflow.tasks.some((task) => task.status === "failed")) {
      findings.push({
        title: "Workflow contains failed task implementation",
        description: "At least one workflow task is marked failed, indicating unresolved code delivery issues.",
        severity: "high",
        blocking: true,
        recommendation: "Resolve failed tasks and regenerate completion evidence before progressing.",
        evidence: [evidence("task", "Failed task state", `task://${input.workflow.tasks.find((task) => task.status === "failed")?.id ?? "unknown"}`)],
      });
    }
  }

  if (type === "security") {
    const riskyCapabilities = input.localShell.capabilities.filter((cap) => cap.risk === "critical" && cap.enabled && !cap.requiresApproval);
    const sensitivePending = input.workflow.approvals.filter((approval) => approval.category === "sensitive_provider_usage" && approval.status !== "approved");
    if (riskyCapabilities.length > 0) {
      findings.push({
        title: "Critical capability enabled without approval guard",
        description: `${riskyCapabilities.length} critical capability gate(s) are enabled without approval requirement.`,
        severity: "critical",
        blocking: true,
        recommendation: "Require approvals for all critical capabilities and enforce least privilege execution.",
        evidence: riskyCapabilities.map((cap) => evidence("runtime_event", `Capability ${cap.capability}`, `runtime://capability/${cap.capability}`, cap.policyReason)),
      });
    }
    if (sensitivePending.length > 0) {
      findings.push({
        title: "Sensitive provider approvals still pending",
        description: "Security-relevant provider actions are pending approval.",
        severity: "high",
        blocking: true,
        recommendation: "Resolve sensitive provider approvals before continuing guarded workflows.",
        evidence: sensitivePending.map((approval) => evidence("task", approval.title, `approval://${approval.id}`, approval.reason)),
      });
    }
  }

  if (type === "prompt") {
    const conflictingApprovals = input.workflow.approvals.filter((approval) => approval.category === "agent_command_execution" && approval.status === "rejected");
    if (conflictingApprovals.length > 0) {
      findings.push({
        title: "Prompt intent causing rejected agent command requests",
        description: `Detected ${conflictingApprovals.length} rejected agent command approval(s), indicating prompt/policy mismatch.`,
        severity: "medium",
        blocking: true,
        recommendation: "Tighten prompt instructions to align with approval and command safety policy.",
        evidence: conflictingApprovals.map((approval) => evidence("chat", "Rejected command approval", `approval://${approval.id}`, approval.reason)),
      });
    }
  }

  if (type === "tool") {
    const failedCommands = input.localShell.terminal.history.filter((command) => command.state === "failed");
    const riskyCommands = input.localShell.terminal.history.filter((command) => command.classification === "risky" && command.approvalState !== "approved");
    if (failedCommands.length > 0) {
      findings.push({
        title: "Tool execution failures detected",
        description: `${failedCommands.length} terminal command(s) failed in the active runtime.`,
        severity: "medium",
        blocking: failedCommands.some((command) => command.failureReason === "runtime_unavailable"),
        recommendation: "Investigate failed command outputs and rerun after runtime recovery.",
        evidence: failedCommands.slice(0, 4).map((command) => evidence("runtime_event", command.command, `command://${command.id}`, command.failureDetail ?? command.failureReason)),
      });
    }
    if (riskyCommands.length > 0) {
      findings.push({
        title: "Risky commands attempted without approval",
        description: `${riskyCommands.length} risky command(s) were executed or queued without approved state.`,
        severity: "high",
        blocking: true,
        recommendation: "Gate risky commands behind explicit approval and policy validation.",
        evidence: riskyCommands.slice(0, 3).map((command) => evidence("runtime_event", command.command, `command://${command.id}`, command.originReason)),
      });
    }
  }

  if (type === "git") {
    if (!input.repository.connected) {
      findings.push({
        title: "Repository is not connected",
        description: "Git auditor cannot validate branch and sync state because repository connection is missing.",
        severity: "high",
        blocking: true,
        recommendation: "Connect a repository before push/review/release gates.",
        evidence: [evidence("branch", "Repository status", "git://repository/disconnected")],
      });
    }
    if (input.repository.connected && input.repository.clean === false) {
      findings.push({
        title: "Working tree has uncommitted changes",
        description: "Repository reports dirty state while workflow is in gated execution.",
        severity: "medium",
        blocking: true,
        recommendation: "Commit or discard outstanding changes before progressing to release actions.",
        evidence: [evidence("branch", "Working tree dirty", `git://status?branch=${input.repository.branch ?? "unknown"}`)],
      });
    }
    if ((input.repository.behindBy ?? 0) > 0) {
      findings.push({
        title: "Branch is behind remote",
        description: `Current branch is behind remote by ${input.repository.behindBy ?? 0} commit(s).`,
        severity: "medium",
        blocking: false,
        recommendation: "Pull/rebase against remote branch and rerun tests.",
        evidence: [evidence("branch", "Branch sync drift", `git://sync/${input.repository.branch ?? "unknown"}`)],
      });
    }
  }

  if (type === "test") {
    const testFailures = input.localShell.terminal.history.filter((command) => /test|vitest|jest|playwright/i.test(command.command) && command.state === "failed");
    if (testFailures.length > 0) {
      findings.push({
        title: "Automated test command failures",
        description: `${testFailures.length} test command(s) failed in terminal execution history.`,
        severity: "critical",
        blocking: true,
        recommendation: "Fix failing tests and produce passing command evidence.",
        evidence: testFailures.slice(0, 4).map((command) => evidence("quality_signal", "Failed test command", `command://${command.id}`, command.failureDetail ?? `exit ${command.exitCode ?? "unknown"}`)),
      });
    }
    if (input.browserSession.resultState === "failed" || input.browserSession.failureState.state === "failed") {
      findings.push({
        title: "Browser scenario failure impacts QA gate",
        description: `Browser session ${input.browserSession.id} ended in failed state for scenario ${input.browserSession.scenario.title}.`,
        severity: "high",
        blocking: true,
        recommendation: "Resolve browser failure, attach new scenario evidence, and rerun test auditor.",
        evidence: [
          evidence("scenario_trace", "Browser scenario summary", `browser://${input.browserSession.id}/${input.browserSession.scenario.id}`),
          ...input.browserSession.screenshotReferences.slice(0, 2).map((uri, index) => evidence("screenshot", `Browser screenshot ${index + 1}`, uri)),
        ],
      });
    }
  }

  if (type === "release") {
    const activeCandidate = input.releaseControl.releaseCandidates.find((candidate) => candidate.id === input.currentReleaseCandidateId)
      ?? input.releaseControl.releaseCandidates.find((candidate) => candidate.id === input.releaseControl.activeCandidateId)
      ?? input.releaseControl.releaseCandidates[0];

    if (!activeCandidate) {
      findings.push({
        title: "Release candidate missing",
        description: "Release auditor run could not locate an active release candidate.",
        severity: "high",
        blocking: true,
        recommendation: "Create or select a release candidate before release/deploy gating.",
        evidence: [evidence("audit_snapshot", "Release candidate lookup", "release://candidate/missing")],
      });
    } else {
      if (activeCandidate.deploymentState === "blocked" || activeCandidate.finalReadiness === "blocked") {
        findings.push({
          title: "Release candidate blocked by deployment/readiness",
          description: `Candidate ${activeCandidate.id} is ${activeCandidate.deploymentState} with readiness ${activeCandidate.finalReadiness}.`,
          severity: "critical",
          blocking: true,
          recommendation: "Resolve deployment and readiness blockers before go/no-go.",
          evidence: [evidence("quality_signal", "Release candidate state", `release://${activeCandidate.id}`)],
          scopeId: activeCandidate.id,
          scopeLabel: activeCandidate.label,
        });
      }
      if (input.releaseControl.finalDecision.status === "no_go" || input.releaseControl.finalDecision.status === "blocked") {
        findings.push({
          title: "Go/No-Go decision is blocking release",
          description: input.releaseControl.finalDecision.summary,
          severity: "critical",
          blocking: true,
          recommendation: "Address go/no-go blockers and rerun release audit.",
          evidence: [evidence("audit_snapshot", "Release final decision", "release://final-decision", input.releaseControl.finalDecision.blockers.join(" | "))],
          scopeId: activeCandidate?.id,
          scopeLabel: activeCandidate?.label,
        });
      }
    }
  }

  if (type === "ai") {
    const degradedProviders = input.localInference.cloud.status !== "connected" && !input.localInference.ollama.connectionHealthy;
    if (degradedProviders) {
      findings.push({
        title: "Provider routing degraded for AI workflows",
        description: "Both cloud and local providers indicate degraded/unavailable status.",
        severity: "high",
        blocking: true,
        recommendation: "Restore at least one healthy model provider for audit and review continuity.",
        evidence: [evidence("provider_context", "Provider health", "provider://routing/health")],
      });
    }
  }

  return { findings, runState: "completed" };
}

const toVerdict = (findings: AuditorFinding[]): AuditorRun["verdict"] => {
  if (findings.some((finding) => finding.severity === "critical" && finding.blocking)) return "fail";
  if (findings.some((finding) => finding.blocking)) return "no_go";
  if (findings.length > 0) return "warning";
  return "pass";
};

const gateForStage = (stage: AuditGateDecision["stage"], findings: AuditorFinding[]): AuditGateDecision => {
  const stageAuditors: Record<AuditGateDecision["stage"], AuditorType[]> = {
    push_readiness: ["code", "git", "tool", "security"],
    review_readiness: ["security", "prompt", "test"],
    merge_readiness: ["code", "git", "test", "security"],
    release_readiness: ["release", "test", "security", "prompt"],
    deploy_readiness: ["release", "security", "tool"],
  };

  const stageFindings = findings.filter((finding) => stageAuditors[stage].includes(finding.auditorType) && finding.blocking && finding.status === "open");
  const hasCritical = stageFindings.some((finding) => finding.severity === "critical");
  const verdict: AuditGateDecision["verdict"] = stageFindings.length === 0 ? "go" : hasCritical ? "no_go" : "not_ready";

  return {
    stage,
    verdict,
    blockingFindingIds: stageFindings.map((finding) => finding.id),
    blockedByAuditorTypes: [...new Set(stageFindings.map((finding) => finding.auditorType))],
    rationale:
      stageFindings.length === 0
        ? `${stage} passed with no active blocking findings.`
        : `${stage} blocked by ${stageFindings.length} finding(s): ${stageFindings.map((finding) => finding.id).join(", ")}`,
    updatedAtIso: new Date().toISOString(),
  };
};

export function buildAuditorControlStateFromSignals(input: AuditorEngineInput): AuditorControlState {
  const nowIso = new Date().toISOString();
  const findings: AuditorFinding[] = [];
  const runs: AuditorRun[] = [];
  const auditors: AuditorProfile[] = [];

  AUDITOR_TYPES.forEach((type) => {
    const startedAtIso = new Date().toISOString();
    const result = runAuditor(type, input);
    const auditorId = `aud-${type}`;

    const typeFindings = result.findings.map((finding, index) => ({
      id: `AF-${type.toUpperCase()}-${ENGINE_VERSION}-${index + 1}`,
      title: finding.title,
      description: finding.description,
      auditorType: type,
      severity: finding.severity,
      blocking: finding.blocking,
      scope: {
        scopeType: type === "release" ? "release_candidate" : type === "git" ? "branch" : type === "test" ? "review" : "task",
        scopeId: finding.scopeId ?? input.currentTaskId ?? "workspace-default",
        label: finding.scopeLabel ?? (type === "release" ? "Release candidate" : "Active workflow"),
      },
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      linked: {
        taskId: input.currentTaskId,
        chatSessionId: input.currentChatSessionId,
        reviewId: input.currentReviewId,
        releaseCandidateId: input.currentReleaseCandidateId,
        branchName: input.repository.branch,
      },
      status: "open",
      createdAtIso: nowIso,
    } satisfies AuditorFinding));

    const missingRequiredInput = (type === "git" && !input.repository.connected) || (type === "release" && !input.currentReleaseCandidateId && input.releaseControl.releaseCandidates.length === 0);
    const verdict = missingRequiredInput ? "not_ready" : toVerdict(typeFindings);
    const runState: AuditorRun["runState"] = missingRequiredInput ? "failed" : result.runState;

    findings.push(...typeFindings);

    runs.push({
      id: `run-${type}-${Date.now()}`,
      auditorId,
      auditorType: type,
      scope: {
        scopeType: type === "release" ? "release_candidate" : type === "git" ? "branch" : "task",
        scopeId: input.currentTaskId ?? "workspace-default",
        label: input.currentTaskId ?? "Active task",
      },
      runState,
      linked: {
        taskId: input.currentTaskId,
        chatSessionId: input.currentChatSessionId,
        reviewId: input.currentReviewId,
        releaseCandidateId: input.currentReleaseCandidateId,
        branchName: input.repository.branch,
      },
      findingIds: typeFindings.map((finding) => finding.id),
      findingCount: typeFindings.length,
      verdict,
      severitySummary: summarize(typeFindings),
      startedAtIso,
      completedAtIso: runState === "running" ? undefined : new Date().toISOString(),
      evidenceReferences: typeFindings.flatMap((finding) => finding.evidence),
    });

    auditors.push({
      id: auditorId,
      type,
      name: `${type.charAt(0).toUpperCase()}${type.slice(1)} Auditor`,
      scope: runs[runs.length - 1].scope,
      runState,
      linked: runs[runs.length - 1].linked,
      findingCount: typeFindings.length,
      verdict,
      severitySummary: summarize(typeFindings),
      lastRunAtIso: nowIso,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      evidenceReferences: typeFindings.flatMap((finding) => finding.evidence).slice(0, 4),
    });
  });

  const runGroups: AuditRunGroup[] = auditors.map((auditor) => {
    const groupedRuns = runs.filter((run) => run.auditorType === auditor.type);
    const groupedFindings = findings.filter((finding) => finding.auditorType === auditor.type);
    return {
      id: `group-auditor-${auditor.type}`,
      dimension: "auditor",
      targetId: auditor.id,
      runIds: groupedRuns.map((run) => run.id),
      findingIds: groupedFindings.map((finding) => finding.id),
      verdict: auditor.verdict,
      severitySummary: summarize(groupedFindings),
      generatedAtIso: nowIso,
    };
  });

  const gateDecisions: AuditGateDecision[] = ["push_readiness", "review_readiness", "merge_readiness", "release_readiness", "deploy_readiness"].map((stage) =>
    gateForStage(stage as AuditGateDecision["stage"], findings),
  );

  const blockers = buildAuditBlockers({ auditors, findings, runs, runGroups, gateDecisions, blockers: [] });

  return { auditors, findings, runs, runGroups, gateDecisions, blockers };
}
