import type { BrowserSession, DesignSession } from "@/types/agents";

export const designSession: DesignSession = {
  id: "design-session-1",
  state: "review_needed",
  brief: {
    id: "brief-workspace-shell",
    title: "Refine workspace shell for cross-role execution",
    goals: [
      "Preserve chat-first workflow while exposing design and browser QA context",
      "Make blockers visible before push/release decisions",
    ],
    constraints: [
      "Do not redesign navigation model",
      "Use existing component vocabulary",
    ],
    targetScreen: "Workspace",
  },
  layoutProposal: {
    id: "layout-workspace-v2",
    pageStructure: [
      "Top context bar with project/task/release readiness",
      "Main chat-first center column",
      "Right rail with evidence and task checkpoints",
    ],
    componentInventory: [
      "Task graph",
      "Evidence drawer",
      "Audit/review readiness summary",
      "Design + browser agent cards",
    ],
    statesAndVariants: [
      "Default execution view",
      "Audit escalation view",
      "Release decision view",
    ],
  },
  componentMap: [
    {
      id: "cmp-workspace-side-rail",
      componentName: "SideRail",
      purpose: "Expose blockers, evidence references, and approvals",
      states: ["default", "blocked"],
      linkedTaskId: "task-rbac-release",
    },
    {
      id: "cmp-chat-review",
      componentName: "Review Chat Summary",
      purpose: "Summarize if browser/design findings block release",
      states: ["needs-follow-up", "ready"],
      linkedTaskId: "task-rbac-release",
    },
  ],
  tokenHandoff: {
    designTokens: ["surface-warning", "surface-critical", "text-muted"],
    handoffNotes: [
      "Prioritize contrast for blocker chips in right rail.",
      "Use consistent status language across audit and review panels.",
    ],
  },
  findings: [
    {
      id: "design-finding-ux-1",
      title: "Action density can hide release blockers",
      concern: "When three approvals stack, blocker context falls below fold on laptop widths.",
      severity: "medium",
      blocking: false,
      linkedEvidenceId: "ev-design-layout-1",
    },
  ],
  updatedAtIso: "2026-03-29T10:48:30.000Z",
};

export const browserSession: BrowserSession = {
  id: "browser-session-1",
  runState: "failed",
  scenario: {
    id: "scenario-invite-preview",
    title: "Invite user flow on staging preview",
    targetUrl: "https://preview.acme.dev/workspace",
    steps: [
      { id: "step-1", label: "Open workspace", expected: "Workspace shell loads", status: "passed" },
      { id: "step-2", label: "Open invite modal", expected: "Modal opens with role selector", status: "passed" },
      {
        id: "step-3",
        label: "Submit invite",
        expected: "Invite API responds 200 and toast shows success",
        status: "failed",
        resultNote: "Received 429 and error toast remained visible.",
        evidenceIds: ["ev-browser-step-fail-1", "ev-browser-console-1", "ev-browser-network-1"],
      },
    ],
  },
  consoleSummary: [
    "UnhandledPromiseRejection: invite retry exhausted",
    "POST /api/invite returned status 429",
  ],
  networkSummary: [
    "3/10 invite requests throttled in test window",
    "x-ratelimit-remaining hit 0 during submit step",
  ],
  screenshotReferences: ["artifact://browser/failures/invite-modal-429.png"],
  findings: [
    {
      id: "browser-find-ui-1",
      title: "Invite scenario blocked by rate limit",
      findingType: "scenario_failure",
      summary: "Scenario cannot complete due to 429 on submit step.",
      severity: "critical",
      blocking: true,
      linkedEvidenceId: "ev-browser-step-fail-1",
    },
    {
      id: "browser-find-console-1",
      title: "Unhandled retry failure in console",
      findingType: "console_issue",
      summary: "Retry helper does not gracefully recover from repeated throttling.",
      severity: "high",
      blocking: true,
      linkedEvidenceId: "ev-browser-console-1",
    },
  ],
  executionLog: [
    { status: "scenario_started", summary: "Scenario started on preview build", timestampIso: "2026-03-29T10:47:40.000Z" },
    { status: "step_passed", summary: "Step 1 passed", timestampIso: "2026-03-29T10:47:43.000Z" },
    { status: "step_passed", summary: "Step 2 passed", timestampIso: "2026-03-29T10:47:45.000Z" },
    { status: "step_failed", summary: "Step 3 failed with 429", timestampIso: "2026-03-29T10:47:49.000Z" },
    { status: "evidence_captured", summary: "Captured screenshot, console and network evidence", timestampIso: "2026-03-29T10:47:52.000Z" },
    { status: "run_completed", summary: "Run completed with blockers", timestampIso: "2026-03-29T10:47:54.000Z" },
  ],
  updatedAtIso: "2026-03-29T10:47:54.000Z",
};
