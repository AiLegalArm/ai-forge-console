import type {
  AgentBackendCancellation,
  AgentBackendContract,
  AgentBackendEvent,
  AgentBackendFailure,
  AgentBackendTaskResult,
  AgentBackendTaskSubmission,
  LinkedExecutionRef,
} from "@/types/agent-backends";
import type { ClineBackendSnapshot, ClineBackendState, ClineRun, ClineSession } from "@/types/cline-backend";
import { mapClineStateToAvailability } from "@/types/cline-backend";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const clineConfig: ClineBackendSnapshot["configuration"] = {
  executablePath: "cline",
  runtimePath: "node",
  workingDirectory: "/workspace/ai-forge-console",
  configuredAt: nowIso(),
  configState: "complete",
};

let clineState: ClineBackendState = "ready";

const sessions = new Map<string, ClineSession>();
const runs = new Map<string, ClineRun>();
const runResults = new Map<string, AgentBackendTaskResult>();
const eventsBySession = new Map<string, AgentBackendEvent[]>();

function pushEvent(sessionId: string, event: AgentBackendEvent) {
  const existing = eventsBySession.get(sessionId) ?? [];
  existing.push(event);
  eventsBySession.set(sessionId, existing);
}

function getSnapshot(): ClineBackendSnapshot {
  const checkedAt = nowIso();
  const isInstalled = clineState !== "not_installed";
  const configured = clineConfig.configState === "complete";
  const isAvailable = clineState === "ready" || clineState === "degraded";

  return {
    backendState: clineState,
    configuration: clineConfig,
    configurationState: {
      state: clineState,
      configured,
      detail:
        clineState === "error"
          ? "Cline backend entered an error state while preparing runtime bridge."
          : configured
            ? "Cline backend configuration is complete."
            : "Cline backend requires executable/runtime and workspace configuration.",
      lastTransitionAt: checkedAt,
    },
    availability: {
      state: clineState,
      isInstalled,
      isAvailable,
      health:
        clineState === "error"
          ? "error"
          : clineState === "degraded"
            ? "degraded"
            : isAvailable
              ? "healthy"
              : "unhealthy",
      detail:
        clineState === "not_installed"
          ? "Cline runtime is not installed or not discoverable."
          : clineState === "unavailable"
            ? "Cline is installed but currently unavailable for task execution."
            : "Cline backend is available.",
      checkedAt,
    },
    metadata: {
      runtimeName: "cline",
      runtimeVersion: "adapter-foundation-1",
      transport: "extension-bridge",
      platform: "local-cli",
    },
    readiness: {
      canCreateSession: isAvailable,
      canSubmitTask: isAvailable,
      canStreamProgress: true,
      canCancel: true,
      reason: isAvailable ? undefined : "Cline backend must be ready before sessions/tasks can be started.",
    },
  };
}

function progressEvent(sessionId: string, runId: string, progress: number, message: string, linked?: LinkedExecutionRef): AgentBackendEvent {
  return {
    id: uid("cline_evt"),
    backendId: "cline",
    type: "run.progress",
    timestamp: nowIso(),
    sessionId,
    runId,
    progress,
    message,
    linked,
  };
}

