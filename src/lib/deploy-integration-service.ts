import type { DeploymentEnvironment, DeploymentRecord, DeploymentStatus, ReleaseControlState } from "@/types/release";
import type { WorkflowApproval, WorkflowState } from "@/types/workflow";

export type DeployLifecycleStatus = DeploymentStatus;

export interface DeployProviderTriggerResult {
  externalId: string;
  status: DeployLifecycleStatus;
  previewUrl?: string;
  productionUrl?: string;
  metadata?: Record<string, string>;
}

export interface DeployProviderStatusResult {
  externalId: string;
  status: DeployLifecycleStatus;
  previewUrl?: string;
  productionUrl?: string;
  blockedReason?: string;
  rollbackAvailable?: boolean;
  deployedAtIso?: string;
  rolledBackAtIso?: string;
}

export interface DeployProviderClient {
  triggerDeploy(input: {
    projectId: string;
    repository: string;
    branch: string;
    taskId?: string;
    releaseCandidateId?: string;
    environment: DeploymentEnvironment;
  }): Promise<DeployProviderTriggerResult>;
  getDeployStatus(externalId: string): Promise<DeployProviderStatusResult>;
}

export type DeployFailureCode =
  | "approval_required"
  | "provider_unavailable"
  | "trigger_failed"
  | "status_lookup_failed"
  | "release_blocked"
  | "rollback_unavailable";

export interface DeployActionResult {
  ok: boolean;
  deployment?: DeploymentRecord;
  failureCode?: DeployFailureCode;
  message: string;
  approvalId?: string;
}

interface DeployIntegrationOptions {
  now?: () => Date;
}

const TERMINAL_STATES: DeployLifecycleStatus[] = ["failed", "preview_ready", "production_ready", "deployed", "rolled_back", "blocked"];

export class RealDeployIntegrationService {
  private readonly now: () => Date;

  constructor(private readonly provider: DeployProviderClient, options: DeployIntegrationOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  buildDeployApproval(taskId: string | undefined, chatId: string | undefined, environment: DeploymentEnvironment): WorkflowApproval {
    const nowIso = this.now().toISOString();
    return {
      id: `approval-deploy-${environment}-${Date.now().toString(36)}`,
      category: environment === "production" ? "production_deploy_approval" : "deploy",
      title: environment === "production" ? "Approve production deployment" : "Approve preview deployment",
      reason: environment === "production"
        ? "Production deployment requires explicit operator approval."
        : "Preview deployment requires explicit operator approval.",
      status: "pending",
      taskId,
      chatId,
      requestedBy: "deploy-integration",
      requestedAtIso: nowIso,
    };
  }

  async triggerDeploy(input: {
    releaseControl: ReleaseControlState;
    projectId: string;
    repository: string;
    branch: string;
    taskId?: string;
    chatId?: string;
    releaseCandidateId?: string;
    environment: DeploymentEnvironment;
    approvals: WorkflowApproval[];
    releaseState: "go" | "blocked" | "warning";
  }): Promise<DeployActionResult> {
    if (input.releaseState === "blocked") {
      return {
        ok: false,
        failureCode: "release_blocked",
        message: "Release is currently blocked by go/no-go conditions.",
      };
    }

    const needsApproval = input.environment === "production";
    const requiredCategory = input.environment === "production" ? "production_deploy_approval" : "deploy";
    const hasApproval = input.approvals.some((approval) =>
      approval.taskId === input.taskId &&
      approval.category === requiredCategory &&
      approval.status === "approved",
    );

    if (needsApproval && !hasApproval) {
      return {
        ok: false,
        failureCode: "approval_required",
        message: "Approval is required before production deployment can be triggered.",
      };
    }

    let providerResult: DeployProviderTriggerResult;
    try {
      providerResult = await this.provider.triggerDeploy({
        projectId: input.projectId,
        repository: input.repository,
        branch: input.branch,
        taskId: input.taskId,
        releaseCandidateId: input.releaseCandidateId,
        environment: input.environment,
      });
    } catch {
      return {
        ok: false,
        failureCode: "trigger_failed",
        message: "Deploy trigger failed. Provider may be unavailable.",
      };
    }

    const nowIso = this.now().toISOString();
    return {
      ok: true,
      deployment: {
        id: providerResult.externalId,
        environment: input.environment,
        targetType: input.environment === "production" ? "production" : "preview",
        status: providerResult.status,
        source: "release_workflow",
        previewTarget: providerResult.previewUrl,
        productionTarget: providerResult.productionUrl,
        linkedTaskId: input.taskId,
        linkedBranch: input.branch,
        linkedReleaseCandidateId: input.releaseCandidateId,
        rollbackAvailable: false,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      },
      message: `Deploy triggered for ${input.environment}.`,
    };
  }

  async refreshDeploymentStatus(deployment: DeploymentRecord): Promise<DeployActionResult> {
    if (TERMINAL_STATES.includes(deployment.status)) {
      return { ok: true, deployment, message: "Deployment is in a terminal state." };
    }

    let status: DeployProviderStatusResult;
    try {
      status = await this.provider.getDeployStatus(deployment.id);
    } catch {
      return {
        ok: false,
        failureCode: "status_lookup_failed",
        message: "Unable to refresh deployment status from provider.",
      };
    }

    return {
      ok: true,
      message: "Deployment status refreshed.",
      deployment: {
        ...deployment,
        status: status.status,
        previewTarget: status.previewUrl ?? deployment.previewTarget,
        productionTarget: status.productionUrl ?? deployment.productionTarget,
        rollbackAvailable: status.rollbackAvailable ?? deployment.rollbackAvailable,
        blockedReason: status.blockedReason,
        deployedAtIso: status.deployedAtIso ?? deployment.deployedAtIso,
        rolledBackAtIso: status.rolledBackAtIso ?? deployment.rolledBackAtIso,
        updatedAtIso: this.now().toISOString(),
      },
    };
  }
}

export class HttpDeployProviderClient implements DeployProviderClient {
  constructor(private readonly baseUrl: string, private readonly token?: string) {}

  private headers() {
    return {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async triggerDeploy(input: {
    projectId: string;
    repository: string;
    branch: string;
    taskId?: string;
    releaseCandidateId?: string;
    environment: DeploymentEnvironment;
  }): Promise<DeployProviderTriggerResult> {
    const response = await fetch(`${this.baseUrl}/deployments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Trigger failed: ${response.status}`);
    return response.json() as Promise<DeployProviderTriggerResult>;
  }

  async getDeployStatus(externalId: string): Promise<DeployProviderStatusResult> {
    const response = await fetch(`${this.baseUrl}/deployments/${externalId}`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`Lookup failed: ${response.status}`);
    return response.json() as Promise<DeployProviderStatusResult>;
  }
}

export class UnavailableDeployProviderClient implements DeployProviderClient {
  async triggerDeploy(): Promise<DeployProviderTriggerResult> {
    throw new Error("Deploy provider is not configured.");
  }

  async getDeployStatus(): Promise<DeployProviderStatusResult> {
    throw new Error("Deploy provider is not configured.");
  }
}

export function createDeployProviderClientFromEnv() {
  const baseUrl = import.meta.env.VITE_DEPLOY_API_URL as string | undefined;
  const token = import.meta.env.VITE_DEPLOY_API_TOKEN as string | undefined;
  if (!baseUrl) {
    return new UnavailableDeployProviderClient();
  }
  return new HttpDeployProviderClient(baseUrl, token);
}
