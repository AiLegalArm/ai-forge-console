import { describe, expect, it } from "vitest";
import type { DeployProviderClient } from "@/lib/deploy-integration-service";
import { RealDeployIntegrationService } from "@/lib/deploy-integration-service";
import type { ReleaseControlState } from "@/types/release";

class FakeProvider implements DeployProviderClient {
  async triggerDeploy() {
    return {
      externalId: "dep-test-1",
      status: "queued" as const,
      previewUrl: "https://preview.example.dev",
    };
  }

  async getDeployStatus() {
    return {
      externalId: "dep-test-1",
      status: "preview_ready" as const,
      previewUrl: "https://preview.example.dev",
      rollbackAvailable: true,
    };
  }
}

describe("RealDeployIntegrationService", () => {
  const releaseControlState: ReleaseControlState = {
    deployments: [],
    domains: [],
    releaseCandidates: [],
    releaseHistoryIds: [],
    activeCandidateId: "rc-empty",
    finalDecision: {
      status: "warning",
      readiness: "warning",
      blockers: [],
      warnings: [],
      approvalsPending: [],
      goSignals: [],
      noGoSignals: [],
      summary: "stub",
    },
    operationsPanel: {
      generatedAtIso: new Date().toISOString(),
      candidate: { id: "rc-empty", label: "empty", linkage: { branch: "main", domainIds: [] } },
      blockerSummary: { total: 0, critical: 0, high: 0, unresolved: [] },
      approvalSummary: { required: [], completed: [], missing: [] },
      auditSummary: { verdict: "not_ready", activeBlockers: 0, unresolvedFindings: 0, gateSummary: [] },
      reviewReadiness: { state: "not_opened", status: "warning", summary: "stub" },
      deployReadiness: { previewStatus: "missing", productionStatus: "missing", rolloutState: "rollout-blocked", dependencyState: [], blockers: [], status: "warning" },
      domainReadiness: { status: "warning", summary: "stub", blockingDomains: [] },
      rollbackReadiness: { availability: "unavailable", fallbackPlanRequired: true, summary: "stub", status: "warning" },
      decisionSurface: { status: "warning", blockerSeverity: "none", unresolvedExecutionFailures: 0, operatorOverrides: [], summary: "stub", blockers: [], warnings: [] },
      inspection: { tasks: [], subtasks: [], unresolvedBlockers: [], auditResults: [], executionTraces: [], evidence: [] },
      activityLinks: [],
      reviewChatReferences: [],
      auditChatReferences: [],
    },
    operations: {
      goNoGo: { status: "warning" as const, warnings: [] },
      blockerSummary: { total: 0, critical: 0 },
      approvalSummary: { required: [], completed: [], missing: [] },
      decisionFactors: { unresolvedExecutionFailures: 0 },
      readiness: { review: "warning", domain: "warning", rollback: "warning" },
      auditSummary: { verdict: "not_ready" },
      deployReadiness: { previewStatus: "missing", productionStatus: "missing", rolloutState: "rollout-blocked", dependencyState: [], blockers: [], status: "warning" },
      rollbackReadiness: { availability: "unavailable", fallbackPlanRequired: true, summary: "stub", status: "warning" },
      domainReadiness: { status: "warning", summary: "stub", blockingDomains: [] },
    },
  };
  it("requires approval for production trigger", async () => {
    const service = new RealDeployIntegrationService(new FakeProvider());
    const result = await service.triggerDeploy({
      releaseControl: releaseControlState,
      projectId: "p1",
      repository: "repo",
      branch: "main",
      environment: "production",
      approvals: [],
      releaseState: "go",
    });

    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe("approval_required");
  });

  it("can trigger preview and refresh status", async () => {
    const service = new RealDeployIntegrationService(new FakeProvider());
    const trigger = await service.triggerDeploy({
      releaseControl: releaseControlState,
      projectId: "p1",
      repository: "repo",
      branch: "feat/x",
      environment: "preview",
      approvals: [],
      releaseState: "warning",
    });

    expect(trigger.ok).toBe(true);
    expect(trigger.deployment?.status).toBe("queued");

    const refresh = await service.refreshDeploymentStatus(trigger.deployment!);
    expect(refresh.ok).toBe(true);
    expect(refresh.deployment?.status).toBe("preview_ready");
  });
});
