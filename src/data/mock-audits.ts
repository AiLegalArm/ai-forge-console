export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "open" | "in-progress" | "resolved" | "dismissed";

export interface AuditFinding {
  id: string;
  auditor: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
}

export const auditFindings: AuditFinding[] = [
  { id: "f-1", auditor: "Security Auditor", title: "Missing RLS policy on user_profiles", severity: "critical", status: "open", description: "Table user_profiles has no RLS policies enabled, allowing unrestricted access.", file: "supabase/migrations/002.sql", line: 14, suggestion: "Add RLS policy restricting access to authenticated users viewing their own profile." },
  { id: "f-2", auditor: "Code Auditor", title: "Unused imports in 12 files", severity: "low", status: "in-progress", description: "Multiple files contain unused import statements that increase bundle size.", suggestion: "Run automated cleanup to remove unused imports." },
  { id: "f-3", auditor: "Security Auditor", title: "API key exposed in client bundle", severity: "critical", status: "open", description: "Private API key found in environment variable accessed from client-side code.", file: "src/lib/api.ts", line: 8, suggestion: "Move to server-side edge function and use secrets management." },
  { id: "f-4", auditor: "Test Auditor", title: "Test coverage below 40%", severity: "high", status: "open", description: "Overall test coverage is at 37%, below the minimum threshold of 80%.", suggestion: "Generate unit tests for core business logic modules." },
  { id: "f-5", auditor: "Cost Auditor", title: "Redundant API calls in prompt chain", severity: "medium", status: "open", description: "Steps 3 and 5 in the main prompt chain make identical API calls.", suggestion: "Cache step 3 output and reuse in step 5." },
  { id: "f-6", auditor: "Consistency Auditor", title: "Inconsistent error handling patterns", severity: "medium", status: "resolved", description: "Mix of try/catch and .catch() patterns across API layer.", suggestion: "Standardize on async/await with try/catch." },
  { id: "f-7", auditor: "Runtime Auditor", title: "Memory leak in WebSocket handler", severity: "high", status: "open", description: "Event listeners not cleaned up on component unmount.", file: "src/hooks/useSocket.ts", line: 23, suggestion: "Add cleanup in useEffect return function." },
  { id: "f-8", auditor: "Release Auditor", title: "Missing environment variables in deploy config", severity: "high", status: "open", description: "3 required environment variables not configured in production.", suggestion: "Add SUPABASE_SERVICE_KEY, STRIPE_SECRET, SENDGRID_KEY to deploy config." },
];

export const auditSummary = {
  overall: "warning" as const,
  score: 72,
  critical: 2,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
  resolved: 1,
  total: 8,
};
