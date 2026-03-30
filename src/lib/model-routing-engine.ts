import type {
  AgentBackendAssignment,
  HybridModelRegistryEntry,
  ModelProvider,
  RoutingDecision,
  RoutingInput,
  RoutingProfile,
} from "@/types/local-inference";

const PROFILE_BY_TASK: Record<RoutingInput["taskType"], RoutingProfile> = {
  planning: "balanced",
  architecture: "deep_reasoning",
  frontend: "code_heavy",
  backend: "code_heavy",
  coding: "code_heavy",
  review: "balanced",
  audit: "audit_strict",
  security: "audit_strict",
  release: "release_critical",
};

const COST_ORDER: Record<HybridModelRegistryEntry["costTier"], number> = { low: 0, medium: 1, high: 2, premium: 3 };
const TIER_SCORE: Record<HybridModelRegistryEntry["qualityTier"], number> = { low: 1, medium: 2, high: 3, premium: 4 };

export class ModelRoutingEngine {
  chooseModel(input: RoutingInput, models: HybridModelRegistryEntry[]): RoutingDecision {
    const localOnly = input.localOnly || input.routingMode === "local_only" || input.privacyMode === "strict_local";
    const openRouterAvailable = input.openRouterAvailable ?? true;
    const ollamaAvailable = input.ollamaAvailable ?? true;
    const profile = this.resolveProfile(input, localOnly);
    const rankKey = this.resolveRankKey(profile, input.taskType);
    const maxCostTier = this.resolveMaxCost(profile, input.maxCostTier);
    const budgetPressure = input.budgetPressure ?? "low";
    const privacyAffected = input.privacyMode !== "standard" || localOnly || profile === "local_private";
    const costAffected = Boolean(maxCostTier) || input.appModeProfile === "cheap_fast" || budgetPressure !== "low";
    const qualityAffected = input.appModeProfile === "quality_first" || input.releaseCritical || profile === "release_critical";
    const overrideApplied = Boolean(input.operatorOverride?.provider || input.operatorOverride?.modelId);

    if (localOnly) {
      const localPrimary = this.pickBest(models, "ollama", rankKey, maxCostTier);
      return {
        profile,
        selectedProvider: "ollama",
        selectedModelId: localPrimary?.id ?? null,
        fallbackProvider: "ollama",
        fallbackModelId: localPrimary?.id ?? null,
        usedFallback: false,
        deploymentTarget: "local",
        privacyAffected: true,
        costAffected,
        qualityAffected,
        overrideApplied,
        resolution: localPrimary ? "resolved" : "error",
        errorCode: localPrimary ? undefined : "no_available_model",
        reason: localPrimary ? "privacy_local_only" : "privacy_local_only_no_model",
      };
    }

    const providerChain = this.resolveProviderChain(input, budgetPressure);
    const candidateProviders = providerChain.filter((provider) => {
      if (provider === "openrouter") return openRouterAvailable;
      return ollamaAvailable;
    });
    const selected = candidateProviders
      .map((provider) => this.pickBest(models, provider, rankKey, maxCostTier))
      .find((model): model is HybridModelRegistryEntry => Boolean(model));

    const selectedProvider = input.operatorOverride?.provider ?? selected?.provider ?? candidateProviders[0] ?? providerChain[0] ?? "ollama";
    const selectedModel = this.resolveSelectedModel(selectedProvider, selected?.id ?? null, input, models, rankKey, maxCostTier);
    const fallbackProvider = this.resolveFallbackProvider(selectedProvider, providerChain, input.fallbackProvider);
    const fallbackModel = this.resolveFallbackModel(fallbackProvider, selectedModel, input, models, rankKey, maxCostTier, input.releaseCritical);
    const usedFallback = !selected && fallbackModel !== null;
    const degradedMode = Boolean(input.degradedMode || budgetPressure === "critical");

    return {
      profile,
      selectedProvider,
      selectedModelId: selectedModel,
      fallbackProvider,
      fallbackModelId: fallbackModel,
      usedFallback,
      deploymentTarget: selectedProvider === "openrouter" ? "cloud" : "local",
      privacyAffected,
      costAffected,
      qualityAffected,
      overrideApplied,
      resolution: selectedModel ? "resolved" : "error",
      errorCode: selectedModel ? undefined : candidateProviders.length === 0 ? "no_available_provider" : "no_available_model",
      reason: this.buildReason(profile, input, usedFallback, selectedModel, selectedProvider),
      degradedMode,
      budgetPressure,
    };
  }

