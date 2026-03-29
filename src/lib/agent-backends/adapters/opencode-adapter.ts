import type {
  AgentBackendAvailability,
  AgentBackendCancellation,
  AgentBackendContract,
  AgentBackendEvent,
  AgentBackendFailure,
  AgentBackendRun,
  AgentBackendSession,
  AgentBackendTaskResult,
  AgentBackendTaskSubmission,
  LinkedExecutionRef,
} from "@/types/agent-backends";
import type {
  OpenCodeBackendConfiguration,
  OpenCodeBackendState,
  OpenCodeCompletionRecord,
  OpenCodeProgressUpdate,
  OpenCodeSessionContext,
  OpenCodeTaskEnvelope,
} from "@/types/opencode-backend";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const runtimeConfig: OpenCodeBackendConfiguration = {
  executablePath: "opencode",
  workingDirectory: ".",
  backendMode: "local",
  modelSelection: {
    chatModel: "<opencode-chat-model>",
    codingModel: "<opencode-code-model>",
    reasoningModel: "<opencode-reasoning-model>",
  },
  statusMetadata: {
    detail: "OpenCode adapter initialized.",
    lastHealthCheckAt: nowIso(),
  },
  localRuntime: {
    installed: true,
    available: true,
    checkedAt: nowIso(),
    reason: "OpenCode runtime binary discovered in PATH placeholder.",
  },
};

const sessions = new Map<string, AgentBackendSession>();
const sessionContexts = new Map<string, OpenCodeSessionContext>();
const runs = new Map<string, AgentBackendRun>();
const runTaskEnvelopes = new Map<string, OpenCodeTaskEnvelope>();
const runResults = new Map<string, AgentBackendTaskResult>();
const completionRecords = new Map<string, OpenCodeCompletionRecord>();
const eventsBySessionId = new Map<string, AgentBackendEvent[]>();

function pushEvent(sessionId: string, event: AgentBackendEvent) {
  const existing = eventsBySessionId.get(sessionId) ?? [];
  existing.push(event);
  eventsBySessionId.set(sessionId, existing);
}

function deriveBackendState(): OpenCodeBackendState {
  if (runtimeConfig.statusMetadata.lastErrorCode) return "error";
  if (!runtimeConfig.localRuntime.installed) return "not_installed";

  if (!runtimeConfig.localRuntime.available) return "unavailable";

  const configured = Boolean(runtimeConfig.executablePath) && Boolean(runtimeConfig.workingDirectory);
  if (!configured) return "installed";

  const modelsConfigured = Boolean(runtimeConfig.modelSelection.chatModel || runtimeConfig.modelSelection.codingModel);
  if (!modelsConfigured) return "configured";

  const hasRunning = Array.from(runs.values()).some((run) => run.status === "queued" || run.status === "running");
  if (hasRunning) return "busy";

  return "ready";
}

function toAvailability(): AgentBackendAvailability {
  const status = deriveBackendState();

  return {
    installed: runtimeConfig.localRuntime.installed,
    configured: status === "configured" || status === "ready" || status === "busy",
    status,
    health: status === "error" ? "error" : status === "unavailable" || status === "not_installed" ? "unhealthy" : "healthy",
    statusDetail:
      runtimeConfig.statusMetadata.lastErrorMessage ?? runtimeConfig.statusMetadata.detail ?? runtimeConfig.localRuntime.reason,
    lastCheckedAt: runtimeConfig.localRuntime.checkedAt ?? runtimeConfig.statusMetadata.lastHealthCheckAt,
    localRuntimeAvailable: runtimeConfig.localRuntime.available,
    active: status === "busy" || status === "ready",
    preferenceCandidateFor: ["backend", "fullstack", "local-first"],
  };
}

function updateRun(runId: string, status: AgentBackendRun["status"]) {
  const current = runs.get(runId);
  if (!current) return null;
  const updated: AgentBackendRun = { ...current, status, updatedAt: nowIso() };
  runs.set(runId, updated);
  return updated;
}

