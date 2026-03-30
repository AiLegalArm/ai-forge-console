import { describe, expect, it } from "vitest";
import { modelRoutingEngine } from "@/lib/model-routing-engine";
import type { HybridModelRegistryEntry } from "@/types/local-inference";

const MODELS: HybridModelRegistryEntry[] = [
  {
    id: "or-o3",
    provider: "openrouter",
    providerModelId: "openai/o3",
    displayName: "o3",
    costTier: "premium",
    qualityTier: "premium",
    speedTier: "slow",
    contextSuitability: "high",
    codingSuitability: "high",
    auditSuitability: "premium",
    reviewSuitability: "high",
    structuredOutputSuitability: "high",
    availability: "available",
  },
  {
    id: "or-sonnet",
    provider: "openrouter",
    providerModelId: "anthropic/claude-sonnet-4",
    displayName: "sonnet",
    costTier: "medium",
    qualityTier: "high",
    speedTier: "balanced",
    contextSuitability: "high",
    codingSuitability: "high",
    auditSuitability: "high",
    reviewSuitability: "high",
    structuredOutputSuitability: "high",
    availability: "available",
  },
  {
    id: "ol-qwen",
    provider: "ollama",
    providerModelId: "qwen3-coder:14b",
    displayName: "qwen",
    costTier: "low",
    qualityTier: "high",
    speedTier: "balanced",
    contextSuitability: "medium",
    codingSuitability: "high",
    auditSuitability: "medium",
    reviewSuitability: "medium",
    structuredOutputSuitability: "medium",
    availability: "available",
  },
];

describe("model routing engine", () => {
  it("routes privacy/local-only decisions to ollama", () => {
    const decision = modelRoutingEngine.chooseModel(
      {
        agentRole: "backend",
        taskType: "coding",
        privacyMode: "strict_local",
        localOnly: true,
      },
      MODELS,
    );

    expect(decision.selectedProvider).toBe("ollama");
    expect(decision.deploymentTarget).toBe("local");
    expect(decision.privacyAffected).toBe(true);
  });

  it("uses quality-first profile for architect and release critical routing", () => {
    const decision = modelRoutingEngine.chooseModel(
      {
        agentRole: "architect",
        taskType: "release",
        privacyMode: "standard",
        appModeProfile: "quality_first",
        releaseCritical: true,
      },
      MODELS,
    );

    expect(decision.profile).toBe("release_critical");
    expect(decision.selectedProvider).toBe("openrouter");
    expect(decision.qualityAffected).toBe(true);
  });

  it("falls back to local provider when cloud is unavailable", () => {
    const decision = modelRoutingEngine.chooseModel(
      {
        agentRole: "reviewer",
        taskType: "review",
        privacyMode: "standard",
        openRouterAvailable: false,
        ollamaAvailable: true,
      },
      MODELS,
    );

    expect(decision.selectedProvider).toBe("ollama");
    expect(decision.resolution).toBe("resolved");
  });
});