  assignAgents(assignments: AgentBackendAssignment[], models: HybridModelRegistryEntry[]) {
    return assignments.map((assignment) => {
      const taskType = assignment.agentRole.includes("auditor") ? "audit" : assignment.agentRole === "planner" ? "planning" : "coding";
      const decision = this.chooseModel(
        {
          agentRole: assignment.agentRole,
          taskType,
          privacyMode: assignment.routingMode === "sensitive_local_only" || assignment.routingMode === "local_only" ? "strict_local" : "standard",
          routingMode: assignment.routingMode,
          preferredBackend: assignment.preferredBackend,
          preferredProvider: assignment.preferredProvider,
          preferredModelId: assignment.preferredModelId,
          fallbackProvider: assignment.fallbackProvider,
          fallbackModelId: assignment.fallbackModelId,
          fallbackRequired: true,
        },
        models,
      );

      return {
        ...assignment,
        routingProfile: decision.profile,
        preferredProvider: decision.selectedProvider,
        preferredModelId: decision.selectedModelId ?? undefined,
        fallbackProvider: decision.fallbackProvider,
        fallbackModelId: decision.fallbackModelId ?? undefined,
      };
    });
  }

  private pickBest(
    models: HybridModelRegistryEntry[],
    provider: ModelProvider,
    rankKey: "codingSuitability" | "auditSuitability" | "qualityTier",
    maxCostTier?: HybridModelRegistryEntry["costTier"],
  ): HybridModelRegistryEntry | undefined {
    const filtered = models.filter((model) => {
      if (model.provider !== provider || model.availability !== "available") {
        return false;
      }

      if (!maxCostTier) {
        return true;
      }

      return COST_ORDER[model.costTier] <= COST_ORDER[maxCostTier];
    });

    return filtered.sort((a, b) => {
      const rank = TIER_SCORE[b[rankKey]] - TIER_SCORE[a[rankKey]];
      if (rank !== 0) {
        return rank;
      }
      return TIER_SCORE[b.speedTier === "fast" ? "high" : b.speedTier === "balanced" ? "medium" : "low"] - TIER_SCORE[a.speedTier === "fast" ? "high" : a.speedTier === "balanced" ? "medium" : "low"];
    })[0];
  }

  private resolveProfile(input: RoutingInput, localOnly: boolean): RoutingProfile {
    if (localOnly || input.appModeProfile === "local_only" || input.appModeProfile === "privacy_first") return "local_private";
    if (input.releaseCritical || input.taskType === "release") return "release_critical";
    if (input.agentRole === "architect") return "deep_reasoning";
    if (input.agentRole === "frontend" || input.agentRole === "backend" || input.taskType === "coding") return "code_heavy";
    if (input.agentRole.includes("auditor") || input.taskType === "audit" || input.taskType === "security") return "audit_strict";
    if (input.appModeProfile === "cheap_fast") return "cheap_fast";
    if (input.appModeProfile === "quality_first") return "deep_reasoning";
    return PROFILE_BY_TASK[input.taskType] ?? "balanced";
  }

  private resolveRankKey(profile: RoutingProfile, taskType: RoutingInput["taskType"]) {
    if (profile === "code_heavy" || taskType === "frontend" || taskType === "backend" || taskType === "coding") return "codingSuitability" as const;
    if (profile === "audit_strict" || profile === "release_critical" || taskType === "audit" || taskType === "security" || taskType === "release") return "auditSuitability" as const;
    return "qualityTier" as const;
  }

