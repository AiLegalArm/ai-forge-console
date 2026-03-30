import type {
  TerminalApprovalState,
  TerminalCommand,
  TerminalCommandHistoryEntry,
  TerminalExecutionClassification,
  TerminalExecutionFailureReason,
  TerminalOutputLine,
  TerminalSession,
  TerminalSessionExecutionState,
  TerminalSessionState,
  TerminalCommandOrigin,
} from "@/types/local-shell";

interface CommandRuntime {
  processId?: number;
  startedAtIso?: string;
  completedAtIso?: string;
}

interface SessionRuntimeState {
  session: TerminalSession;
  runtimeByCommandId: Record<string, CommandRuntime>;
}

interface ExecuteCommandInput {
  command: string;
  cwd?: string;
  linkedTaskId?: string;
  linkedChatSessionId?: string;
  timeoutMs?: number;
  approved?: boolean;
  origin?: TerminalCommandOrigin;
  linkedAgentId?: string;
  linkedAgentCommandRequestId?: string;
  commandSource?: string;
  originReason?: string;
}

export interface ExecuteCommandResult {
  sessionId: string;
  command: TerminalCommand;
  output: TerminalOutputLine[];
}

const SAFE_READ_ONLY_PREFIXES = [
  "pwd",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "find",
  "git status",
  "git log",
  "git diff",
  "git branch",
  "git show",
  "npm run lint",
  "npm run test",
  "npm test",
  "pnpm lint",
  "pnpm test",
  "bun test",
];

const MODIFYING_PREFIXES = [
  "git add",
  "git commit",
  "git switch",
  "git checkout",
  "git restore",
  "git reset",
  "npm install",
  "pnpm install",
  "bun install",
  "touch",
  "mkdir",
  "cp",
  "mv",
  "sed -i",
];

const RISKY_PREFIXES = [
  "rm ",
  "rm -",
  "sudo",
  "chmod",
  "chown",
  "mkfs",
  "dd ",
  "curl ",
  "wget ",
  "git push",
  "git rebase",
  "git clean",
  "kill ",
  "shutdown",
  "reboot",
  "docker ",
  "kubectl ",
];

function nowIso() {
  return new Date().toISOString();
}

function lineId() {
  return `line_${Math.random().toString(36).slice(2, 10)}`;
}

function commandId() {
  return `cmd_${Math.random().toString(36).slice(2, 10)}`;
}

function sessionId() {
  return `term_${Math.random().toString(36).slice(2, 10)}`;
}

function asFailureReason(error: string): TerminalExecutionFailureReason {
  if (error.includes("ENOENT") || error.includes("not found")) return "command_not_found";
  if (error.includes("working directory") || error.includes("cwd")) return "invalid_working_directory";
  if (error.includes("timed out")) return "timeout";
  return "execution_failure";
}

