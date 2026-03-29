export interface Provider {
  id: string;
  name: string;
  type: "built-in" | "custom" | "self-hosted";
  status: "connected" | "disconnected" | "degraded";
  models: string[];
  capabilities: string[];
  costTier: "low" | "medium" | "high" | "enterprise";
  privacyMode: boolean;
  fallbackEnabled: boolean;
  requestsToday: number;
  avgLatency: number;
  compatible?: string;
}

export const cloudAndCustomProviders: Provider[] = [
  { id: "p-1", name: "OpenRouter", type: "built-in", status: "connected", models: ["openai/o3", "openai/gpt-4.1", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro"], capabilities: ["chat", "code", "routing", "function-calling", "structured-output"], costTier: "medium", privacyMode: false, fallbackEnabled: true, requestsToday: 3512, avgLatency: 330 },
  { id: "p-2", name: "OpenAI (direct)", type: "built-in", status: "degraded", models: ["gpt-4o", "o3-mini"], capabilities: ["chat", "code"], costTier: "high", privacyMode: false, fallbackEnabled: true, requestsToday: 187, avgLatency: 310 },
  { id: "p-3", name: "Anthropic (direct)", type: "built-in", status: "degraded", models: ["claude-4-opus", "claude-4-sonnet"], capabilities: ["chat", "code", "long-context"], costTier: "high", privacyMode: false, fallbackEnabled: true, requestsToday: 96, avgLatency: 290 },
  { id: "p-7", name: "Custom Gateway", type: "custom", status: "disconnected", models: [], capabilities: [], costTier: "enterprise", privacyMode: true, fallbackEnabled: false, requestsToday: 0, avgLatency: 0, compatible: "OpenAI-compatible" },
];

export const providers = cloudAndCustomProviders;

export const providerCategories = [
  { label: "Built-in Providers", count: 3 },
  { label: "Custom Providers", count: 1 },
  { label: "OpenAI-compatible", count: 0 },
  { label: "Anthropic-compatible", count: 0 },
  { label: "Self-hosted", count: 1 },
  { label: "Enterprise Gateways", count: 0 },
];
