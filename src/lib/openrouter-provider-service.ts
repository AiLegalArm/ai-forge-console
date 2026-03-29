import type { CloudProviderConfigState, HybridModelRegistryEntry } from "@/types/local-inference";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 4000;

type SafeResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface OpenRouterModelsResponse {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number;
  }>;
}

export interface OpenRouterSnapshot {
  config: CloudProviderConfigState;
  models: HybridModelRegistryEntry[];
}

export class OpenRouterProviderService {
  constructor(
    private readonly baseUrl = (import.meta.env.VITE_OPENROUTER_BASE_URL as string | undefined) ?? DEFAULT_OPENROUTER_BASE_URL,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  getConfigState(): CloudProviderConfigState {
    const apiKey = this.resolveApiKey();
    const configured = Boolean(apiKey);

    return {
      provider: "openrouter",
      enabled: configured,
      active: configured,
      apiKeyConfigured: configured,
      status: configured ? "degraded" : "disconnected",
      baseUrl: this.baseUrl,
      lastHealthCheckIso: null,
      failureState: configured ? "unchecked" : "missing_api_key",
    };
  }

  async getProviderSnapshot(): Promise<OpenRouterSnapshot> {
    const apiKey = this.resolveApiKey();
    const nowIso = new Date().toISOString();

    if (!apiKey) {
      return {
        config: {
          ...this.getConfigState(),
          status: "disconnected",
          enabled: false,
          active: false,
          lastHealthCheckIso: nowIso,
          failureState: "missing_api_key",
        },
        models: [],
      };
    }

    const health = await this.healthCheck(apiKey);
    if (!health.ok) {
      return {
        config: {
          provider: "openrouter",
          enabled: true,
          active: false,
          apiKeyConfigured: true,
          status: "error",
          baseUrl: this.baseUrl,
          lastHealthCheckIso: nowIso,
          failureState: health.ok ? undefined : health.error,
        },
        models: [],
      };
    }

    const modelsResult = await this.fetchModels(apiKey);

    return {
      config: {
        provider: "openrouter",
        enabled: true,
        active: true,
        apiKeyConfigured: true,
          status: modelsResult.ok ? "connected" : "degraded",
          baseUrl: this.baseUrl,
          lastHealthCheckIso: nowIso,
          failureState: !modelsResult.ok ? modelsResult.error : undefined,
      },
      models: modelsResult.ok ? modelsResult.data : [],
    };
  }

  buildChatCompletionsRequest(model: string, messages: Array<{ role: string; content: string }>, temperature = 0.2) {
    return {
      model,
      messages,
      temperature,
    };
  }

  private async healthCheck(apiKey: string): Promise<SafeResult<true>> {
    const response = await this.fetchWithTimeout("/models", apiKey);
    if (!response.ok) {
      return response as { ok: false; error: string };
    }
    return { ok: true, data: true };
  }

  private async fetchModels(apiKey: string): Promise<SafeResult<HybridModelRegistryEntry[]>> {
    const response = await this.fetchWithTimeout("/models", apiKey);
    if (!response.ok) {
      return response as { ok: false; error: string };
    }

    const payload = response.data as OpenRouterModelsResponse;
    const models = payload.data ?? [];

    const normalized = models
      .filter((model) => typeof model.id === "string" && model.id.length > 0)
      .slice(0, 30)
      .map((model): HybridModelRegistryEntry => {
        const modelId = model.id ?? "unknown";
        const displayName = model.name ?? modelId;
        const contextLength = model.context_length ?? 0;

        return {
          id: `openrouter-${modelId.replace(/[/:.]/g, "-")}`,
          provider: "openrouter",
          providerModelId: modelId,
          displayName,
          costTier: this.rankCost(modelId),
          qualityTier: this.rankQuality(modelId),
          speedTier: this.rankSpeed(modelId),
          contextSuitability: contextLength >= 128000 ? "premium" : contextLength >= 64000 ? "high" : "medium",
          codingSuitability: /coder|code|gpt|claude|qwen|deepseek/i.test(modelId) ? "high" : "medium",
          auditSuitability: /reason|r1|o1|o3|claude|gpt/i.test(modelId) ? "high" : "medium",
          reviewSuitability: /claude|gpt|gemini|qwen/i.test(modelId) ? "high" : "medium",
          structuredOutputSuitability: /gpt|claude|gemini|qwen|llama/i.test(modelId) ? "high" : "medium",
          availability: "available",
        };
      });

    return { ok: true, data: normalized };
  }

  private async fetchWithTimeout(path: string, apiKey: string): Promise<SafeResult<unknown>> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { ok: false, error: `openrouter_http_${response.status}` };
      }

      const data: unknown = await response.json();
      return { ok: true, data };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: "openrouter_timeout" };
      }

      return {
        ok: false,
        error: "openrouter_network_error",
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private resolveApiKey(): string | undefined {
    const fromRuntime = import.meta.env.OPENROUTER_API_KEY as string | undefined;
    const fromVite = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
    return fromRuntime ?? fromVite;
  }

  private rankCost(modelId: string): HybridModelRegistryEntry["costTier"] {
    if (/mini|haiku|flash|small|free/i.test(modelId)) return "low";
    if (/sonnet|medium/i.test(modelId)) return "medium";
    if (/opus|pro|o1|o3/i.test(modelId)) return "premium";
    return "high";
  }

  private rankQuality(modelId: string): HybridModelRegistryEntry["qualityTier"] {
    if (/opus|o1|o3|r1|pro/i.test(modelId)) return "premium";
    if (/sonnet|gpt-4|gemini-2.5|qwen3/i.test(modelId)) return "high";
    if (/mini|flash|haiku|small/i.test(modelId)) return "medium";
    return "high";
  }

  private rankSpeed(modelId: string): HybridModelRegistryEntry["speedTier"] {
    if (/mini|flash|haiku|small/i.test(modelId)) return "fast";
    if (/opus|o1|o3|r1|70b/i.test(modelId)) return "slow";
    return "balanced";
  }
}

export const openRouterProviderService = new OpenRouterProviderService();
