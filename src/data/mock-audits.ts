import type {
  AuditBlockerCondition,
  AuditEvidenceReference,
  AuditGateDecision,
  AuditorControlState,
  AuditorFinding,
  AuditorProfile,
  AuditorRun,
  AuditRunGroup,
  FindingSeverity,
  SeveritySummary,
} from "@/types/audits";
import { buildAuditBlockers } from "@/lib/workflow-gating";

const nowIso = "2026-03-29T10:49:00.000Z";

const emptySeveritySummary = (): SeveritySummary => ({
  info: 0,
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
});

const summarizeSeverity = (findings: AuditorFinding[]): SeveritySummary =>
  findings.reduce((summary, finding) => {
    summary[finding.severity] += 1;
    return summary;
  }, emptySeveritySummary());

const evidence = (id: string, type: AuditEvidenceReference["type"], title: string, reference: string, details?: string): AuditEvidenceReference => ({
  id,
  type,
  title,
  reference,
  details,
  createdAtIso: nowIso,
});

export const auditFindings: AuditorFinding[] = [
  {
    id: "AF-BROWSER-211",
    title: "Invite modal hides error state on retry",
    description: "Browser Agent found retry flow where toast disappears without preserving inline error details, preventing user recovery.",
    auditorType: "test",
    severity: "high",
    blocking: true,
    scope: { scopeType: "task", scopeId: "subtask-rbac-frontend-browser", label: "Frontend invite browser validation" },
    evidence: [
      evidence("ev-browser-trace-211", "scenario_trace", "Retry flow trace", "artifact://browser/traces/invite-retry.json"),
      evidence("ev-browser-shot-211", "screenshot", "Toast disappears screenshot", "artifact://browser/screens/invite-retry.png"),
    ],
    recommendation: "Keep inline error state mounted until retry response succeeds and add browser assertion for failed retry path.",
    linked: { taskId: "task-rbac-exec", chatSessionId: "agent-session-1", reviewId: "pr-rbac-42" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-CODE-101",
    title: "Duplicate RBAC mapper in API and UI",
    description: "Code Auditor detected duplicated role-to-permission mapping logic drifting between backend policy checks and frontend guards.",
    auditorType: "code",
    severity: "medium",
    blocking: false,
    scope: { scopeType: "task", scopeId: "task-rbac-exec", label: "Implement RBAC backend + frontend" },
    evidence: [
      evidence("ev-code-file-1", "file", "Duplicated role map", "src/features/rbac/role-map.ts:1-87"),
      evidence("ev-code-file-2", "file", "Duplicate UI role map", "src/components/rbac/RoleGuard.tsx:10-74"),
    ],
    recommendation: "Extract role mapping into a shared domain module consumed by API middleware and UI guard components.",
    linked: { taskId: "task-rbac-exec", chatSessionId: "agent-session-1", branchName: "feat/rbac-task-rbac-exec", reviewId: "pr-rbac-42" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-SEC-014",
    title: "Invite endpoint permission scope too broad",
    description: "Security Auditor found the invite endpoint allows service-role token scope broader than required for org-admin invites.",
    auditorType: "security",
    severity: "critical",
    blocking: true,
    scope: { scopeType: "branch", scopeId: "feat/rbac-task-rbac-exec", label: "feat/rbac-task-rbac-exec" },
    evidence: [
      evidence("ev-sec-task", "task", "Task runtime snapshot", "task-rbac-audit#snapshot-2"),
      evidence("ev-sec-runtime", "runtime_event", "Permission escalation event", "runtime://auth/invite/escalation"),
      evidence("ev-sec-browser-network", "network_finding", "Invite 429 trace", "artifact://browser/network/invite-429.har"),
    ],
    recommendation: "Narrow permission scope to org-admin and enforce policy checks before token minting.",
    linked: { taskId: "task-rbac-audit", chatSessionId: "audit-session-1", branchName: "audit/sec-014-remediation", reviewId: "pr-rbac-42" },
    status: "acknowledged",
    createdAtIso: nowIso,
  },
  {
    id: "AF-AI-220",
    title: "Unstable local/cloud routing during policy explanation",
    description: "AI Auditor observed inconsistent reasoning outputs when routing alternates between local phi4 and cloud GPT model for the same prompt family.",
    auditorType: "ai",
    severity: "high",
    blocking: true,
    scope: { scopeType: "chat", scopeId: "main-session-1", label: "Main Chat" },
    evidence: [
      evidence("ev-ai-chat", "chat", "Divergent answer transcript", "main-session-1#msg-178-190"),
      evidence("ev-ai-provider", "provider_context", "Routing override", "provider-hub://route/audit-stream"),
    ],
    recommendation: "Pin deterministic routing for policy-critical prompts and enforce confidence threshold before auto actions.",
    linked: { chatSessionId: "main-session-1", taskId: "task-rbac-plan" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-PROMPT-037",
    title: "Conflicting escalation instruction across system prompts",
    description: "Prompt Auditor found one instruction telling workers to auto-push while governance prompt requires approval-first behavior.",
    auditorType: "prompt",
    severity: "high",
    blocking: true,
    scope: { scopeType: "workspace", scopeId: "workspace-default", label: "Workspace policy layer" },
    evidence: [
      evidence("ev-prompt-snapshot", "audit_snapshot", "Prompt stack snapshot", "snapshot://prompt-stack/2026-03-29T10:49:00Z"),
    ],
    recommendation: "Consolidate push policy into one canonical system prompt and remove conflicting legacy instruction.",
    linked: { chatSessionId: "main-session-1" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-TOOL-051",
    title: "Tool permission profile grants unrestricted shell write",
    description: "Tool Auditor flagged a permissive profile that allows write access outside expected repository boundaries.",
    auditorType: "tool",
    severity: "high",
    blocking: true,
    scope: { scopeType: "workspace", scopeId: "workspace-default", label: "Local tool runtime" },
    evidence: [
      evidence("ev-tool-runtime", "runtime_event", "Permission profile applied", "runtime://tools/profile/admin"),
    ],
    recommendation: "Apply least-privilege write scope and require approval for elevated command classes.",
    linked: { taskId: "task-rbac-exec", chatSessionId: "agent-session-1" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-GIT-018",
    title: "Dirty branch has untracked migration before push",
    description: "Git Auditor detected an untracked migration file in the task branch that is missing review labeling.",
    auditorType: "git",
    severity: "medium",
    blocking: true,
    scope: { scopeType: "branch", scopeId: "feat/rbac-task-rbac-exec", label: "feat/rbac-task-rbac-exec" },
    evidence: [
      evidence("ev-git-branch", "branch", "Branch status", "git://status?branch=feat/rbac-task-rbac-exec"),
    ],
    recommendation: "Stage migration with schema review label and regenerate commit summary before push.",
    linked: { taskId: "task-rbac-exec", branchName: "feat/rbac-task-rbac-exec", reviewId: "pr-rbac-42" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-TEST-302",
    title: "Missing regression test coverage for invite replay",
    description: "Test Auditor reported the exploit remediation path is not covered by regression tests in CI.",
    auditorType: "test",
    severity: "critical",
    blocking: true,
    scope: { scopeType: "review", scopeId: "pr-rbac-42", label: "PR #42" },
    evidence: [
      evidence("ev-test-quality", "quality_signal", "CI coverage delta", "ci://coverage/rbac/pr-42"),
      evidence("ev-test-chat", "chat", "Review reminder", "review-session-1#msg-r2"),
    ],
    recommendation: "Add regression test for replayed invite token and enforce minimum coverage gate for auth flows.",
    linked: { taskId: "task-rbac-release", reviewId: "pr-rbac-42", chatSessionId: "review-session-1" },
    status: "open",
    createdAtIso: nowIso,
  },
  {
    id: "AF-REL-501",
    title: "Release candidate not ready for deployment",
    description: "Release Auditor marked no-go because security and test blockers remain open for RC-2026-03-29-rbac.",
    auditorType: "release",
    severity: "critical",
    blocking: true,
    scope: { scopeType: "release_candidate", scopeId: "rc-2026-03-29-rbac", label: "RC 2026-03-29 RBAC" },
    evidence: [
      evidence("ev-release-audit", "audit_snapshot", "Release gate snapshot", "snapshot://release/rc-2026-03-29-rbac"),
      evidence("ev-release-state", "quality_signal", "Deploy readiness state", "release://readiness/no-go"),
      evidence("ev-release-browser", "scenario_trace", "Failed invite scenario", "artifact://browser/traces/scenario-invite-flow.json"),
      evidence("ev-release-design", "design_note", "Designer UX concern", "design://sessions/design-session-1/notes"),
    ],
    recommendation: "Resolve open critical findings and rerun release checklist before requesting deploy approval.",
    linked: { taskId: "task-rbac-release", releaseCandidateId: "rc-2026-03-29-rbac", reviewId: "pr-rbac-42" },
    status: "open",
    createdAtIso: nowIso,
  },
];

const findingsByType = (auditorType: AuditorProfile["type"]) => auditFindings.filter((f) => f.auditorType === auditorType);

const buildAuditor = (id: string, type: AuditorProfile["type"], name: string, runState: AuditorProfile["runState"], verdict: AuditorProfile["verdict"], scope: AuditorProfile["scope"], linked: AuditorProfile["linked"]): AuditorProfile => {
  const findings = findingsByType(type);
  return {
    id,
    type,
    name,
    scope,
    runState,
    linked,
    findingCount: findings.length,
    verdict,
    severitySummary: summarizeSeverity(findings),
    lastRunAtIso: nowIso,
    createdAtIso: "2026-03-29T10:35:00.000Z",
    updatedAtIso: nowIso,
    evidenceReferences: findings.flatMap((finding) => finding.evidence).slice(0, 3),
  };
};

export const auditors: AuditorProfile[] = [
  buildAuditor("aud-code", "code", "Code Auditor", "completed", "warning", { scopeType: "task", scopeId: "task-rbac-exec", label: "Implementation task" }, { taskId: "task-rbac-exec", chatSessionId: "agent-session-1" }),
  buildAuditor("aud-security", "security", "Security Auditor", "blocked", "fail", { scopeType: "branch", scopeId: "feat/rbac-task-rbac-exec", label: "Implementation branch" }, { taskId: "task-rbac-audit", chatSessionId: "audit-session-1", branchName: "audit/sec-014-remediation", reviewId: "pr-rbac-42" }),
  buildAuditor("aud-ai", "ai", "AI Auditor", "running", "warning", { scopeType: "chat", scopeId: "main-session-1", label: "Main Chat" }, { taskId: "task-rbac-plan", chatSessionId: "main-session-1" }),
  buildAuditor("aud-prompt", "prompt", "Prompt Auditor", "completed", "fail", { scopeType: "workspace", scopeId: "workspace-default", label: "Workspace" }, { chatSessionId: "main-session-1" }),
  buildAuditor("aud-tool", "tool", "Tool Auditor", "queued", "warning", { scopeType: "workspace", scopeId: "workspace-default", label: "Local runtime" }, { taskId: "task-rbac-exec", chatSessionId: "agent-session-1" }),
  buildAuditor("aud-git", "git", "Git Auditor", "running", "warning", { scopeType: "branch", scopeId: "feat/rbac-task-rbac-exec", label: "Feature branch" }, { taskId: "task-rbac-exec", branchName: "feat/rbac-task-rbac-exec", reviewId: "pr-rbac-42" }),
  buildAuditor("aud-test", "test", "Test Auditor", "blocked", "fail", { scopeType: "review", scopeId: "pr-rbac-42", label: "PR Review" }, { taskId: "task-rbac-release", chatSessionId: "review-session-1", reviewId: "pr-rbac-42" }),
  buildAuditor("aud-release", "release", "Release Auditor", "completed", "no_go", { scopeType: "release_candidate", scopeId: "rc-2026-03-29-rbac", label: "Release candidate" }, { taskId: "task-rbac-release", reviewId: "pr-rbac-42", releaseCandidateId: "rc-2026-03-29-rbac" }),
];

export const auditRuns: AuditorRun[] = auditors.map((auditor, index) => {
  const matchingFindings = findingsByType(auditor.type);
  return {
    id: `run-${auditor.type}-20260329-${index + 1}`,
    auditorId: auditor.id,
    auditorType: auditor.type,
    scope: auditor.scope,
    runState: auditor.runState,
    linked: auditor.linked,
    findingIds: matchingFindings.map((finding) => finding.id),
    findingCount: matchingFindings.length,
    verdict: auditor.verdict,
    severitySummary: auditor.severitySummary,
    startedAtIso: "2026-03-29T10:40:00.000Z",
    completedAtIso: auditor.runState === "running" || auditor.runState === "queued" ? undefined : nowIso,
    evidenceReferences: matchingFindings.flatMap((finding) => finding.evidence).slice(0, 4),
  };
});

const buildRunGroup = (id: string, dimension: AuditRunGroup["dimension"], targetId: string, runIds: string[], findingIds: string[], verdict: AuditRunGroup["verdict"]): AuditRunGroup => {
  const findings = auditFindings.filter((finding) => findingIds.includes(finding.id));
  return {
    id,
    dimension,
    targetId,
    runIds,
    findingIds,
    verdict,
    severitySummary: summarizeSeverity(findings),
    generatedAtIso: nowIso,
  };
};

export const auditRunGroups: AuditRunGroup[] = [
  buildRunGroup("group-task-rbac-exec", "task", "task-rbac-exec", ["run-code-20260329-1", "run-git-20260329-6", "run-tool-20260329-5"], ["AF-CODE-101", "AF-GIT-018", "AF-TOOL-051"], "warning"),
  buildRunGroup("group-branch-rbac", "branch", "feat/rbac-task-rbac-exec", ["run-security-20260329-2", "run-git-20260329-6"], ["AF-SEC-014", "AF-GIT-018"], "fail"),
  buildRunGroup("group-review-pr-42", "review", "pr-rbac-42", ["run-test-20260329-7", "run-security-20260329-2"], ["AF-TEST-302", "AF-SEC-014"], "fail"),
  buildRunGroup("group-release-rc", "release_candidate", "rc-2026-03-29-rbac", ["run-release-20260329-8", "run-test-20260329-7", "run-security-20260329-2"], ["AF-REL-501", "AF-TEST-302", "AF-SEC-014"], "no_go"),
  buildRunGroup("group-auditor-security", "auditor", "aud-security", ["run-security-20260329-2"], ["AF-SEC-014"], "fail"),
];

export const auditGateDecisions: AuditGateDecision[] = [
  {
    stage: "push_readiness",
    verdict: "no_go",
    blockingFindingIds: ["AF-SEC-014", "AF-GIT-018"],
    blockedByAuditorTypes: ["security", "git"],
    rationale: "Push blocked until permission scope and dirty branch issues are remediated.",
    updatedAtIso: nowIso,
  },
  {
    stage: "review_readiness",
    verdict: "no_go",
    blockingFindingIds: ["AF-SEC-014", "AF-PROMPT-037"],
    blockedByAuditorTypes: ["security", "prompt"],
    rationale: "Review remains blocked while critical policy and security findings stay unresolved.",
    updatedAtIso: nowIso,
  },
  {
    stage: "merge_readiness",
    verdict: "no_go",
    blockingFindingIds: ["AF-TEST-302"],
    blockedByAuditorTypes: ["test"],
    rationale: "Merge requires regression coverage for invite replay exploit path.",
    updatedAtIso: nowIso,
  },
  {
    stage: "release_readiness",
    verdict: "not_ready",
    blockingFindingIds: ["AF-REL-501", "AF-SEC-014", "AF-TEST-302"],
    blockedByAuditorTypes: ["release", "security", "test"],
    rationale: "Release candidate cannot proceed to sign-off while critical findings remain open.",
    updatedAtIso: nowIso,
  },
  {
    stage: "deploy_readiness",
    verdict: "no_go",
    blockingFindingIds: ["AF-REL-501"],
    blockedByAuditorTypes: ["release"],
    rationale: "Release auditor produced no-go verdict for deployment.",
    updatedAtIso: nowIso,
  },
];

export const auditBlockers: AuditBlockerCondition[] = buildAuditBlockers({
  auditors,
  findings: auditFindings,
  runs: auditRuns,
  runGroups: auditRunGroups,
  gateDecisions: auditGateDecisions,
  blockers: [],
});

export const auditorControlState: AuditorControlState = {
  auditors,
  findings: auditFindings,
  runs: auditRuns,
  runGroups: auditRunGroups,
  gateDecisions: auditGateDecisions,
  blockers: auditBlockers,
};

const summaryBySeverity = summarizeSeverity(auditFindings);

export const auditSummary = {
  overall: auditGateDecisions.some((gate) => gate.verdict === "no_go") ? "no_go" : "go",
  score: 61,
  ...summaryBySeverity,
  resolved: auditFindings.filter((finding) => finding.status === "resolved").length,
  total: auditFindings.length,
};

export const findingSeverityOrder: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];
