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
  taskId: "task-rbac-release",
  chatSessionId: "review-session-1",
  scenarioId: "scenario-invite-preview",
  sessionState: "ready",
  resultState: "unknown",
  runState: "queued",
  scenario: {
    id: "scenario-invite-preview",
    title: "Invite user flow on staging preview",
    targetUrl: "https://preview.acme.dev/workspace",
    expectedOutcome: "Invite flow succeeds without throttling and user sees confirmation toast.",
    status: "pending",
    passFail: "unknown",
    linkedEvidenceIds: [],
    steps: [
      { id: "step-1", label: "Open workspace", expected: "Workspace shell loads", status: "pending", evidenceIds: [] },
      { id: "step-2", label: "Open invite modal", expected: "Modal opens with role selector", status: "pending", evidenceIds: [] },
      {
        id: "step-3-submit-invite",
        label: "Submit invite",
        expected: "Invite API responds 200 and toast shows success",
        status: "pending",
        evidenceIds: [],
      },
    ],
  },
  consoleSummary: [],
  networkSummary: [],
  screenshotReferences: [],
  evidenceReferences: [],
  findings: [],
  executionLog: [],
  createdAtIso: "2026-03-29T10:47:40.000Z",
  updatedAtIso: "2026-03-29T10:47:40.000Z",
};
