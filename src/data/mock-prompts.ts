export interface PromptChainStep {
  id: string;
  name: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  tokens?: number;
  duration?: string;
}

export interface PromptEntry {
  id: string;
  title: string;
  category: string;
  version: number;
  rating: number;
  usageCount: number;
  lastUsed: string;
  isFavorite: boolean;
  content?: string;
}

export const promptChainSteps: PromptChainStep[] = [
  { id: "ps-1", name: "Requirements Extraction", agent: "Product Discovery Agent", status: "completed", tokens: 2340, duration: "12s" },
  { id: "ps-2", name: "Architecture Planning", agent: "Architect Agent", status: "completed", tokens: 4120, duration: "18s" },
  { id: "ps-3", name: "Prompt Generation", agent: "Prompt Generator Agent", status: "completed", tokens: 1890, duration: "8s" },
  { id: "ps-4", name: "Instruction Generation", agent: "Instruction Generator Agent", status: "running", tokens: 1200, duration: "6s" },
  { id: "ps-5", name: "Tool Plan Generation", agent: "Tool Generator Agent", status: "pending" },
  { id: "ps-6", name: "Frontend Implementation", agent: "Frontend Agent", status: "pending" },
  { id: "ps-7", name: "Backend Implementation", agent: "Backend Agent", status: "pending" },
  { id: "ps-8", name: "Database Setup", agent: "Supabase Agent", status: "pending" },
  { id: "ps-9", name: "Code Audit", agent: "Code Auditor", status: "pending" },
  { id: "ps-10", name: "Security Audit", agent: "Security Auditor", status: "pending" },
  { id: "ps-11", name: "Test Generation", agent: "Test Remediator", status: "pending" },
  { id: "ps-12", name: "Deploy", agent: "Deploy Agent", status: "pending" },
];

export const promptLibrary: PromptEntry[] = [
  { id: "pl-1", title: "Full-Stack SaaS Scaffold", category: "Generated Prompts", version: 3, rating: 4.8, usageCount: 24, lastUsed: "2h ago", isFavorite: true },
  { id: "pl-2", title: "Supabase Auth Flow", category: "Project Prompts", version: 2, rating: 4.5, usageCount: 18, lastUsed: "1d ago", isFavorite: false },
  { id: "pl-3", title: "React Component Generator", category: "Agent Instructions", version: 5, rating: 4.9, usageCount: 67, lastUsed: "30m ago", isFavorite: true },
  { id: "pl-4", title: "Security Hardening Checklist", category: "Tool Plans", version: 1, rating: 4.2, usageCount: 8, lastUsed: "3d ago", isFavorite: false },
  { id: "pl-5", title: "API Design Pattern", category: "My Prompts", version: 4, rating: 4.6, usageCount: 31, lastUsed: "5h ago", isFavorite: true },
  { id: "pl-6", title: "Database Schema Generator", category: "Prompt Chains", version: 2, rating: 4.7, usageCount: 15, lastUsed: "1d ago", isFavorite: false },
];

export const promptStudioTabs = [
  "Human Input",
  "Requirements",
  "Generated Prompt",
  "Instructions",
  "Tool Plan",
  "Prompt Audit",
  "Evaluation",
  "Execution Package",
];

export const promptLibraryTabs = [
  "Все",
  "Избранное",
  "My Prompts",
  "Импортированные",
];