  private resolveMaxCost(profile: RoutingProfile, requested?: HybridModelRegistryEntry["costTier"]) {
    if (profile === "cheap_fast") return "medium" as const;
    return requested;
  }

  private resolveProviderChain(input: RoutingInput, budgetPressure: RoutingInput["budgetPressure"]): ModelProvider[] {
    if (budgetPressure === "high" || budgetPressure === "critical") {
      const forceLocal: ModelProvider[] = ["ollama", "openrouter"];
      return forceLocal;
    }
    const preferred = input.operatorOverride?.provider ?? input.preferredProvider ?? (input.preferredBackend === "local" || input.preferredBackend === "ollama" ? "ollama" : "openrouter");
    const fallback = input.fallbackProvider ?? (preferred === "openrouter" ? "ollama" : "openrouter");
    return [preferred, fallback, preferred === "openrouter" ? "ollama" : "openrouter"].filter((value, index, all) => all.indexOf(value) === index);
  }

  private resolveSelectedModel(
    provider: ModelProvider,
    discoveredModelId: string | null,
    input: RoutingInput,
    models: HybridModelRegistryEntry[],
    rankKey: "codingSuitability" | "auditSuitability" | "qualityTier",
    maxCostTier?: HybridModelRegistryEntry["costTier"],
  ) {
    if (input.operatorOverride?.modelId) return input.operatorOverride.modelId;
    if (input.preferredModelId) return input.preferredModelId;
    if (discoveredModelId) return discoveredModelId;
    return this.pickBest(models, provider, rankKey, maxCostTier)?.id ?? null;
  }

  private resolveFallbackProvider(selectedProvider: ModelProvider, providerChain: ModelProvider[], explicitFallback?: ModelProvider) {
    if (explicitFallback) return explicitFallback;
    return providerChain.find((provider) => provider !== selectedProvider) ?? selectedProvider;
  }

  private resolveFallbackModel(
    fallbackProvider: ModelProvider,
    selectedModel: string | null,
    input: RoutingInput,
    models: HybridModelRegistryEntry[],
    rankKey: "codingSuitability" | "auditSuitability" | "qualityTier",
    maxCostTier?: HybridModelRegistryEntry["costTier"],
    releaseCritical?: boolean,
  ) {
    if (input.fallbackModelId) return input.fallbackModelId;
    const fallback = this.pickBest(models, fallbackProvider, rankKey, maxCostTier)?.id ?? null;
    if (releaseCritical && input.blockWeakFallbackForRelease && fallback) {
      const selectedTier = models.find((model) => model.id === selectedModel)?.qualityTier;
      const fallbackTier = models.find((model) => model.id === fallback)?.qualityTier;
      if (selectedTier && fallbackTier && TIER_SCORE[fallbackTier] < TIER_SCORE[selectedTier]) {
        return null;
      }
    }
    if (fallback && fallback !== selectedModel) return fallback;
    return selectedModel;
  }

  private buildReason(
    profile: RoutingProfile,
    input: RoutingInput,
    usedFallback: boolean,
    selectedModelId: string | null,
    selectedProvider: ModelProvider,
  ) {
    if (!selectedModelId) return "no_route_available";
    const reasons = [`profile_${profile}`, `provider_${selectedProvider}`];
    if (input.releaseCritical) reasons.push("release_critical");
    if (input.privacyMode !== "standard" || input.localOnly) reasons.push("privacy_policy");
    if (input.appModeProfile === "cheap_fast") reasons.push("cost_mode");
    if (input.appModeProfile === "quality_first") reasons.push("quality_mode");
    if (usedFallback) reasons.push("fallback_selected");
    if (input.operatorOverride?.provider || input.operatorOverride?.modelId) reasons.push("operator_override");
    return reasons.join("|");
  }
}

export const modelRoutingEngine = new ModelRoutingEngine();
