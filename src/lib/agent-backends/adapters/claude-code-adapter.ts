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
  ClaudeCodeBackendSnapshot,
  ClaudeCodeBackendState,
  ClaudeCodeConfiguration,
  ClaudeCodeRun,
  ClaudeCodeSession,
} from "@/types/claude-code-backend";
import { mapClaudeStateToBackendStatus } from "@/types/claude-code-backend";

const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const claudeConfig: ClaudeCodeConfiguration = {
  executablePath: "claude",
  workingDirectory: "/workspace/ai-forge-console",
  configuredAt: nowIso(),
  environment: {
    CLAUDE_CODE_TRANSPORT: "stdio",
  },
};

let backendState: ClaudeCodeBackendState = "ready";
const sessions = new Map<string, ClaudeCodeSession>();
const runs = new Map<string, ClaudeCodeRun>();
const results = new Map<string, AgentBackendTaskResult>();
const eventsBySession = new Map<string, AgentBackendEvent[]>();

function getSnapshot(): ClaudeCodeBackendSnapshot {
  const checkedAt = nowIso();
  const isInstalled = backendState !== "not_installed";
  const isConfigured = backendState === "configured" || backendState === "ready" || backendState === "degraded";
  const isAvailable = backendState === "ready" || backendState === "degraded";

  return {
    backendState,
    configuration: claudeConfig,
    configurationState: {
      state: backendState,
      configured: isConfigured,
      detail:
        backendState === "error"
          ? "Claude Code runtime reported an execution bootstrap error."
          : backendState === "degraded"
            ? "Claude Code runtime available with reduced throughput."
            : "Claude Code runtime configuration loaded.",
      lastTransitionAt: checkedAt,
    },
    availability: {
      state: backendState,
      isInstalled,
      isAvailable,
      health: backendState === "error" ? "error" : backendState === "degraded" ? "degraded" : isAvailable ? "healthy" : "unhealthy",
      detail:
        backendState === "not_installed"
          ? "Claude Code executable was not found in PATH."
          : backendState === "unavailable"
            ? "Claude Code runtime is installed but currently unreachable."
            : undefined,
      checkedAt,
    },
    metadata: {
      runtimeName: "claude-code",
      runtimeVersion: "1.0.0-adapter-foundation",
      platform: "local-cli",
      transport: "stdio",
    },
    readiness: {
      canCreateSession: isAvailable,
      canSubmitTask: isAvailable,
      canStreamProgress: true,
      canCancel: true,
      reason: isAvailable ? undefined : "Claude Code backend is not in a task-ready state.",
    },
  };
}

function toAvailability(snapshot: ClaudeCodeBackendSnapshot): AgentBackendAvailability {
  const status = mapClaudeStateToBackendStatus(snapshot.backendState);
  return {
    installed: snapshot.availability.isInstalled,
    configured: snapshot.configurationState.configured,
    status,
    health: snapshot.availability.health,
    statusDetail:
      snapshot.availability.detail ??
      `state=${snapshot.backendState}; executable=${snapshot.configuration.executablePath}; cwd=${snapshot.configuration.workingDirectory}`,
    lastCheckedAt: snapshot.availability.checkedAt,
  };
}

function pushEvent(sessionId: string, event: AgentBackendEvent) {
  const list = eventsBySession.get(sessionId) ?? [];
  list.push(event);
  eventsBySession.set(sessionId, list);
}

function createRunLifecycleEvents(
  session: AgentBackendSession,
  run: AgentBackendRun,
  task: AgentBackendTaskSubmission,
): { progress: AgentBackendEvent[]; result: AgentBackendTaskResult } {
  const progress1 = {
    id: uid("event"),
    backendId: "claude_code" as const,
    type: "run.progress" as const,
    timestamp: nowIso(),
    sessionId: session.id,
    runId: run.id,
    progress: 20,
    message: `Queued task \"${task.title}\" in Claude Code runtime.`,
    linked: task.linked,
  };

  const progress2 = {
    id: uid("event"),
    backendId: "claude_code" as const,
    type: "run.progress" as const,
    timestamp: nowIso(),
    sessionId: session.id,
    runId: run.id,
    progress: 70,
    message: "Claude Code is applying changes and validating output.",
    linked: task.linked,
  };

  const result: AgentBackendTaskResult = {
    runId: run.id,
    status: "completed",
    summary: `Claude Code completed task: ${task.title}`,
    output: "Session foundation executed in mock adapter mode.",
    linked: task.linked,
    completedAt: nowIso(),
  };

  return { progress: [progress1, progress2], result };
}

