import type { RepoBranchState, StagedChangesSummary } from "@/types/workflow";

interface GitExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface GitExecAdapter {
  run(args: string[], cwd: string): Promise<GitExecResult>;
}

export interface GitFileChange {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
}

export interface GitRepositorySnapshot {
  cwd: string;
  branch: string;
  branchState: RepoBranchState;
  stagedSummary: StagedChangesSummary;
  fileChanges: GitFileChange[];
  clean: boolean;
  aheadBy: number;
  behindBy: number;
}

export interface GitOperationResult {
  ok: boolean;
  message: string;
  details?: string;
}

function getGlobalAdapter(): GitExecAdapter | null {
  const maybeAdapter = (globalThis as { __AIFORGE_GIT_EXEC__?: GitExecAdapter }).__AIFORGE_GIT_EXEC__;
  return maybeAdapter ?? null;
}

async function loadNodeExecAdapter(): Promise<GitExecAdapter | null> {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) {
    return null;
  }

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
    run(args: string[], cwd: string) {
      return new Promise<GitExecResult>((resolve) => {
        childProcess.execFile("git", args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
          const exitCode = error ? 1 : 0;
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
        });
      });
    },
  };
}

async function getAdapter(): Promise<GitExecAdapter | null> {
  return getGlobalAdapter() ?? loadNodeExecAdapter();
}

function parseTrackingStatus(aheadBy: number, behindBy: number): RepoBranchState["trackingStatus"] {
  if (aheadBy > 0 && behindBy > 0) return "diverged";
  if (aheadBy > 0) return "ahead";
  if (behindBy > 0) return "behind";
  return "tracking";
}

function summarizeChanges(fileChanges: GitFileChange[]): StagedChangesSummary {
  const filesChanged = fileChanges.length;
  const notablePaths = fileChanges.slice(0, 5).map((entry) => entry.path);
  const hasUncommittedChanges = filesChanged > 0;

  return {
    filesChanged,
    insertions: 0,
    deletions: 0,
    notablePaths,
    hasUncommittedChanges,
  };
}

export class LocalGitService {
  constructor(private readonly cwd: string) {}

  private async run(args: string[]): Promise<GitExecResult> {
    const adapter = await getAdapter();
    if (!adapter) {
      return { stdout: "", stderr: "No local git runtime adapter available.", exitCode: 1 };
    }

    return adapter.run(args, this.cwd);
  }

  async getSnapshot(): Promise<GitRepositorySnapshot> {
    const branchResult = await this.run(["rev-parse", "--abbrev-ref", "HEAD"]);
    const statusResult = await this.run(["status", "--porcelain=1", "--branch"]);

    const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : "unknown";
    const lines = statusResult.stdout.split("\n").filter(Boolean);
    const branchLine = lines.find((line) => line.startsWith("##")) ?? "";
    const fileLines = lines.filter((line) => !line.startsWith("##"));

    const aheadMatch = branchLine.match(/ahead (\d+)/);
    const behindMatch = branchLine.match(/behind (\d+)/);
    const aheadBy = aheadMatch ? Number(aheadMatch[1]) : 0;
    const behindBy = behindMatch ? Number(behindMatch[1]) : 0;

    const fileChanges: GitFileChange[] = fileLines.map((line) => ({
      indexStatus: line[0] ?? " ",
      workTreeStatus: line[1] ?? " ",
      path: line.slice(3).trim(),
    }));

    const branchState: RepoBranchState = {
      localBranchName: branch,
      remoteBranchName: branchLine.includes("...") ? `origin/${branch}` : undefined,
      trackingStatus: parseTrackingStatus(aheadBy, behindBy),
      aheadBy,
      behindBy,
    };

    return {
      cwd: this.cwd,
      branch,
      branchState,
      stagedSummary: summarizeChanges(fileChanges),
      fileChanges,
      clean: fileChanges.length === 0,
      aheadBy,
      behindBy,
    };
  }

  async createOrSwitchBranch(branchName: string): Promise<GitOperationResult> {
    const check = await this.run(["rev-parse", "--verify", branchName]);
    const args = check.exitCode === 0 ? ["switch", branchName] : ["switch", "-c", branchName];
    const result = await this.run(args);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? `Switched to ${branchName}` : `Failed to switch to ${branchName}`,
      details: result.stderr || result.stdout,
    };
  }

  async stageAll(): Promise<GitOperationResult> {
    const result = await this.run(["add", "-A"]);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Staged all changes" : "Failed to stage changes",
      details: result.stderr || result.stdout,
    };
  }

  async unstageAll(): Promise<GitOperationResult> {
    const result = await this.run(["reset", "HEAD", "--", "."]);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Unstaged changes" : "Failed to unstage changes",
      details: result.stderr || result.stdout,
    };
  }

  async commit(message: string): Promise<GitOperationResult> {
    const result = await this.run(["commit", "-m", message]);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Commit created" : "Commit failed",
      details: result.stderr || result.stdout,
    };
  }

  async push(branchName?: string): Promise<GitOperationResult> {
    const args = branchName ? ["push", "-u", "origin", branchName] : ["push"];
    const result = await this.run(args);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Push successful" : "Push failed",
      details: result.stderr || result.stdout,
    };
  }

  async fetch(): Promise<GitOperationResult> {
    const result = await this.run(["fetch", "--all", "--prune"]);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Fetch successful" : "Fetch failed",
      details: result.stderr || result.stdout,
    };
  }

  async pull(): Promise<GitOperationResult> {
    const result = await this.run(["pull", "--ff-only"]);
    return {
      ok: result.exitCode === 0,
      message: result.exitCode === 0 ? "Pull successful" : "Pull failed",
      details: result.stderr || result.stdout,
    };
  }
}

export function createLocalGitService(cwd: string) {
  return new LocalGitService(cwd);
}
