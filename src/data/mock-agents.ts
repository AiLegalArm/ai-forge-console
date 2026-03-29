export type AgentCategory = "worker" | "auditor" | "remediator";
export type AgentStatus = "idle" | "running" | "completed" | "error" | "queued";

export interface Agent {
  id: string;
  name: string;
  category: AgentCategory;
  status: AgentStatus;
  description: string;
  model: string;
  provider: string;
  lastRun?: string;
  tasksCompleted: number;
  successRate: number;
}

export const workerAgents: Agent[] = [
  { id: "wa-1", name: "Product Discovery Agent", category: "worker", status: "completed", description: "Deep product/market analysis and requirements elicitation", model: "claude-4-opus", provider: "Anthropic", lastRun: "2m ago", tasksCompleted: 47, successRate: 96 },
  { id: "wa-2", name: "Planner Agent", category: "worker", status: "running", description: "Technical planning, architecture decisions, and task decomposition", model: "claude-4-opus", provider: "Anthropic", lastRun: "now", tasksCompleted: 89, successRate: 94 },
  { id: "wa-3", name: "Architect Agent", category: "worker", status: "idle", description: "System architecture, infrastructure, and integration design", model: "gpt-4o", provider: "OpenAI", lastRun: "15m ago", tasksCompleted: 32, successRate: 97 },
  { id: "wa-4", name: "Brief Agent", category: "worker", status: "idle", description: "Generates structured briefs from discovery and planning output", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "20m ago", tasksCompleted: 55, successRate: 98 },
  { id: "wa-5", name: "Prompt Generator Agent", category: "worker", status: "queued", description: "Generates optimized prompts from requirements and briefs", model: "claude-4-opus", provider: "Anthropic", tasksCompleted: 120, successRate: 95 },
  { id: "wa-6", name: "Instruction Generator Agent", category: "worker", status: "idle", description: "Creates step-by-step instructions for execution agents", model: "gpt-4o", provider: "OpenAI", lastRun: "30m ago", tasksCompleted: 78, successRate: 93 },
  { id: "wa-7", name: "Tool Generator Agent", category: "worker", status: "idle", description: "Generates tool definitions and configurations for agents", model: "gemini-2.5-pro", provider: "Gemini", lastRun: "1h ago", tasksCompleted: 41, successRate: 91 },
  { id: "wa-8", name: "Frontend Agent", category: "worker", status: "running", description: "React/TypeScript frontend code generation and modification", model: "claude-4-opus", provider: "Anthropic", lastRun: "now", tasksCompleted: 234, successRate: 92 },
  { id: "wa-9", name: "Backend Agent", category: "worker", status: "idle", description: "Server-side logic, APIs, and database operations", model: "gpt-4o", provider: "OpenAI", lastRun: "5m ago", tasksCompleted: 156, successRate: 90 },
  { id: "wa-10", name: "Supabase Agent", category: "worker", status: "idle", description: "Supabase schema, RLS policies, edge functions, and migrations", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "12m ago", tasksCompleted: 67, successRate: 95 },
  { id: "wa-11", name: "Python Agent", category: "worker", status: "idle", description: "Python script execution, data processing, and automation", model: "deepseek-r1", provider: "DeepSeek", lastRun: "45m ago", tasksCompleted: 89, successRate: 88 },
  { id: "wa-12", name: "Browser Agent", category: "worker", status: "idle", description: "Browser automation, testing, and visual verification", model: "gpt-4o", provider: "OpenAI", lastRun: "8m ago", tasksCompleted: 112, successRate: 86 },
  { id: "wa-13", name: "Designer Agent", category: "worker", status: "idle", description: "UI/UX design tokens, component styling, and visual systems", model: "claude-4-opus", provider: "Anthropic", lastRun: "25m ago", tasksCompleted: 43, successRate: 94 },
  { id: "wa-14", name: "Git Agent", category: "worker", status: "completed", description: "Git operations, branch management, and PR creation", model: "gpt-4o-mini", provider: "OpenAI", lastRun: "3m ago", tasksCompleted: 198, successRate: 99 },
  { id: "wa-15", name: "Deploy Agent", category: "worker", status: "idle", description: "Build, deployment, and infrastructure provisioning", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "1h ago", tasksCompleted: 34, successRate: 97 },
  { id: "wa-16", name: "Domain Agent", category: "worker", status: "idle", description: "Domain configuration, DNS, SSL, and routing", model: "gpt-4o-mini", provider: "OpenAI", lastRun: "2h ago", tasksCompleted: 12, successRate: 100 },
];