export const claudeCodeAdapter: AgentBackendContract = {
  id: "claude_code",
  metadata: {
    displayName: "Claude Code",
    description: "Anthropic Claude Code backend adapter integrated via the shared agent backend contract.",
    owner: "Anthropic",
    version: "adapter-foundation-1",
    tags: ["cloud", "cli", "coding", "provider-hub", "preference-candidate"],
  },
  capabilities: {
    localCliExecution: true,
    multiFileEditing: true,
    taskExecution: true,
    terminalToolUse: true,
    streamingProgress: true,
    approvalIntegration: true,
    operationModes: ["local", "cloud", "hybrid"],
    promptSystemConfig: true,
  },
  eventStreamMode: "stream",
  async getAvailability() {
    return toAvailability(getSnapshot());
  },
  async createSession(linked?: LinkedExecutionRef) {
    const snapshot = getSnapshot();
    if (!snapshot.readiness.canCreateSession) {
      throw new Error(snapshot.readiness.reason ?? "Claude Code backend is not ready for sessions.");
    }

    const session: ClaudeCodeSession = {
      id: uid("claude-session"),
      backendId: "claude_code",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: "active",
      linked,
      metadata: {
        workingDirectory: snapshot.configuration.workingDirectory,
        executablePath: snapshot.configuration.executablePath,
        runtimeVersion: snapshot.metadata.runtimeVersion,
      },
    };

    sessions.set(session.id, session);
    pushEvent(session.id, {
      id: uid("event"),
      backendId: "claude_code",
      type: "session.updated",
      timestamp: nowIso(),
      sessionId: session.id,
      message: "Claude Code session started.",
      linked,
    });
    return session;
  },
  async closeSession(sessionId: string) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.status = "closed";
    session.updatedAt = nowIso();
    sessions.set(sessionId, session);
    pushEvent(sessionId, {
      id: uid("event"),
      backendId: "claude_code",
      type: "session.updated",
      timestamp: nowIso(),
      sessionId,
      message: "Claude Code session closed.",
      linked: session.linked,
    });
  },
  async submitTask(sessionId: string, task: AgentBackendTaskSubmission) {
    const session = sessions.get(sessionId);
    const snapshot = getSnapshot();
    if (!session) {
      throw new Error(`Claude Code session not found: ${sessionId}`);
    }
    if (!snapshot.readiness.canSubmitTask) {
      throw new Error(snapshot.readiness.reason ?? "Claude Code backend is not ready to process tasks.");
    }

    const run: ClaudeCodeRun = {
      id: uid("claude-run"),
      backendId: "claude_code",
      sessionId,
      status: "running",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      linked: task.linked,
      metadata: {
        taskTitle: task.title,
        startedBy: "provider_hub",
      },
    };

    runs.set(run.id, run);
    pushEvent(sessionId, {
      id: uid("event"),
      backendId: "claude_code",
      type: "run.updated",
      timestamp: nowIso(),
      sessionId,
      runId: run.id,
      message: `Claude Code started task: ${task.title}`,
      linked: task.linked,
    });

    const lifecycle = createRunLifecycleEvents(session, run, task);
    lifecycle.progress.forEach((event) => pushEvent(sessionId, event));

    run.status = "completed";
    run.updatedAt = nowIso();
    runs.set(run.id, run);
    results.set(run.id, lifecycle.result);

    pushEvent(sessionId, {
      id: uid("event"),
      backendId: "claude_code",
      type: "run.result",
      timestamp: lifecycle.result.completedAt,
      sessionId,
      runId: run.id,
      message: lifecycle.result.summary,
      result: lifecycle.result,
      linked: task.linked,
    });

    return run;
  },
  async getRun(runId: string) {
    return runs.get(runId) ?? null;
  },
  async getRunResult(runId: string) {
    return results.get(runId) ?? null;
  },
  async listEvents(sessionId: string, cursor?: string) {
    const events = eventsBySession.get(sessionId) ?? [];
    const startIndex = cursor ? Number(cursor) : 0;
    if (Number.isNaN(startIndex) || startIndex < 0) {
      return { events, nextCursor: String(events.length) };
    }
    const sliced = events.slice(startIndex);
    return {
      events: sliced,
      nextCursor: String(events.length),
    };
  },
  async cancelRun(runId: string, reason?: string): Promise<AgentBackendCancellation> {
    const run = runs.get(runId);
    const cancelledAt = nowIso();
    if (run) {
      run.status = "cancelled";
      run.updatedAt = cancelledAt;
      runs.set(runId, run);
      const cancellation: AgentBackendCancellation = { runId, reason, cancelledAt };
      results.set(runId, {
        runId,
        status: "cancelled",
        summary: reason ? `Cancelled: ${reason}` : "Cancelled by user.",
        completedAt: cancelledAt,
        linked: run.linked,
      });
      pushEvent(run.sessionId, {
        id: uid("event"),
        backendId: "claude_code",
        type: "run.cancelled",
        timestamp: cancelledAt,
        sessionId: run.sessionId,
        runId,
        message: reason ?? "Run cancelled.",
        cancellation,
        linked: run.linked,
      });
      return cancellation;
    }

    const fallback: AgentBackendFailure = {
      backendId: "claude_code",
      runId,
      code: "RUN_NOT_FOUND",
      message: `Unable to cancel unknown run: ${runId}`,
      recoverable: true,
      occurredAt: cancelledAt,
    };
    backendState = "degraded";
    return {
      runId,
      reason: `${reason ?? "cancel requested"}; ${fallback.message}`,
      cancelledAt,
    };
  },
  async respondToApproval() {
    return;
  },
};
