import { modelRoutingEngine } from "@/lib/model-routing-engine";
import { ollamaRuntimeService, type OllamaGenerateResult } from "@/lib/ollama-runtime-service";
import { openRouterProviderService, type OpenRouterChatResult } from "@/lib/openrouter-provider-service";
import type { ContextInjectionPacket } from "@/types/context";
import type { AgentRole, LocalInferenceRuntimeState, RoutingDecision, RoutingInput, TaskType } from "@/types/local-inference";
import type { ChatType } from "@/types/chat";
import type { AgentExecutionRun } from "@/types/workflow";

interface RoutedExecutionInput {
  prompt: string;
  systemPrompt: string;
  routingInput: RoutingInput;
  localInference: LocalInferenceRuntimeState;
  linked: {
    agentId?: string;
    taskId?: string;
    subtaskId?: string;
    chatSessionId: string;
    chatType: ChatType;
  };
  contextPacket: ContextInjectionPacket;
  taskType: TaskType;
}

interface RoutedExecutionOutput {
  run: AgentExecutionRun;
  outputText?: string;
}

const mapError = (result: OpenRouterChatResult | OllamaGenerateResult) => {
  if (result.executionState === "completed") return undefined;
  return { code: result.errorCode, message: result.errorMessage };
};

const normalizeBackend = (provider: "openrouter" | "ollama") => (provider === "ollama" ? "local" : "cloud");

const resolveAgentRole = (agentRole: AgentRole, taskType: TaskType): "worker" | "auditor" | "orchestrator" => {
  if (taskType === "planning") return "orchestrator";
  if (agentRole.includes("auditor")) return "auditor";
  return "worker";
};

export class RoutedAgentExecutionService {
  async execute(input: RoutedExecutionInput): Promise<RoutedExecutionOutput> {
    const startedAtIso = new Date().toISOString();
    const decision = modelRoutingEngine.chooseModel(input.routingInput, input.localInference.hybridModelRegistry);

    const primaryRun = await this.executeViaDecision(decision.selectedProvider, decision.selectedModelId, input, decision, false);
    if (primaryRun.run.status === "completed") {
      return primaryRun;
    }

    const canFallback = Boolean(
      input.routingInput.fallbackRequired !== false &&
      decision.fallbackModelId &&
      (decision.fallbackModelId !== decision.selectedModelId || decision.fallbackProvider !== decision.selectedProvider),
    );

    if (!canFallback) {
      return {
        run: {
          ...primaryRun.run,
          startedAtIso,
        },
      };
    }

    const fallbackRun = await this.executeViaDecision(decision.fallbackProvider, decision.fallbackModelId, input, decision, true, primaryRun.run.id);
    if (fallbackRun.run.status === "completed") {
      return fallbackRun;
    }

    return {
      run: {
        ...fallbackRun.run,
        startedAtIso,
        error: fallbackRun.run.error ?? primaryRun.run.error,
      },
    };
  }

  private async executeViaDecision(
    provider: "openrouter" | "ollama",
    modelId: string | null,
    input: RoutedExecutionInput,
    decision: RoutingDecision,
    usedFallback: boolean,
    previousRunId?: string,
  ): Promise<RoutedExecutionOutput> {
    const startedAtIso = new Date().toISOString();
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const model = input.localInference.hybridModelRegistry.find((entry) => entry.id === modelId && entry.provider === provider);
    const resolvedModelId = model?.providerModelId;

    if (!resolvedModelId) {
      return {
        run: {
          id: runId,
          agentId: input.linked.agentId,
          agentRole: resolveAgentRole(input.routingInput.agentRole, input.taskType),
          taskId: input.linked.taskId,
          subtaskId: input.linked.subtaskId,
          chatSessionId: input.linked.chatSessionId,
          chatType: input.linked.chatType,
          provider,
          backend: normalizeBackend(provider),
          modelId: modelId ?? "unresolved",
          providerModelId: "unresolved",
          routingDecision: decision,
          status: "failed",
          usedFallback,
          fallbackFromRunId: previousRunId,
          startedAtIso,
          endedAtIso: new Date().toISOString(),
          error: {
            code: "routing_model_unresolved",
            message: "Routing selected a model that is not available in the hybrid registry.",
          },
        },
      };
    }

    const executionPrompt = [
      `Role context: ${resolveAgentRole(input.routingInput.agentRole, input.taskType)}`,
      `Routing decision: ${decision.selectedProvider}/${decision.selectedModelId ?? "auto"} fallback ${decision.fallbackProvider}/${decision.fallbackModelId ?? "none"}.`,
      `Task context: ${input.contextPacket.summary}`,
      `Context snippets: ${input.contextPacket.snippets.map((snippet) => `${snippet.key}=${snippet.content}`).join(" | ")}`,
      input.prompt,
    ].join("\n\n");

    const result = provider === "openrouter"
      ? await openRouterProviderService.executeChatCompletion({
          model: resolvedModelId,
          userInput: executionPrompt,
          systemPrompt: input.systemPrompt,
        })
      : await ollamaRuntimeService.executeGenerate({
          model: resolvedModelId,
          prompt: executionPrompt,
          systemPrompt: input.systemPrompt,
        });

    const endedAtIso = new Date().toISOString();

    if (result.executionState === "completed") {
      return {
        run: {
          id: runId,
          agentId: input.linked.agentId,
          agentRole: resolveAgentRole(input.routingInput.agentRole, input.taskType),
          taskId: input.linked.taskId,
          subtaskId: input.linked.subtaskId,
          chatSessionId: input.linked.chatSessionId,
          chatType: input.linked.chatType,
          provider,
          backend: normalizeBackend(provider),
          modelId: modelId ?? resolvedModelId,
          providerModelId: result.model,
          routingDecision: decision,
          status: "completed",
          usedFallback,
          fallbackFromRunId: previousRunId,
          startedAtIso,
          endedAtIso,
          responsePayload: {
            text: result.outputText,
          },
        },
        outputText: result.outputText,
      };
    }

    return {
      run: {
        id: runId,
        agentId: input.linked.agentId,
        agentRole: resolveAgentRole(input.routingInput.agentRole, input.taskType),
        taskId: input.linked.taskId,
        subtaskId: input.linked.subtaskId,
        chatSessionId: input.linked.chatSessionId,
        chatType: input.linked.chatType,
        provider,
        backend: normalizeBackend(provider),
        modelId: modelId ?? resolvedModelId,
        providerModelId: resolvedModelId,
        routingDecision: decision,
        status: "failed",
        usedFallback,
        fallbackFromRunId: previousRunId,
        startedAtIso,
        endedAtIso,
        error: mapError(result),
      },
    };
  }
}

export const routedAgentExecutionService = new RoutedAgentExecutionService();