function classifyCommand(command: string): TerminalExecutionClassification {
  const normalized = command.trim().toLowerCase();
  if (RISKY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "risky";
  if (MODIFYING_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "modifying";
  if (SAFE_READ_ONLY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "safe_read_only";
  if (normalized.startsWith("git ")) return "modifying";
  return "risky";
}

function approvalFor(classification: TerminalExecutionClassification): TerminalApprovalState {
  if (classification === "safe_read_only") return "not_required";
  return "required";
}

async function loadExecRuntime() {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) return null;

  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const childProcess = (await dynamicImport("node:child_process")) as {
    spawn: (file: string, args?: string[], options?: Record<string, unknown>) => {
      pid?: number;
      stdout?: { on: (event: string, callback: (chunk: Buffer | string) => void) => void };
      stderr?: { on: (event: string, callback: (chunk: Buffer | string) => void) => void };
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      kill: (signal?: string) => boolean;
    };
  };

  return childProcess;
}

export class LocalTerminalExecutionService {
  private readonly sessions = new Map<string, SessionRuntimeState>();
  private selectedSessionId?: string;

  constructor(private readonly fallbackWorkingDirectory: string) {}

  createSession(params?: { workingDirectory?: string; linkedTaskId?: string; linkedChatSessionId?: string }): TerminalSession {
    const id = sessionId();
    const session: TerminalSession = {
      id,
      linkedTaskId: params?.linkedTaskId,
      linkedChatSessionId: params?.linkedChatSessionId,
      workingDirectory: params?.workingDirectory ?? this.fallbackWorkingDirectory,
      currentCommandId: undefined,
      executionState: "idle",
      failureState: "none",
      commandHistory: [],
      outputLog: [
        {
          id: lineId(),
          timestampIso: nowIso(),
          stream: "system",
          text: "Terminal session initialized.",
          sessionId: id,
        },
      ],
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
    };

    this.sessions.set(id, { session, runtimeByCommandId: {} });
    this.selectedSessionId = id;
    return session;
  }

  selectSession(id: string): TerminalSession | null {
    const state = this.sessions.get(id);
    if (!state) return null;
    this.selectedSessionId = id;
    return state.session;
  }

  getSelectedSession(): TerminalSession | null {
    if (!this.selectedSessionId) return null;
    return this.sessions.get(this.selectedSessionId)?.session ?? null;
  }

  setWorkingDirectory(sessionIdValue: string, workingDirectory: string) {
    const state = this.sessions.get(sessionIdValue);
    if (!state) return null;
    state.session.workingDirectory = workingDirectory;
    state.session.updatedAtIso = nowIso();
    this.emitSystemLine(state.session, `Working directory set to ${workingDirectory}`);
    return state.session;
  }

  getSessionState(): TerminalSessionState {
    const selected = this.getSelectedSession();
    if (!selected) {
      const created = this.createSession({ workingDirectory: this.fallbackWorkingDirectory });
      return this.toLegacyState(created);
    }

    return this.toLegacyState(selected);
  }

  private toLegacyState(session: TerminalSession): TerminalSessionState {
    return {
      sessionId: session.id,
      workingDirectory: session.workingDirectory,
      state: mapExecutionState(session.executionState),
      history: session.commandHistory,
      output: session.outputLog,
      sessions: Array.from(this.sessions.values()).map((entry) => entry.session),
      selectedSessionId: session.id,
    };
  }

  private emitSystemLine(session: TerminalSession, text: string): TerminalOutputLine {
    const line: TerminalOutputLine = {
      id: lineId(),
      timestampIso: nowIso(),
      stream: "system",
      text,
      sessionId: session.id,
    };
    session.outputLog = [...session.outputLog, line];
    session.updatedAtIso = nowIso();
    return line;
  }

  async execute(sessionIdValue: string, input: ExecuteCommandInput): Promise<ExecuteCommandResult> {
    const state = this.sessions.get(sessionIdValue);
    if (!state) throw new Error(`Terminal session ${sessionIdValue} not found.`);

    const session = state.session;
    const cwd = input.cwd ?? session.workingDirectory;
    const classification = classifyCommand(input.command);
    const approvalState = approvalFor(classification);
    const requiresApproval = approvalState === "required";

    const command: TerminalCommand = {
      id: commandId(),
      command: input.command,
      cwd,
      state: "queued",
      requiresApproval,
      linkedTaskId: input.linkedTaskId ?? session.linkedTaskId,
      linkedChatSessionId: input.linkedChatSessionId ?? session.linkedChatSessionId,
      classification,
      approvalState,
      createdAtIso: nowIso(),
      updatedAtIso: nowIso(),
      origin: input.origin,
      linkedAgentId: input.linkedAgentId,
      linkedAgentCommandRequestId: input.linkedAgentCommandRequestId,
      commandSource: input.commandSource,
      originReason: input.originReason,
    };

    session.commandHistory = [command, ...session.commandHistory].slice(0, 100);
    session.currentCommandId = command.id;
    session.executionState = "queued";
    session.updatedAtIso = nowIso();

    const headerLine: TerminalOutputLine = {
      id: lineId(),
      timestampIso: nowIso(),
      stream: "stdout",
      text: `$ ${input.command}`,
      sessionId: session.id,
      commandId: command.id,
    };
    session.outputLog = [...session.outputLog, headerLine];

    if (requiresApproval && !input.approved) {
      command.state = "approval_required";
      command.approvalState = "pending";
      command.failureReason = "approval_denied";
      command.updatedAtIso = nowIso();
      session.executionState = "waiting_for_approval";
      this.emitSystemLine(session, `Approval required before executing: ${input.command}`);
      return { sessionId: session.id, command, output: [headerLine] };
    }

    command.approvalState = requiresApproval ? "approved" : "not_required";
    command.state = "running";
    command.startedAtIso = nowIso();
    command.updatedAtIso = nowIso();
    session.executionState = "running";

    const runtime = await loadExecRuntime();
    if (!runtime) {
      command.state = "failed";
      command.failureReason = "runtime_unavailable";
      command.completedAtIso = nowIso();
      command.updatedAtIso = nowIso();
      session.executionState = "failed";
      session.failureState = "runtime_unavailable";
      const line = this.emitSystemLine(session, "Local execution runtime unavailable in this environment.");
      return { sessionId: session.id, command, output: [headerLine, line] };
    }

    const output: TerminalOutputLine[] = [headerLine];

    await new Promise<void>((resolve) => {
      const child = runtime.spawn("bash", ["-lc", input.command], { cwd, env: process.env });
      state.runtimeByCommandId[command.id] = { processId: child.pid, startedAtIso: nowIso() };

      const timeoutMs = input.timeoutMs ?? 120000;
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        command.state = "failed";
        command.failureReason = "timeout";
        command.failureDetail = `Command timed out after ${timeoutMs}ms`;
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        const text = String(chunk);
        const line: TerminalOutputLine = {
          id: lineId(),
          timestampIso: nowIso(),
          stream: "stdout",
          text,
          sessionId: session.id,
          commandId: command.id,
        };
        output.push(line);
        session.outputLog = [...session.outputLog, line];
      });

      child.stderr?.on("data", (chunk) => {
        const text = String(chunk);
        const line: TerminalOutputLine = {
          id: lineId(),
          timestampIso: nowIso(),
          stream: "stderr",
          text,
          sessionId: session.id,
          commandId: command.id,
        };
        output.push(line);
        session.outputLog = [...session.outputLog, line];
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        command.state = "failed";
        command.failureReason = asFailureReason(String(error));
        command.failureDetail = String(error);
        resolve();
      });

      child.on("close", (code: unknown) => {
        clearTimeout(timer);
        const exitCode = typeof code === "number" ? code : 1;
        command.exitCode = exitCode;
        if (command.state !== "failed") {
          command.state = exitCode === 0 ? "completed" : "failed";
          command.failureReason = exitCode === 0 ? undefined : "execution_failure";
        }
        resolve();
      });
    });

    command.completedAtIso = nowIso();
    command.updatedAtIso = nowIso();
    session.executionState = mapCommandState(command.state);
    session.failureState = command.failureReason ?? "none";
    session.updatedAtIso = nowIso();
    state.runtimeByCommandId[command.id] = {
      ...state.runtimeByCommandId[command.id],
      completedAtIso: command.completedAtIso,
    };

    return { sessionId: session.id, command, output };
  }
}

function mapExecutionState(state: TerminalSessionExecutionState): TerminalSessionState["state"] {
  if (state === "running") return "running";
  if (state === "failed") return "error";
  return "ready";
}

function mapCommandState(state: TerminalCommand["state"]): TerminalSessionExecutionState {
  if (state === "running") return "running";
  if (state === "failed") return "failed";
  if (state === "approval_required") return "waiting_for_approval";
  return "idle";
}

export function createLocalTerminalExecutionService(fallbackWorkingDirectory: string) {
  return new LocalTerminalExecutionService(fallbackWorkingDirectory);
}
