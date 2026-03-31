import type { AgentRole, LocalModelRegistryEntry, ModelCapabilityTag, ModelPurposeTag, OllamaConnectionState } from "@/types/local-inference";

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 2500;

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    size?: number;
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

interface OllamaGenerateResponse {
  response?: string;
  done?: boolean;
  error?: string;
}

export interface OllamaRuntimeSnapshot {
  connection: OllamaConnectionState;
  modelRegistry: LocalModelRegistryEntry[];
}

export interface LocalRequestReadiness {
  ready: boolean;
  reason?: string;
}

export interface OllamaGenerateInput {
  model: string;
  prompt: string;
  systemPrompt?: string;
}

export interface OllamaGenerateSuccess {
  provider: "ollama";
  model: string;
  outputText: string;
  executionState: "completed";
  receivedAtIso: string;
}

export interface OllamaGenerateFailure {
  provider: "ollama";
  model: string;
  executionState: "failed";
  errorCode: "network_error" | "timeout" | "model_unavailable" | "provider_error" | "malformed_response";
  errorMessage: string;
  receivedAtIso: string;
}

export type OllamaGenerateResult = OllamaGenerateSuccess | OllamaGenerateFailure;

export class OllamaRuntimeService {
  constructor(
    private readonly baseUrl = DEFAULT_OLLAMA_BASE_URL,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async getRuntimeSnapshot(previousSelection?: string | null): Promise<OllamaRuntimeSnapshot> {
    const healthResult = await this.fetchWithTimeout("/api/version");
    const healthCheckIso = new Date().toISOString();

    if (!healthResult.ok) {
      return {
        connection: {
          serviceState: "unavailable",
          runtimeAvailable: false,
          connectionHealthy: false,
          lastHealthCheckIso: healthCheckIso,
          lastModelRefreshIso: null,
          selectedModelId: null,
          offlineReason: (healthResult as { ok: false; error: string }).error,
          failureState: "unreachable",
        },
        modelRegistry: [],
      };
    }

    const modelsResult = await this.fetchWithTimeout("/api/tags");

    if (!modelsResult.ok) {
      return {
        connection: {
          serviceState: "degraded",
          runtimeAvailable: true,
          connectionHealthy: false,
          lastHealthCheckIso: healthCheckIso,
          lastModelRefreshIso: null,
          selectedModelId: previousSelection ?? null,
          offlineReason: (modelsResult as { ok: false; error: string }).error,
          failureState: "model_registry_unavailable",
        },
        modelRegistry: [],
      };
    }

    const parsed = this.parseModels(modelsResult.data);

    if (!parsed.ok) {
      return {
        connection: {
          serviceState: "error",
          runtimeAvailable: true,
          connectionHealthy: false,
          lastHealthCheckIso: healthCheckIso,
          lastModelRefreshIso: null,
          selectedModelId: previousSelection ?? null,
          offlineReason: (parsed as { ok: false; error: string }).error,
          failureState: "malformed_response",
        },
        modelRegistry: [],
      };
    }

    const modelRegistry = parsed.models;
    const selectedModelId = this.resolveSelectedModel(previousSelection, modelRegistry);

    return {
      connection: {
        serviceState: modelRegistry.length > 0 ? "available" : "starting",
        runtimeAvailable: true,
        connectionHealthy: true,
        lastHealthCheckIso: healthCheckIso,
        lastModelRefreshIso: healthCheckIso,
        selectedModelId,
        offlineReason: modelRegistry.length === 0 ? "No local models found in Ollama registry." : undefined,
        failureState: modelRegistry.length === 0 ? "empty_model_registry" : undefined,
      },
      modelRegistry: modelRegistry.map((model) => ({
        ...model,
        status: model.id === selectedModelId ? "active" : "inactive",
      })),
    };
  }

  getRequestReadiness(modelId: string | null, modelRegistry: LocalModelRegistryEntry[]): LocalRequestReadiness {
    if (!modelId) {
      return { ready: false, reason: "No local model selected." };
    }

    const model = modelRegistry.find((entry) => entry.id === modelId);
    if (!model || model.localAvailability !== "available") {
      return { ready: false, reason: "Selected local model is unavailable." };
    }

    return { ready: true };
  }

  buildGeneratePayload(model: string, prompt: string) {
    return {
      model,
      prompt,
      stream: false,
    };
  }

  async executeGenerate(input: OllamaGenerateInput): Promise<OllamaGenerateResult> {
    const receivedAtIso = new Date().toISOString();
    const payload = this.buildGeneratePayload(
      input.model,
      input.systemPrompt?.trim() ? `${input.systemPrompt.trim()}\n\n${input.prompt}` : input.prompt,
    );
    const requestResult = await this.requestWithTimeout("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!requestResult.ok) {
      const error = (requestResult as { ok: false; error: string }).error;
      if (error === "ollama_timeout") {
        return {
          provider: "ollama",
          model: input.model,
          executionState: "failed",
          errorCode: "timeout",
          errorMessage: "Ollama generate request timed out.",
          receivedAtIso,
        };
      }

      if (error === "ollama_network_error") {
        return {
          provider: "ollama",
          model: input.model,
          executionState: "failed",
          errorCode: "network_error",
          errorMessage: "Unable to reach Ollama runtime.",
          receivedAtIso,
        };
      }

      if (error === "ollama_http_404") {
        return {
          provider: "ollama",
          model: input.model,
          executionState: "failed",
          errorCode: "model_unavailable",
          errorMessage: "Requested Ollama model is unavailable.",
          receivedAtIso,
        };
      }

      return {
        provider: "ollama",
        model: input.model,
        executionState: "failed",
        errorCode: "provider_error",
        errorMessage: "Ollama returned an error response.",
        receivedAtIso,
      };
    }

    const response = requestResult.data as OllamaGenerateResponse;
    if (typeof response.response !== "string" || response.response.trim().length === 0) {
      return {
        provider: "ollama",
        model: input.model,
        executionState: "failed",
        errorCode: "malformed_response",
        errorMessage: "Ollama response did not include text output.",
        receivedAtIso,
      };
    }

    return {
      provider: "ollama",
      model: input.model,
      outputText: response.response,
      executionState: "completed",
      receivedAtIso,
    };
  }

  private async fetchWithTimeout(path: string): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    const response = await this.requestWithTimeout(path, { method: "GET" });
    if (!response.ok) {
      const err = (response as { ok: false; error: string }).error;
      const mappedError = err === "ollama_timeout"
        ? "Connection to Ollama timed out."
        : err === "ollama_network_error"
          ? "Unable to reach Ollama runtime."
          : err.startsWith("ollama_http_")
            ? `HTTP ${err.replace("ollama_http_", "")} from Ollama.`
            : err;
      return { ok: false, error: mappedError };
    }
    return response;
  }

