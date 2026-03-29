export type ChatTab = "main" | "agent" | "audit" | "review";

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system" | "auditor";
  agentName?: string;
  content: string;
  timestamp: string;
  status?: "completed" | "running" | "pending" | "failed";
  attachments?: { type: string; name: string }[];
}

export const mainChatMessages: ChatMessage[] = [
  { id: "m1", role: "system", content: "Project **SaaS Dashboard** loaded. Mode: Build. Branch: `main`. 3 agents active.", timestamp: "10:41 AM" },
  { id: "m2", role: "user", content: "Build the user management module with RBAC, invite flow, and activity log.", timestamp: "10:42 AM" },
  { id: "m3", role: "agent", agentName: "Planner Agent", content: "Decomposed into 6 tasks:\n1. Define roles schema\n2. Create users table + RLS\n3. Build invite API edge function\n4. Frontend: user list + role editor\n5. Activity log table + real-time subscription\n6. Integration tests", timestamp: "10:42 AM", status: "completed" },
  { id: "m4", role: "agent", agentName: "Architect Agent", content: "Schema designed. 3 tables: `users`, `user_roles`, `activity_log`. RLS policies drafted. Ready for approval.", timestamp: "10:43 AM", status: "completed" },
  { id: "m5", role: "system", content: "⏸ **Approval checkpoint**: Architecture review required before proceeding to implementation.", timestamp: "10:43 AM" },
  { id: "m6", role: "user", content: "Approved. Proceed with implementation.", timestamp: "10:44 AM" },
  { id: "m7", role: "agent", agentName: "Backend Agent", content: "Creating Supabase migrations for `user_roles` and `activity_log` tables...", timestamp: "10:44 AM", status: "running" },
  { id: "m8", role: "agent", agentName: "Frontend Agent", content: "Generating `UserManagement.tsx` with role editor component. Using existing design tokens.", timestamp: "10:44 AM", status: "running" },
];

export const agentChatMessages: ChatMessage[] = [
  { id: "a1", role: "agent", agentName: "Frontend Agent", content: "Started task: Build user list component with pagination and search.", timestamp: "10:44 AM", status: "running" },
  { id: "a2", role: "agent", agentName: "Backend Agent", content: "Migration `20240315_user_roles.sql` created. Applying to staging...", timestamp: "10:44 AM", status: "running" },
  { id: "a3", role: "agent", agentName: "Security Remediator", content: "Patched RLS policy on `profiles` table — was missing `auth.uid()` check on UPDATE.", timestamp: "10:40 AM", status: "completed" },
  { id: "a4", role: "agent", agentName: "Code Auditor", content: "Scanning new files for quality issues. 2 files queued.", timestamp: "10:44 AM", status: "running" },
];

export const auditChatMessages: ChatMessage[] = [
  { id: "au1", role: "auditor", agentName: "Security Auditor", content: "**Finding SEC-014**: Missing rate limiting on `/auth/signup` endpoint. Severity: High.", timestamp: "10:38 AM", status: "completed" },
  { id: "au2", role: "user", content: "Can you auto-fix this?", timestamp: "10:39 AM" },
  { id: "au3", role: "auditor", agentName: "Security Remediator", content: "Applied rate limiter middleware: 5 req/min per IP on auth endpoints. Patch pushed to branch `fix/rate-limit`.", timestamp: "10:40 AM", status: "completed" },
  { id: "au4", role: "auditor", agentName: "Code Auditor", content: "3 new findings from latest scan. 1 high, 2 medium. Opening evidence drawer.", timestamp: "10:43 AM", status: "completed" },
];

export const reviewChatMessages: ChatMessage[] = [
  { id: "r1", role: "agent", agentName: "Git Agent", content: "PR #42 ready for review: `feat/user-management`. 12 files changed, +480 −23.", timestamp: "10:45 AM", status: "completed" },
  { id: "r2", role: "system", content: "Diff loaded in review panel. 3 approval checkpoints remaining.", timestamp: "10:45 AM" },
  { id: "r3", role: "agent", agentName: "Code Auditor", content: "PR scan complete. No critical issues. 1 suggestion: extract `RoleSelect` into shared component.", timestamp: "10:46 AM", status: "completed" },
];

export const activeAgents = [
  { name: "Frontend Agent", status: "running" as const, task: "Building UserManagement.tsx", provider: "Anthropic", model: "claude-4-opus" },
  { name: "Backend Agent", status: "running" as const, task: "Applying migrations", provider: "OpenAI", model: "gpt-4o" },
  { name: "Code Auditor", status: "running" as const, task: "Scanning 2 files", provider: "Anthropic", model: "claude-4-opus" },
  { name: "Planner Agent", status: "idle" as const, task: "Waiting", provider: "Anthropic", model: "claude-4-opus" },
];
