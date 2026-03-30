import type { AppRoutingModeProfile } from "@/types/local-inference";

export type BudgetScope = "run" | "task" | "agent" | "project";
export type BudgetPressure = "low" | "medium" | "high" | "critical";

export interface BudgetGuardrails {
  softLimitUsd: number;
  hardLimitUsd: number;
  warnBeforeRunUsd: number;
  stopOrFallbackUsd: number;
}

export interface BudgetBucket {
  scope: BudgetScope;
  scopeId: string;
  spentUsd: number;
  guardrails: BudgetGuardrails;
}

export interface SessionUsageLedger {
  sessionId: string;
  totalEstimatedCostUsd: number;
  totalRuns: number;
  fallbackRuns: number;
  blockedRuns: number;
  degradedRuns: number;
}

export interface ProviderPressureState {
  provider: "openrouter" | "ollama";
  consecutiveFailures: number;
  consecutiveRateLimits: number;
  unavailableUntilIso?: string;
}

export interface OperationalSafetyState {
  budgetBuckets: BudgetBucket[];
  sessionUsage: SessionUsageLedger[];
  providerPressure: ProviderPressureState[];
  degradedMode: boolean;
  fallbackDepthLimit: number;
  recentFallbackEvents: Array<{ atIso: string; reason: string; from: string; to: string; runId: string }>;
}

export interface GuardrailDecision {
  allowRun: boolean;
  warning?: string;
  blockReason?: string;
  pressure: BudgetPressure;
  shouldForceCheapFast: boolean;
  shouldPreferLocalFallback: boolean;
}

const pressureRank: Record<BudgetPressure, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function evaluateBudgetGuardrails(input: {
  runEstimateUsd: number;
  buckets: BudgetBucket[];
  releaseCritical: boolean;
  modeProfile: AppRoutingModeProfile;
}): GuardrailDecision {
  const worstPressure = input.buckets.reduce<BudgetPressure>((worst, bucket) => {
    const nextSpent = bucket.spentUsd + input.runEstimateUsd;
    const pressure: BudgetPressure =
      nextSpent >= bucket.guardrails.hardLimitUsd
        ? "critical"
        : nextSpent >= bucket.guardrails.stopOrFallbackUsd
          ? "high"
          : nextSpent >= bucket.guardrails.softLimitUsd
            ? "medium"
            : "low";
    return pressureRank[pressure] > pressureRank[worst] ? pressure : worst;
  }, "low");

  const hasHardBlock = input.buckets.some((bucket) => {
    const nextSpent = bucket.spentUsd + input.runEstimateUsd;
    return nextSpent >= bucket.guardrails.hardLimitUsd;
  });

  if (hasHardBlock && !input.releaseCritical) {
    return {
      allowRun: false,
      blockReason: "Budget hard limit reached. Run blocked to prevent runaway spend.",
      pressure: "critical",
      shouldForceCheapFast: true,
      shouldPreferLocalFallback: true,
    };
  }

  const warningBucket = input.buckets.find((bucket) => {
    const nextSpent = bucket.spentUsd + input.runEstimateUsd;
    return nextSpent >= bucket.guardrails.warnBeforeRunUsd;
  });

  return {
    allowRun: true,
    warning: warningBucket ? `Budget warning in ${warningBucket.scope} scope (${warningBucket.scopeId}).` : undefined,
    pressure: worstPressure,
    shouldForceCheapFast: worstPressure === "high" || worstPressure === "critical" || input.modeProfile === "cheap_fast",
    shouldPreferLocalFallback: worstPressure !== "low",
  };
}

export function classifyProviderHealth(pressure: ProviderPressureState): "healthy" | "pressured" | "degraded" {
  if (pressure.consecutiveRateLimits >= 2 || pressure.consecutiveFailures >= 4) return "degraded";
  if (pressure.consecutiveFailures > 0 || pressure.consecutiveRateLimits > 0) return "pressured";
  return "healthy";
}

export function shouldEnterDegradedMode(pressures: ProviderPressureState[]): boolean {
  return pressures.some((entry) => classifyProviderHealth(entry) === "degraded");
}
