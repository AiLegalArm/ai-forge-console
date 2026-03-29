import type {
  ApprovalRequest,
  ChatAttachment,
  ChatMessage,
  ChatSession,
  ChatState,
  ChatType,
} from "@/types/chat";

export type ChatTab = ChatType;

const now = "2026-03-29T10:46:00.000Z";

const pendingArchitectureApproval: ApprovalRequest = {
  id: "appr-arch-01",
  title: "Architecture checkpoint",
  description: "Approve schema and execution plan before implementation tasks proceed.",
  status: "requested",
  requestedBy: "orchestrator",
  requestedAtIso: "2026-03-29T10:43:00.000Z",
};

const draftAttachment: ChatAttachment = {
  id: "att-1",
  name: "rbac-notes.md",
  kind: "file",
  mimeType: "text/markdown",
  uploadState: "placeholder",
};

export const mockChatSessions: ChatSession[] = [
  {
    id: "main-session-1",
    type: "main",
    title: "Build user management module",
    isActive: true,
    providerMeta: { provider: "Anthropic", model: "claude-4-opus", backend: "ollama", routingKey: "orchestrator-default" },
    linked: { taskId: "task-rbac", taskTitle: "Build user management module" },
    lastMessageAtIso: now,
    unreadCount: 0,
  },
  {
    id: "agent-session-1",
    type: "agent",
    title: "Frontend + Backend execution thread",
    isActive: true,
    providerMeta: { provider: "OpenAI", model: "gpt-4o", backend: "hybrid", routingKey: "agent-exec" },
    linked: { taskId: "task-rbac", taskTitle: "Build user management module", agentId: "agent-frontend", agentName: "Frontend Agent" },
    lastMessageAtIso: now,
    unreadCount: 2,
  },
  {
    id: "audit-session-1",
    type: "audit",
    title: "Security findings triage",
    isActive: true,
    providerMeta: { provider: "Anthropic", model: "claude-4-opus", backend: "cloud", routingKey: "audit-stream" },
    linked: { taskId: "task-rbac", taskTitle: "Build user management module", auditFindingId: "SEC-014", auditFindingTitle: "Missing rate limiting" },
    lastMessageAtIso: now,
    unreadCount: 1,
  },
  {
    id: "review-session-1",
    type: "review",
    title: "PR #42 review thread",
    isActive: true,
    providerMeta: { provider: "OpenAI", model: "gpt-4.1", backend: "cloud", routingKey: "review-pr" },
    linked: { taskId: "task-rbac", taskTitle: "Build user management module" },
    lastMessageAtIso: now,
    unreadCount: 0,
  },
];

