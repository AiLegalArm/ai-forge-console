interface ShellExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ShellExecAdapter {
  run(file: string, args: string[], cwd: string): Promise<ShellExecResult>;
}

export interface PullRequestDraftInput {
  taskId: string;
  taskTitle: string;
  sourceBranch: string;
  targetBranch: string;
  commitSummary?: string;
  linkedSubtaskIds: string[];
  linkedAuditId?: string;
}

export interface PullRequestDraftMetadata {
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  linkedTaskIds: string[];
  linkedSubtaskIds: string[];
  linkedAuditId?: string;
}

export interface PullRequestCreationInput {
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  draft?: boolean;
}

export interface PullRequestCreationResult {
  ok: boolean;
  url?: string;
  number?: number;
  details?: string;
}

async function loadExecAdapter(): Promise<ShellExecAdapter | null> {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) return null;

  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const childProcess = await dynamicImport("node:child_process") as {
    execFile: (
      file: string,
      args: string[],
      options: { cwd: string; encoding: "utf8" },
      callback: (error: Error | null, stdout: string, stderr: string) => void,
    ) => void;
  };

  return {
    run(file: string, args: string[], cwd: string) {
      return new Promise((resolve) => {
        childProcess.execFile(file, args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: error ? 1 : 0 });
        });
      });
    },
  };
}

function parsePullRequestUrl(text: string): { url?: string; number?: number } {
  const match = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/i);
  if (!match) return {};
  return { url: match[0], number: Number(match[1]) };
}

export class LocalGitHubService {
  constructor(private readonly cwd: string) {}

  private async run(file: string, args: string[]): Promise<ShellExecResult> {
    const adapter = await loadExecAdapter();
    if (!adapter) {
      return { stdout: "", stderr: "Local shell adapter unavailable.", exitCode: 1 };
    }
    return adapter.run(file, args, this.cwd);
  }

  async checkGitHubAuth(): Promise<{ ok: boolean; details?: string }> {
    const result = await this.run("gh", ["auth", "status"]);
    return {
      ok: result.exitCode === 0,
      details: result.stderr || result.stdout || undefined,
    };
  }

  preparePullRequestDraft(input: PullRequestDraftInput): PullRequestDraftMetadata {
    const title = `feat(${input.taskId}): ${input.taskTitle}`;
    const lines = [
      "## Summary",
      `- ${input.commitSummary?.trim() || "Task changes prepared for review."}`,
      "",
      "## Linked context",
      `- Task: ${input.taskId}`,
      ...input.linkedSubtaskIds.map((subtaskId) => `- Subtask: ${subtaskId}`),
    ];
    if (input.linkedAuditId) {
      lines.push(`- Audit: ${input.linkedAuditId}`);
    }
    lines.push("", "## Review checklist", "- [ ] Tests are green", "- [ ] Audit findings triaged");

    return {
      title,
      body: lines.join("\n"),
      sourceBranch: input.sourceBranch,
      targetBranch: input.targetBranch,
      linkedTaskIds: [input.taskId],
      linkedSubtaskIds: input.linkedSubtaskIds,
      linkedAuditId: input.linkedAuditId,
    };
  }

  async createPullRequest(input: PullRequestCreationInput): Promise<PullRequestCreationResult> {
    const auth = await this.checkGitHubAuth();
    if (!auth.ok) {
      return { ok: false, details: auth.details || "GitHub CLI is not authenticated." };
    }

    const args = [
      "pr",
      "create",
      "--head",
      input.sourceBranch,
      "--base",
      input.targetBranch,
      "--title",
      input.title,
      "--body",
      input.body,
    ];
    if (input.draft ?? true) {
      args.push("--draft");
    }

    const result = await this.run("gh", args);
    if (result.exitCode !== 0) {
      return { ok: false, details: result.stderr || result.stdout };
    }

    const parsed = parsePullRequestUrl(result.stdout || result.stderr);
    return {
      ok: true,
      url: parsed.url,
      number: parsed.number,
      details: result.stdout || result.stderr,
    };
  }
}

export function createLocalGitHubService(cwd: string) {
  return new LocalGitHubService(cwd);
}