  private async requestWithTimeout(path: string, init: RequestInit): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, error: `ollama_http_${response.status}` };
      }

      const data: unknown = await response.json();
      return { ok: true, data };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: "ollama_timeout" };
      }

      return {
        ok: false,
        error: "ollama_network_error",
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private parseModels(payload: unknown): { ok: true; models: LocalModelRegistryEntry[] } | { ok: false; error: string } {
    if (!payload || typeof payload !== "object") {
      return { ok: false, error: "Ollama /api/tags returned non-object payload." };
    }

    const response = payload as OllamaTagsResponse;
    if (!Array.isArray(response.models)) {
      return { ok: false, error: "Ollama /api/tags missing models array." };
    }

    const nowIso = new Date().toISOString();

    const models = response.models
      .filter((model): model is NonNullable<OllamaTagsResponse["models"]>[number] => Boolean(model?.name))
      .map((model) => {
        const modelName = model.name ?? "unknown";
        const estimatedSizeGb = model.size ? Number((model.size / 1024 / 1024 / 1024).toFixed(1)) : 0;

        return {
          id: modelName.replace(/[:.]/g, "-"),
          name: modelName,
          displayName: this.toDisplayName(modelName),
          weightClass: this.estimateWeightClass(estimatedSizeGb),
          estimatedSizeGb,
          localAvailability: "available" as const,
          purposeTags: ["general", "privacy"] as ModelPurposeTag[],
          capabilityTags: ["privacy_sensitive_local_use", "tool_reasoning"] as ModelCapabilityTag[],
          recommendedAgentRoles: ["worker", "planner"] as AgentRole[],
          memoryCostGb: estimatedSizeGb > 0 ? Math.ceil(estimatedSizeGb * 1.35) : undefined,
          metadataCompleteness: "placeholder" as const,
          lastSeenIso: nowIso,
          status: "inactive" as const,
        };
      });

    return { ok: true, models };
  }

  private resolveSelectedModel(previousSelection: string | null | undefined, models: LocalModelRegistryEntry[]): string | null {
    if (previousSelection && models.some((model) => model.id === previousSelection)) {
      return previousSelection;
    }

    return models[0]?.id ?? null;
  }

  private toDisplayName(modelName: string): string {
    return modelName
      .replace(/[:.-]/g, " ")
      .replace(/\b\w/g, (segment) => segment.toUpperCase())
      .trim();
  }

  private estimateWeightClass(sizeGb: number): LocalModelRegistryEntry["weightClass"] {
    if (sizeGb >= 30) return "xlarge";
    if (sizeGb >= 12) return "large";
    if (sizeGb >= 6) return "medium";
    if (sizeGb >= 2) return "small";
    return "tiny";
  }
}

export const ollamaRuntimeService = new OllamaRuntimeService();