const messages: ChatMessage[] = [
  {
    id: "m1",
    sessionId: "main-session-1",
    role: "user",
    content: "Build the user management module with RBAC, invite flow, and activity log.",
    createdAtIso: "2026-03-29T10:42:00.000Z",
    status: "completed",
    linked: { taskId: "task-rbac", taskTitle: "Build user management module" },
  },
  {
    id: "m2",
    sessionId: "main-session-1",
    role: "orchestrator",
    authorLabel: "Orchestrator",
    content:
      "Plan ready: 1) schema + RLS, 2) invite API, 3) user list UI, 4) activity log, 5) integration tests. Requesting architecture approval.",
    createdAtIso: "2026-03-29T10:43:00.000Z",
    status: "needs_approval",
    approval: pendingArchitectureApproval,
    linked: { taskId: "task-rbac", taskTitle: "Build user management module" },
    providerMeta: { provider: "Anthropic", model: "claude-4-opus", backend: "ollama" },
  },
  {
    id: "a1",
    sessionId: "agent-session-1",
    role: "agent",
    authorLabel: "Backend Agent",
    content: "Migration `20260329_user_roles.sql` applied. Starting activity log table migration.",
    createdAtIso: "2026-03-29T10:44:00.000Z",
    status: "streaming",
    linked: { taskId: "task-rbac", taskTitle: "Build user management module", agentId: "agent-backend", agentName: "Backend Agent" },
    providerMeta: { provider: "OpenAI", model: "gpt-4o", backend: "hybrid" },
  },
  {
    id: "a2",
    sessionId: "agent-session-1",
    role: "agent",
    authorLabel: "Frontend Agent",
    content: "UserManagement.tsx scaffold complete. Wiring role editor and invite modal.",
    createdAtIso: "2026-03-29T10:45:00.000Z",
    status: "streaming",
    linked: { taskId: "task-rbac", taskTitle: "Build user management module", agentId: "agent-frontend", agentName: "Frontend Agent" },
  },
  {
    id: "au1",
    sessionId: "audit-session-1",
    role: "auditor",
    authorLabel: "Security Auditor",
    content: "Finding SEC-014: Missing rate limiting on /auth/signup endpoint. Severity high. Impact: abuse risk.",
    createdAtIso: "2026-03-29T10:38:00.000Z",
    status: "completed",
    linked: { auditFindingId: "SEC-014", auditFindingTitle: "Missing rate limiting", taskId: "task-rbac", taskTitle: "Build user management module" },
  },
  {
    id: "au2",
    sessionId: "audit-session-1",
    role: "auditor",
    authorLabel: "Security Remediator",
    content: "Patched limiter: 5 req/min per IP for auth endpoints. Remediation branch fix/rate-limit.",
    createdAtIso: "2026-03-29T10:40:00.000Z",
    status: "completed",
    linked: { auditFindingId: "SEC-014", auditFindingTitle: "Missing rate limiting" },
  },
  {
    id: "r1",
    sessionId: "review-session-1",
    role: "reviewer",
    authorLabel: "Git Agent",
    content: "PR #42 ready: feat/user-management, 12 files changed (+480 −23). Audit summary attached.",
    createdAtIso: "2026-03-29T10:45:00.000Z",
    status: "completed",
    attachments: [{ id: "att-diff-1", name: "pr-42.diff", kind: "diff", uploadState: "uploaded" }],
  },
  {
    id: "r2",
    sessionId: "review-session-1",
    role: "reviewer",
    authorLabel: "Release Reviewer",
    content: "Review summary: no critical blockers, 1 refactor suggestion on RoleSelect extraction.",
    createdAtIso: "2026-03-29T10:46:00.000Z",
    status: "completed",
  },
];

const messagesBySessionId = messages.reduce<Record<string, ChatMessage[]>>((acc, message) => {
  acc[message.sessionId] = [...(acc[message.sessionId] ?? []), message];
  return acc;
}, {});

export const initialChatState: ChatState = {
  activeChatType: "main",
  sessions: mockChatSessions,
  messagesBySessionId,
  selectedSessionIdByType: {
    main: "main-session-1",
    agent: "agent-session-1",
    audit: "audit-session-1",
    review: "review-session-1",
  },
  draftInputBySessionId: {
    "main-session-1": "",
    "agent-session-1": "@Frontend Agent confirm remaining tasks",
    "audit-session-1": "Can you attach exploit reproduction steps?",
    "review-session-1": "",
  },
  approvalRequestBySessionId: {
    "main-session-1": pendingArchitectureApproval,
    "agent-session-1": null,
    "audit-session-1": null,
    "review-session-1": null,
  },
  attachmentPlaceholdersBySessionId: {
    "main-session-1": [draftAttachment],
    "agent-session-1": [],
    "audit-session-1": [],
    "review-session-1": [],
  },
  relatedContextBySessionId: {
    "main-session-1": { taskId: "task-rbac", taskTitle: "Build user management module" },
    "agent-session-1": { taskId: "task-rbac", taskTitle: "Build user management module", agentId: "agent-frontend", agentName: "Frontend Agent" },
    "audit-session-1": { taskId: "task-rbac", taskTitle: "Build user management module", auditFindingId: "SEC-014", auditFindingTitle: "Missing rate limiting" },
    "review-session-1": { taskId: "task-rbac", taskTitle: "Build user management module" },
  },
};

export const activeAgents = [
  { id: "agent-frontend", name: "Frontend Agent", status: "running" as const, task: "Building UserManagement.tsx", provider: "Anthropic", model: "claude-4-opus" },
  { id: "agent-backend", name: "Backend Agent", status: "running" as const, task: "Applying migrations", provider: "OpenAI", model: "gpt-4o" },
  { id: "agent-auditor", name: "Code Auditor", status: "running" as const, task: "Scanning 2 files", provider: "Anthropic", model: "claude-4-opus" },
  { id: "agent-planner", name: "Planner Agent", status: "idle" as const, task: "Waiting", provider: "Anthropic", model: "claude-4-opus" },
];