function completionFromRecord(record: OpenCodeCompletionRecord, linked?: LinkedExecutionRef): AgentBackendTaskResult {
  return {
    runId: record.runId,
    status: record.status,
    summary: record.summary,
    output: record.output,
    completedAt: record.completedAt,
    linked,
  };
}

function registerProgress(sessionId: string, runId: string, update: OpenCodeProgressUpdate, linked?: LinkedExecutionRef) {
  pushEvent(sessionId, {
    id: id("evt"),
    backendId: "opencode",
    type: "run.progress",
    timestamp: update.timestamp,
    sessionId,
    runId,
    progress: update.progress,
    message: update.message,
    linked,
  });
}

export const openCodeAdapter: AgentBackendContract = {
  id: "opencode",
  metadata: {
    displayName: "OpenCode",
    description: "OpenCode local backend adapter powered by the shared backend adapter contract.",
    tags: ["local", "cli", "agent-backend", "opencode"],
  },
  capabilities: {
    localCliExecution: true,
    multiFileEditing: true,
    taskExecution: true,
    terminalToolUse: true,
    streamingProgress: true,
    approvalIntegration: true,
    operationModes: ["local", "hybrid"],
    promptSystemConfig: true,
  },
  eventStreamMode: "stream",

  async getAvailability() {
    runtimeConfig.statusMetadata.lastHealthCheckAt = nowIso();
    runtimeConfig.localRuntime.checkedAt = nowIso();
    return toAvailability();
  },

  async createSession(linked?: LinkedExecutionRef) {
    const createdAt = nowIso();
    const session: AgentBackendSession = {
      id: id("opencode_session"),
      backendId: "opencode",
      createdAt,
      updatedAt: createdAt,
      status: "active",
      linked,
      metadata: {
        executablePath: runtimeConfig.executablePath,
        workingDirectory: runtimeConfig.workingDirectory,
        backendMode: runtimeConfig.backendMode,
        chatModel: runtimeConfig.modelSelection.chatModel ?? "",
        codingModel: runtimeConfig.modelSelection.codingModel ?? "",
      },
    };

    sessions.set(session.id, session);
    sessionContexts.set(session.id, { sessionId: session.id, linked, startedAt: createdAt });

    pushEvent(session.id, {
      id: id("evt"),
      backendId: "opencode",
      type: "session.updated",
      timestamp: createdAt,
      sessionId: session.id,
      message: "OpenCode session started.",
      linked,
    });

    return session;
  },

  async closeSession(sessionId: string) {
    const existing = sessions.get(sessionId);
    if (!existing) return;

    sessions.set(sessionId, { ...existing, status: "closed", updatedAt: nowIso() });
    pushEvent(sessionId, {
      id: id("evt"),
      backendId: "opencode",
      type: "session.updated",
      timestamp: nowIso(),
      sessionId,
      message: "OpenCode session closed.",
      linked: existing.linked,
    });
  },

  async submitTask(sessionId: string, task: AgentBackendTaskSubmission) {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`OpenCode session ${sessionId} was not found.`);
    }

    const runId = id("opencode_run");
    const createdAt = nowIso();
    const run: AgentBackendRun = {
      id: runId,
      backendId: "opencode",
      sessionId,
      status: "running",
      createdAt,
      updatedAt: createdAt,
      linked: task.linked,
    };

    runs.set(runId, run);
    runTaskEnvelopes.set(runId, {
      runId,
      sessionId,
      taskId: task.taskId,
      title: task.title,
      prompt: task.prompt,
      linked: task.linked,
      submittedAt: createdAt,
    });

    pushEvent(sessionId, {
      id: id("evt"),
      backendId: "opencode",
      type: "run.updated",
      timestamp: createdAt,
      sessionId,
      runId,
      message: `Task submitted: ${task.title}`,
      linked: task.linked,
    });

    registerProgress(sessionId, runId, { runId, progress: 15, message: "OpenCode accepted task.", timestamp: nowIso() }, task.linked);

    const shouldKeepRunning = task.metadata?.simulateState === "running";
    const shouldFail = task.metadata?.simulateState === "failed";

    if (shouldFail) {
      const failure: AgentBackendFailure = {
        backendId: "opencode",
        runId,
        code: "OPENCODE_TASK_FAILURE",
        message: "OpenCode task simulation failed.",
        recoverable: true,
        occurredAt: nowIso(),
      };

      updateRun(runId, "failed");
      completionRecords.set(runId, {
        runId,
        status: "failed",
        summary: "OpenCode task failed during simulation.",
        failedCode: failure.code,
        completedAt: nowIso(),
      });

      pushEvent(sessionId, {
        id: id("evt"),
        backendId: "opencode",
        type: "run.failure",
        timestamp: failure.occurredAt,
        sessionId,
        runId,
        message: failure.message,
        failure,
        linked: task.linked,
      });

      return runs.get(runId)!;
    }

    if (!shouldKeepRunning) {
      updateRun(runId, "completed");
      const completionRecord: OpenCodeCompletionRecord = {
        runId,
        status: "completed",
        summary: `OpenCode completed task \"${task.title}\".`,
        output: "Execution bridge scaffold complete; runtime integration ready for transport wiring.",
        completedAt: nowIso(),
      };
      completionRecords.set(runId, completionRecord);

      const result = completionFromRecord(completionRecord, task.linked);
      runResults.set(runId, result);

      registerProgress(sessionId, runId, { runId, progress: 100, message: "OpenCode task completed.", timestamp: nowIso() }, task.linked);
      pushEvent(sessionId, {
        id: id("evt"),
        backendId: "opencode",
        type: "run.result",
        timestamp: nowIso(),
        sessionId,
        runId,
        result,
        message: result.summary,
        linked: task.linked,
      });
    }

    return runs.get(runId)!;
  },

  async getRun(runId: string) {
    return runs.get(runId) ?? null;
  },

  async getRunResult(runId: string) {
    return runResults.get(runId) ?? null;
  },

  async listEvents(sessionId: string, cursor?: string) {
    const events = eventsBySessionId.get(sessionId) ?? [];
    const offset = Number.parseInt(cursor ?? "0", 10);
    if (Number.isNaN(offset) || offset < 0) {
      return { events };
    }

    const slice = events.slice(offset);
    const nextCursor = offset + slice.length;
    return { events: slice, nextCursor: `${nextCursor}` };
  },

  async cancelRun(runId: string, reason?: string): Promise<AgentBackendCancellation> {
    const existing = runs.get(runId);
    if (!existing) {
      return {
        runId,
        reason,
        cancelledAt: nowIso(),
      };
    }

    const updated = updateRun(runId, "cancelled");
    const cancellation: AgentBackendCancellation = {
      runId,
      reason,
      cancelledAt: nowIso(),
    };

    completionRecords.set(runId, {
      runId,
      status: "cancelled",
      summary: reason ? `Run cancelled: ${reason}` : "Run cancelled",
      completedAt: cancellation.cancelledAt,
    });

    const result = completionFromRecord(completionRecords.get(runId)!, existing.linked);
    runResults.set(runId, result);

    pushEvent(existing.sessionId, {
      id: id("evt"),
      backendId: "opencode",
      type: "run.cancelled",
      timestamp: cancellation.cancelledAt,
      sessionId: existing.sessionId,
      runId,
      cancellation,
      message: cancellation.reason ?? "OpenCode run cancelled.",
      linked: existing.linked,
    });

    if (updated?.status === "cancelled") {
      pushEvent(existing.sessionId, {
        id: id("evt"),
        backendId: "opencode",
        type: "run.result",
        timestamp: nowIso(),
        sessionId: existing.sessionId,
        runId,
        result,
        message: result.summary,
        linked: existing.linked,
      });
    }

    return cancellation;
  },

  async respondToApproval() {
    return;
  },
};
