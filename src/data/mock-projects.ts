export interface Project {
  id: string;
  name: string;
  description: string;
  mode: "plan" | "build" | "audit" | "release";
  status: "active" | "paused" | "completed";
  progress: number;
  lastActivity: string;
  agents: number;
  files: number;
  promptChains: number;
}

export const projects: Project[] = [
  { id: "proj-1", name: "SaaS Dashboard", description: "Full-stack analytics dashboard with real-time data", mode: "build", status: "active", progress: 67, lastActivity: "2m ago", agents: 8, files: 142, promptChains: 12 },
  { id: "proj-2", name: "E-Commerce Platform", description: "Multi-vendor marketplace with payment integration", mode: "plan", status: "active", progress: 23, lastActivity: "15m ago", agents: 4, files: 34, promptChains: 5 },
  { id: "proj-3", name: "Mobile API Backend", description: "REST/GraphQL API for mobile application", mode: "audit", status: "active", progress: 89, lastActivity: "1h ago", agents: 12, files: 87, promptChains: 18 },
  { id: "proj-4", name: "AI Chat Widget", description: "Embeddable chat widget with RAG capabilities", mode: "release", status: "active", progress: 95, lastActivity: "30m ago", agents: 6, files: 56, promptChains: 8 },
];

export const currentProject = projects[0];