export const clineAdapter: AgentBackendContract = {
  id: "cline",
  metadata: {
    displayName: "Cline",
    description: "Cline backend adapter built on the shared backend adapter contract.",
    owner: "Cline",
    version: "adapter-foundation-1",
    tags: ["local", "extension", "tasking", "provider-hub", "preference-candidate"],
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
    return mapClineStateToAvailability(getSnapshot());
  },

  async createSession(linked) {
    const snapshot = getSnapshot();
    if (!snapshot.readiness.canCreateSession) {
      throw new Error(snapshot.readiness.reason ?? "Cline backend is not ready for sessions.");
    }

    const createdAt = nowIso();
    const session: ClineSession = {
      id: uid("cline_session"),
      backendId: "cline",
      createdAt,
      updatedAt: createdAt,
      status: "active",
      linked,
      metadata: {
        executablePath: snapshot.configuration.executablePath,
        workingDirectory: snapshot.configuration.workingDirectory,
        configState: snapshot.configuration.configState,
        runtimeVersion: snapshot.metadata.runtimeVersion,
      },
    };

    sessions.set(session.id, session);
    pushEvent(session.id, {
      id: uid("cline_evt"),
      backendId: "cline",
      type: "session.updated",
      timestamp: createdAt,
      sessionId: session.id,
      message: "Cline session started.",
      linked,
    });

    return session;
  },

  async closeSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.status = "closed";
    session.updatedAt = nowIso();
    sessions.set(sessionId, session);

    pushEvent(sessionId, {
      id: uid("cline_evt"),
      backendId: "cline",
      type: "session.updated",
      timestamp: nowIso(),
      sessionId,
      message: "Cline session closed.",
      linked: session.linked,
    });
  },

  async submitTask(sessionId: string, task: AgentBackendTaskSubmission) {
    const session = sessions.get(sessionId);
    const snapshot = getSnapshot();

    if (!session) throw new Error(`Cline session not found: ${sessionId}`);
    if (!snapshot.readiness.canSubmitTask) throw new Error(snapshot.readiness.reason ?? "Cline backend is not ready.");

    const createdAt = nowIso();
    const run: ClineRun = {
      id: uid("cline_run"),
      backendId: "cline",
      sessionId,
      status: "running",
      createdAt,
      updatedAt: createdAt,
      linked: task.linked,
      metadata: {
        taskId: task.taskId,
        title: task.title,
        cancellationReady: "true",
      },
    };

    runs.set(run.id, run);
    pushEvent(sessionId, {
      id: uid("cline_evt"),
      backendId: "cline",
      type: "run.updated",
      timestamp: createdAt,
      sessionId,
      runId: run.id,
      message: `Cline started task: ${task.title}`,
      linked: task.linked,
    });

    pushEvent(sessionId, progressEvent(sessionId, run.id, 20, "Cline initialized task context.", task.linked));
    pushEvent(sessionId, progressEvent(sessionId, run.id, 65, "Cline is executing workspace actions.", task.linked));

    if (task.metadata?.simulateState === "failed") {
      const failure: AgentBackendFailure = {
        backendId: "cline",
        runId: run.id,
        code: "CLINE_TASK_FAILURE",
        message: "Cline reported a task execution failure.",
        recoverable: true,
        occurredAt: nowIso(),
      };
      run.status = "failed";
      run.updatedAt = failure.occurredAt;
      runs.set(run.id, run);

      pushEvent(sessionId, {
        id: uid("cline_evt"),
        backendId: "cline",
        type: "run.failure",
        timestamp: failure.occurredAt,
        sessionId,
        runId: run.id,
        message: failure.message,
        failure,
        linked: task.linked,
      });

      runResults.set(run.id, {
        runId: run.id,
        status: "failed",
        summary: failure.message,
        linked: task.linked,
        completedAt: failure.occurredAt,
      });
      return run;
    }

    if (task.metadata?.simulateState !== "running") {
      run.status = "completed";
      run.updatedAt = nowIso();
      runs.set(run.id, run);

      const result: AgentBackendTaskResult = {
        runId: run.id,
        status: "completed",
        summary: `Cline completed task: ${task.title}`,
        output: "Cline adapter session/run foundation completed via shared backend layer.",
        linked: task.linked,
        completedAt: nowIso(),
      };
      runResults.set(run.id, result);

      pushEvent(sessionId, progressEvent(sessionId, run.id, 100, "Cline task completed.", task.linked));
      pushEvent(sessionId, {
        id: uid("cline_evt"),
        backendId: "cline",
        type: "run.result",
        timestamp: result.completedAt,
        sessionId,
        runId: run.id,
        message: result.summary,
        result,
        linked: task.linked,
      });
    }

    return run;
  },

  async getRun(runId) {
    return runs.get(runId) ?? null;
  },

  async getRunResult(runId) {
    return runResults.get(runId) ?? null;
  },

  async listEvents(sessionId, cursor) {
    const events = eventsBySession.get(sessionId) ?? [];
    const start = Number.parseInt(cursor ?? "0", 10);
    if (Number.isNaN(start) || start < 0) {
      return { events, nextCursor: `${events.length}` };
    }
    const sliced = events.slice(start);
    return { events: sliced, nextCursor: `${events.length}` };
  },

  async cancelRun(runId, reason): Promise<AgentBackendCancellation> {
    const cancellation: AgentBackendCancellation = {
      runId,
      reason,
      cancelledAt: nowIso(),
    };

    const run = runs.get(runId);
    if (!run) return cancellation;

    run.status = "cancelled";
    run.updatedAt = cancellation.cancelledAt;
    runs.set(run.id, run);

    runResults.set(run.id, {
      runId: run.id,
      status: "cancelled",
      summary: reason ? `Cancelled: ${reason}` : "Cancelled by user.",
      linked: run.linked,
      completedAt: cancellation.cancelledAt,
    });

    pushEvent(run.sessionId, {
      id: uid("cline_evt"),
      backendId: "cline",
      type: "run.cancelled",
      timestamp: cancellation.cancelledAt,
      sessionId: run.sessionId,
      runId: run.id,
      message: reason ?? "Cline run cancelled.",
      cancellation,
      linked: run.linked,
    });

    return cancellation;
  },

  async respondToApproval() {
    return;
  },
};
