import type { EvidenceFlowState, EvidenceRecord } from "@/types/evidence";

const nowIso = "2026-03-29T10:49:00.000Z";

const record = (entry: EvidenceRecord): EvidenceRecord => entry;

export const evidenceRecords: EvidenceRecord[] = [
  record({
    id: "ev-design-layout-1",
    title: "Workspace layout proposal with crowded action rail",
    summary: "Designer Agent proposed a three-zone layout and flagged that primary actions compete with audit notices on narrow widths.",
    source: "designer_agent",
    kind: "design_note",
    severity: "medium",
    blocking: false,
    createdAtIso: nowIso,
    tags: ["design", "workspace", "layout"],
    assets: [{ id: "asset-design-note-1", label: "Design notes", kind: "note", uri: "design://sessions/design-session-1/notes" }],
    links: { chatSessionId: "agent-session-1", taskId: "task-rbac-exec", reviewId: "pr-rbac-42" },
  }),
  record({
    id: "ev-browser-step-fail-1",
    title: "Invite modal submit step failed in preview",
    summary: "Browser Agent scenario failed when invite submit returned 429, blocking the happy-path UX validation.",
    source: "browser_agent",
    kind: "scenario_trace",
    severity: "high",
    blocking: true,
    createdAtIso: nowIso,
    tags: ["browser", "scenario", "release-blocker"],
    assets: [
      { id: "asset-screenshot-1", label: "Invite modal failure", kind: "screenshot", uri: "artifact://browser/failures/invite-modal-429.png", mimeType: "image/png" },
      { id: "asset-trace-1", label: "Scenario trace", kind: "trace", uri: "artifact://browser/traces/scenario-invite-flow.json", mimeType: "application/json" },
    ],
    links: { chatSessionId: "review-session-1", taskId: "task-rbac-release", reviewId: "pr-rbac-42", releaseCandidateId: "rc-2026-03-29-rbac" },
  }),
  record({
    id: "ev-browser-console-1",
    title: "Console shows uncaught invite retry error",
    summary: "Console emitted unhandled promise rejection after retry logic exhausted.",
    source: "browser_agent",
    kind: "console_finding",
    severity: "high",
    blocking: true,
    createdAtIso: nowIso,
    tags: ["console", "invite", "error"],
    assets: [{ id: "asset-console-log-1", label: "Console excerpt", kind: "log", uri: "artifact://browser/console/invite-retry.log", mimeType: "text/plain" }],
    links: { chatSessionId: "audit-session-1", taskId: "task-rbac-audit", findingId: "AF-SEC-014", reviewId: "pr-rbac-42" },
  }),
  record({
    id: "ev-browser-network-1",
    title: "Network trace captured 429 from invite API",
    summary: "Rate limiter blocked repeated invite submission; Browser Agent attached request/response headers for audit replay.",
    source: "browser_agent",
    kind: "network_finding",
    severity: "critical",
    blocking: true,
    createdAtIso: nowIso,
    tags: ["network", "api", "429"],
    assets: [{ id: "asset-network-log-1", label: "HAR snippet", kind: "trace", uri: "artifact://browser/network/invite-429.har", mimeType: "application/json" }],
    links: { chatSessionId: "audit-session-1", taskId: "task-rbac-audit", findingId: "AF-SEC-014", branchName: "audit/sec-014-remediation" },
  }),
];

export const evidenceFlowState: EvidenceFlowState = {
  records: evidenceRecords,
  linkedByChatSessionId: {
    "audit-session-1": ["ev-browser-console-1", "ev-browser-network-1"],
    "review-session-1": ["ev-browser-step-fail-1"],
    "agent-session-1": ["ev-design-layout-1"],
  },
  linkedByTaskId: {
    "task-rbac-exec": ["ev-design-layout-1"],
    "task-rbac-audit": ["ev-browser-console-1", "ev-browser-network-1"],
    "task-rbac-release": ["ev-browser-step-fail-1"],
  },
  linkedByReviewId: {
    "pr-rbac-42": ["ev-design-layout-1", "ev-browser-step-fail-1", "ev-browser-console-1"],
  },
  releaseReadinessBlockers: ["ev-browser-step-fail-1", "ev-browser-network-1"],
};
