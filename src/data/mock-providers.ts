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

export const providers: Provider[] = [
  { id: "p-1", name: "OpenAI", type: "built-in", status: "connected", models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3", "o3-mini"], capabilities: ["chat", "code", "vision", "function-calling", "embedding"], costTier: "high", privacyMode: false, fallbackEnabled: true, requestsToday: 1247, avgLatency: 320 },
  { id: "p-2", name: "Anthropic", type: "built-in", status: "connected", models: ["claude-4-opus", "claude-4-sonnet", "claude-3.5-haiku"], capabilities: ["chat", "code", "vision", "function-calling", "long-context"], costTier: "high", privacyMode: false, fallbackEnabled: true, requestsToday: 2341, avgLatency: 280 },
  { id: "p-3", name: "Gemini", type: "built-in", status: "connected", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"], capabilities: ["chat", "code", "vision", "function-calling", "multimodal"], costTier: "medium", privacyMode: false, fallbackEnabled: true, requestsToday: 456, avgLatency: 250 },
  { id: "p-4", name: "Grok", type: "built-in", status: "connected", models: ["grok-3", "grok-3-mini"], capabilities: ["chat", "code", "function-calling"], costTier: "medium", privacyMode: false, fallbackEnabled: false, requestsToday: 89, avgLatency: 340 },
  { id: "p-5", name: "DeepSeek", type: "built-in", status: "connected", models: ["deepseek-r1", "deepseek-v3", "deepseek-coder"], capabilities: ["chat", "code", "reasoning", "function-calling"], costTier: "low", privacyMode: false, fallbackEnabled: true, requestsToday: 234, avgLatency: 420 },
  { id: "p-6", name: "Ollama Local Runtime", type: "self-hosted", status: "connected", models: ["qwen3-coder:14b", "llama3.3:70b-instruct", "phi4:mini", "mistral-small:3.1"], capabilities: ["chat", "code", "local-inference", "privacy-local"], costTier: "low", privacyMode: true, fallbackEnabled: true, requestsToday: 912, avgLatency: 640 },
  { id: "p-7", name: "Custom Gateway", type: "custom", status: "disconnected", models: [], capabilities: [], costTier: "enterprise", privacyMode: true, fallbackEnabled: false, requestsToday: 0, avgLatency: 0, compatible: "OpenAI-compatible" },
];

export const providerCategories = [
  { label: "Built-in Providers", count: 5 },
  { label: "Custom Providers", count: 1 },
  { label: "OpenAI-compatible", count: 0 },
  { label: "Anthropic-compatible", count: 0 },
  { label: "Self-hosted", count: 1 },
  { label: "Enterprise Gateways", count: 0 },
];