export const auditorAgents: Agent[] = [
  { id: "aa-1", name: "Code Auditor", category: "auditor", status: "running", description: "Code quality, patterns, and best practices analysis", model: "claude-4-opus", provider: "Anthropic", lastRun: "now", tasksCompleted: 156, successRate: 97 },
  { id: "aa-2", name: "Security Auditor", category: "auditor", status: "completed", description: "Security vulnerability scanning and threat analysis", model: "gpt-4o", provider: "OpenAI", lastRun: "5m ago", tasksCompleted: 89, successRate: 98 },
  { id: "aa-3", name: "AI Auditor", category: "auditor", status: "idle", description: "AI output quality, hallucination detection, and consistency", model: "claude-4-opus", provider: "Anthropic", lastRun: "10m ago", tasksCompleted: 67, successRate: 94 },
  { id: "aa-4", name: "Prompt Auditor", category: "auditor", status: "idle", description: "Prompt quality, injection risks, and effectiveness analysis", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "15m ago", tasksCompleted: 45, successRate: 96 },
  { id: "aa-5", name: "Tool Auditor", category: "auditor", status: "idle", description: "Tool configuration validation and capability verification", model: "gpt-4o", provider: "OpenAI", lastRun: "20m ago", tasksCompleted: 34, successRate: 95 },
  { id: "aa-6", name: "Git Auditor", category: "auditor", status: "completed", description: "Git history, commit quality, and branch hygiene analysis", model: "gpt-4o-mini", provider: "OpenAI", lastRun: "3m ago", tasksCompleted: 78, successRate: 99 },
  { id: "aa-7", name: "Test Auditor", category: "auditor", status: "idle", description: "Test coverage, quality, and reliability analysis", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "30m ago", tasksCompleted: 56, successRate: 93 },
  { id: "aa-8", name: "Runtime Auditor", category: "auditor", status: "idle", description: "Runtime performance, memory, and error analysis", model: "gpt-4o", provider: "OpenAI", lastRun: "1h ago", tasksCompleted: 23, successRate: 91 },
  { id: "aa-9", name: "Import Auditor", category: "auditor", status: "idle", description: "Data import validation and schema compliance", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "2h ago", tasksCompleted: 12, successRate: 100 },
  { id: "aa-10", name: "Release Auditor", category: "auditor", status: "queued", description: "Release readiness, blockers, and go/no-go assessment", model: "claude-4-opus", provider: "Anthropic", tasksCompleted: 18, successRate: 100 },
  { id: "aa-11", name: "Consistency Auditor", category: "auditor", status: "idle", description: "Cross-component consistency and design system compliance", model: "gpt-4o", provider: "OpenAI", lastRun: "45m ago", tasksCompleted: 34, successRate: 92 },
  { id: "aa-12", name: "Cost Auditor", category: "auditor", status: "idle", description: "Token usage, API cost analysis, and optimization", model: "gpt-4o-mini", provider: "OpenAI", lastRun: "1h ago", tasksCompleted: 41, successRate: 98 },
];

export const remediatorAgents: Agent[] = [
  { id: "ra-1", name: "Code Remediator", category: "remediator", status: "idle", description: "Automated code fixes based on audit findings", model: "claude-4-opus", provider: "Anthropic", lastRun: "10m ago", tasksCompleted: 89, successRate: 91 },
  { id: "ra-2", name: "Security Remediator", category: "remediator", status: "running", description: "Security vulnerability patching and hardening", model: "claude-4-opus", provider: "Anthropic", lastRun: "now", tasksCompleted: 34, successRate: 95 },
  { id: "ra-3", name: "Prompt Remediator", category: "remediator", status: "idle", description: "Prompt optimization and injection prevention fixes", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "20m ago", tasksCompleted: 23, successRate: 93 },
  { id: "ra-4", name: "Tool Remediator", category: "remediator", status: "idle", description: "Tool configuration fixes and capability updates", model: "gpt-4o", provider: "OpenAI", lastRun: "30m ago", tasksCompleted: 15, successRate: 90 },
  { id: "ra-5", name: "Test Remediator", category: "remediator", status: "idle", description: "Test generation and coverage improvement", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "45m ago", tasksCompleted: 45, successRate: 88 },
  { id: "ra-6", name: "Runtime Remediator", category: "remediator", status: "idle", description: "Performance optimization and error resolution", model: "gpt-4o", provider: "OpenAI", lastRun: "1h ago", tasksCompleted: 19, successRate: 87 },
  { id: "ra-7", name: "Browser Remediator", category: "remediator", status: "idle", description: "UI/UX fixes from browser testing results", model: "claude-4-opus", provider: "Anthropic", lastRun: "1h ago", tasksCompleted: 28, successRate: 89 },
  { id: "ra-8", name: "Data Remediator", category: "remediator", status: "idle", description: "Data migration fixes and schema corrections", model: "claude-4-sonnet", provider: "Anthropic", lastRun: "2h ago", tasksCompleted: 11, successRate: 94 },
  { id: "ra-9", name: "Release Remediator", category: "remediator", status: "idle", description: "Release blocker resolution and deployment fixes", model: "claude-4-opus", provider: "Anthropic", lastRun: "3h ago", tasksCompleted: 8, successRate: 96 },
];

export const allAgents = [...workerAgents, ...auditorAgents, ...remediatorAgents];
