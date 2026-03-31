import type { CloudProviderConfigState, HybridModelRegistryEntry } from "@/types/local-inference";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 25000;

type SafeResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface OpenRouterModelsResponse {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number;
  }>;
}

interface OpenRouterChatResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export type OpenRouterExecutionState = "idle" | "sending" | "waiting" | "streaming_ready" | "completed" | "failed";

export interface OpenRouterChatInput {
  model: string;
  userInput: string;
  systemPrompt?: string;
  contextMessages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
}

export interface OpenRouterChatSuccess {
  provider: "openrouter";
  model: string;
  outputText: string;
  executionState: "completed";
  responseId?: string;
  finishReason?: string;
  receivedAtIso: string;
}

export interface OpenRouterChatFailure {
  provider: "openrouter";
  model: string;
  executionState: "failed";
  errorCode:
    | "rate_limited"
    | "temporary_unavailable"
    | "missing_api_key"
    | "invalid_api_key"
    | "network_error"
    | "timeout"
    | "model_unavailable"
    | "malformed_response"
    | "provider_error";
  errorMessage: string;
  retryAfterSeconds?: number;
  transient?: boolean;
  receivedAtIso: string;
}

export type OpenRouterChatResult = OpenRouterChatSuccess | OpenRouterChatFailure;

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

  async executeChatCompletion(input: OpenRouterChatInput): Promise<OpenRouterChatResult> {
    const apiKey = this.resolveApiKey();
    const receivedAtIso = new Date().toISOString();

    if (!apiKey) {
      return {
        provider: "openrouter",
        model: input.model,
        executionState: "failed",
        errorCode: "missing_api_key",
        errorMessage: "OPENROUTER_API_KEY is not configured.",
        receivedAtIso,
      };
    }

    const payload = this.buildChatCompletionsRequest(input.model, this.buildMessages(input), input.temperature ?? 0.2);
    const requestResult = await this.fetchWithTimeout("/chat/completions", apiKey, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!requestResult.ok) {
      const error = (requestResult as { ok: false; error: string }).error;
      if (error === "openrouter_timeout") {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "timeout",
          errorMessage: "OpenRouter request timed out.",
          receivedAtIso,
        };
      }

      if (error === "openrouter_network_error") {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "network_error",
          errorMessage: "Unable to reach OpenRouter. Check network connectivity.",
          receivedAtIso,
        };
      }

      if (error === "openrouter_http_401" || error === "openrouter_http_403") {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "invalid_api_key",
          errorMessage: "OpenRouter authentication failed. Verify OPENROUTER_API_KEY.",
          receivedAtIso,
        };
      }

      if (error === "openrouter_http_404") {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "model_unavailable",
          errorMessage: "Selected model is not available on OpenRouter.",
          receivedAtIso,
        };
      }

      if (error === "openrouter_http_429") {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "rate_limited",
          errorMessage: "OpenRouter rate limited this request.",
          retryAfterSeconds: 30,
          transient: true,
          receivedAtIso,
        };
      }

      if (error.startsWith("openrouter_http_5")) {
        return {
          provider: "openrouter",
          model: input.model,
          executionState: "failed",
          errorCode: "temporary_unavailable",
          errorMessage: "OpenRouter is temporarily unavailable.",
          transient: true,
          receivedAtIso,
        };
      }

      return {
        provider: "openrouter",
        model: input.model,
        executionState: "failed",
        errorCode: "provider_error",
        errorMessage: "OpenRouter returned an error response.",
        transient: true,
        receivedAtIso,
      };
    }

    const response = requestResult.data as OpenRouterChatResponse;
    const outputText = response.choices?.[0]?.message?.content;

    if (typeof outputText !== "string" || outputText.trim().length === 0) {
      return {
        provider: "openrouter",
        model: input.model,
        executionState: "failed",
        errorCode: "malformed_response",
        errorMessage: "OpenRouter response did not contain assistant text.",
        receivedAtIso,
      };
    }

    return {
      provider: "openrouter",
      model: response.model ?? input.model,
      outputText,
      executionState: "completed",
      responseId: response.id,
      finishReason: response.choices?.[0]?.finish_reason,
      receivedAtIso,
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
          failureState: (health as { ok: false; error: string }).error,
        },
        models: [],
      };
    }

    const modelsResult = await this.fetchModels(apiKey);

    if (!modelsResult.ok) {
      return {
        config: {
          provider: "openrouter",
          enabled: true,
          active: true,
          apiKeyConfigured: true,
          status: "degraded",
          baseUrl: this.baseUrl,
          lastHealthCheckIso: nowIso,
          failureState: (modelsResult as { ok: false; error: string }).error,
        },
        models: [],
      };
    }

    return {
      config: {
        provider: "openrouter",
        enabled: true,
        active: true,
        apiKeyConfigured: true,
        status: "connected",
        baseUrl: this.baseUrl,
        lastHealthCheckIso: nowIso,
      },
      models: modelsResult.data,
    };
  }

  buildChatCompletionsRequest(model: string, messages: Array<{ role: string; content: string }>, temperature = 0.2) {
    return {
      model,
      messages,
      temperature,
    };
  }

  private buildMessages(input: OpenRouterChatInput) {
    const systemMessage = input.systemPrompt?.trim()
      ? [{ role: "system" as const, content: input.systemPrompt.trim() }]
      : [];

    return [...systemMessage, ...(input.contextMessages ?? []), { role: "user" as const, content: input.userInput }];
  }

  private async healthCheck(apiKey: string): Promise<SafeResult<true>> {
    const response = await this.fetchWithTimeout("/models", apiKey, { method: "GET" });
    if (!response.ok) {
      return response as { ok: false; error: string };
    }
    return { ok: true, data: true };
  }

  private async fetchModels(apiKey: string): Promise<SafeResult<HybridModelRegistryEntry[]>> {
    const response = await this.fetchWithTimeout("/models", apiKey, { method: "GET" });
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

  private async fetchWithTimeout(
    path: string,
    apiKey: string,
    init: Pick<RequestInit, "method" | "body">,
  ): Promise<SafeResult<unknown>> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
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
    return import.meta.env.OPENROUTER_API_KEY as string | undefined;
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
