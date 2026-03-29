import { validateLocalProjectPath } from "@/lib/local-project-service";

export type RepositoryConnectionSource = "local_path" | "project_bound" | "github_ready";

export type RepositoryValidationCode =
  | "ok"
  | "missing_active_project"
  | "missing_path"
  | "invalid_path"
  | "inaccessible_path"
  | "not_git_repository"
  | "already_connected"
  | "project_repo_mismatch";

export interface RepositoryMetadata {
  rootPath: string;
  name: string;
  branch: string;
  remoteUrl?: string;
  clean: boolean;
  aheadBy: number;
  behindBy: number;
}

export interface RepositoryValidationResult {
  code: RepositoryValidationCode;
  message: string;
  metadata?: RepositoryMetadata;
  source?: RepositoryConnectionSource;
}

interface RepositoryExecAdapter {
  run(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

function inferRepositoryName(rootPath: string, remoteUrl?: string): string {
  const fromRemote = remoteUrl?.split("/").pop()?.replace(/\.git$/i, "");
  if (fromRemote) return fromRemote;
  const normalized = rootPath.replace(/\\/g, "/").replace(/\/+$/g, "");
  return normalized.split("/").pop() || "repository";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

async function loadExecAdapter(): Promise<RepositoryExecAdapter | null> {
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
    run(args, cwd) {
      return new Promise((resolve) => {
        childProcess.execFile("git", args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: error ? 1 : 0 });
        });
      });
    },
  };
}

export async function inspectRepository(path: string): Promise<RepositoryMetadata | null> {
  const adapter = await loadExecAdapter();
  if (!adapter) return null;

  const rootResult = await adapter.run(["rev-parse", "--show-toplevel"], path);
  if (rootResult.exitCode !== 0) return null;
  const rootPath = rootResult.stdout.trim();

  const [branchResult, statusResult, remoteResult] = await Promise.all([
    adapter.run(["rev-parse", "--abbrev-ref", "HEAD"], rootPath),
    adapter.run(["status", "--porcelain=1", "--branch"], rootPath),
    adapter.run(["remote", "get-url", "origin"], rootPath),
  ]);

  const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : "main";
  const statusLines = statusResult.stdout.split("\n").filter(Boolean);
  const branchLine = statusLines.find((line) => line.startsWith("##")) ?? "";
  const clean = statusLines.filter((line) => !line.startsWith("##")).length === 0;
  const aheadBy = Number(branchLine.match(/ahead (\d+)/)?.[1] ?? 0);
  const behindBy = Number(branchLine.match(/behind (\d+)/)?.[1] ?? 0);
  const remoteUrl = remoteResult.exitCode === 0 ? remoteResult.stdout.trim() : undefined;

  return {
    rootPath,
    name: inferRepositoryName(rootPath, remoteUrl),
    branch,
    remoteUrl,
    clean,
    aheadBy,
    behindBy,
  };
}

export async function validateRepositoryConnection(input: {
  pathOrUrl: string;
  activeProject?: { id: string; name: string; projectRoot?: string; repositoryConnected?: boolean };
  connectedRepoRoots?: string[];
}): Promise<RepositoryValidationResult> {
  if (!input.activeProject) {
    return { code: "missing_active_project", message: "Select an active project before connecting a repository." };
  }

  const candidate = input.pathOrUrl.trim();
  if (!candidate) {
    return { code: "missing_path", message: "Enter a local repository path to connect." };
  }

  const projectPathValidation = await validateLocalProjectPath(candidate);
  if (projectPathValidation.code !== "ok") {
    if (projectPathValidation.code === "missing_path") {
      return { code: "missing_path", message: projectPathValidation.message };
    }
    if (projectPathValidation.code === "invalid_path") {
      return { code: "invalid_path", message: projectPathValidation.message };
    }
    return { code: "inaccessible_path", message: projectPathValidation.message };
  }

  const repo = await inspectRepository(projectPathValidation.normalizedPath ?? candidate);
  if (!repo) {
    return {
      code: "not_git_repository",
      message: "Selected folder is not a git repository. Choose a folder that contains a .git history.",
    };
  }

  const connectedRoots = (input.connectedRepoRoots ?? []).map(normalizePath);
  if (connectedRoots.includes(normalizePath(repo.rootPath))) {
    return { code: "already_connected", message: "This repository is already connected to a project." };
  }

  if (input.activeProject.projectRoot && normalizePath(input.activeProject.projectRoot) !== normalizePath(repo.rootPath)) {
    return {
      code: "project_repo_mismatch",
      message: `Repository root (${repo.rootPath}) does not match active project root (${input.activeProject.projectRoot}).`,
      metadata: repo,
      source: "local_path",
    };
  }

  return {
    code: "ok",
    message: `Connected ${repo.name} on ${repo.branch}.`,
    metadata: repo,
    source: input.activeProject.projectRoot ? "project_bound" : "local_path",
  };
}
