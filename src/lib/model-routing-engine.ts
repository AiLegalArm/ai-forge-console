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

export class ModelRoutingEngine {
  chooseModel(input: RoutingInput, models: HybridModelRegistryEntry[]): RoutingDecision {
    const profile = input.privacyMode === "strict_local" ? "local_private" : PROFILE_BY_TASK[input.taskType] ?? "balanced";

    if (profile === "local_private") {
      const localPrimary = this.pickBest(models, "ollama", "codingSuitability", input.maxCostTier);
      return {
        profile,
        selectedProvider: "ollama",
        selectedModelId: localPrimary?.id ?? null,
        fallbackProvider: "ollama",
        fallbackModelId: localPrimary?.id ?? null,
        reason: "privacy_strict_local",
      };
    }

    const primaryProvider: ModelProvider = input.preferredBackend === "ollama" || input.preferredBackend === "local" ? "ollama" : "openrouter";
    const fallbackProvider: ModelProvider = primaryProvider === "openrouter" ? "ollama" : "openrouter";

    const suitabilityKey = profile === "code_heavy"
      ? "codingSuitability"
      : profile === "audit_strict" || profile === "release_critical"
        ? "auditSuitability"
        : "qualityTier";

    const selected = this.pickBest(models, primaryProvider, suitabilityKey, input.maxCostTier);
    const fallback = this.pickBest(models, fallbackProvider, suitabilityKey, input.maxCostTier);

    return {
      profile,
      selectedProvider: selected?.provider ?? primaryProvider,
      selectedModelId: selected?.id ?? null,
      fallbackProvider: fallback?.provider ?? fallbackProvider,
      fallbackModelId: fallback?.id ?? null,
      reason: selected ? `profile_${profile}` : "fallback_only",
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
          preferredBackend: assignment.preferredBackend,
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

      const order: Record<HybridModelRegistryEntry["costTier"], number> = { low: 0, medium: 1, high: 2, premium: 3 };
      return order[model.costTier] <= order[maxCostTier];
    });

    const score: Record<HybridModelRegistryEntry["qualityTier"], number> = { low: 1, medium: 2, high: 3, premium: 4 };

    return filtered.sort((a, b) => {
      const rank = score[b[rankKey]] - score[a[rankKey]];
      if (rank !== 0) {
        return rank;
      }
      return score[b.speedTier === "fast" ? "high" : b.speedTier === "balanced" ? "medium" : "low"] - score[a.speedTier === "fast" ? "high" : a.speedTier === "balanced" ? "medium" : "low"];
    })[0];
  }
}

export const modelRoutingEngine = new ModelRoutingEngine();
