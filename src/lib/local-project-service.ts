export type LocalProjectValidationCode =
  | "ok"
  | "missing_path"
  | "invalid_path"
  | "inaccessible_path"
  | "empty_folder"
  | "selection_cancelled";

export interface LocalProjectSelectionResult {
  status: "selected" | "cancelled" | "error";
  path?: string;
  inferredName?: string;
  message?: string;
}

export interface LocalProjectValidationResult {
  code: LocalProjectValidationCode;
  message: string;
  normalizedPath?: string;
  inferredName?: string;
  hasGitRepository?: boolean;
  hasAgentsInstructions?: boolean;
  isEmptyFolder?: boolean;
}

interface LocalFsAdapter {
  pickDirectory?: () => Promise<{ path: string; name?: string } | null>;
  stat(path: string): Promise<{ exists: boolean; isDirectory: boolean; readable: boolean }>;
  readDir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  resolve(path: string): Promise<string>;
  basename(path: string): Promise<string>;
  join(...parts: string[]): Promise<string>;
}

function getGlobalAdapter(): LocalFsAdapter | null {
  const runtime = globalThis as {
    __AIFORGE_LOCAL_FS__?: Partial<LocalFsAdapter>;
  };

  const candidate = runtime.__AIFORGE_LOCAL_FS__;
  if (!candidate?.stat || !candidate?.readDir || !candidate?.exists || !candidate?.resolve || !candidate?.basename || !candidate?.join) {
    return null;
  }

  return candidate as LocalFsAdapter;
}

async function loadNodeAdapter(): Promise<LocalFsAdapter | null> {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) {
    return null;
  }

  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const fs = await dynamicImport("node:fs/promises") as {
    access(path: string): Promise<void>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
    readdir(path: string): Promise<string[]>;
  };
  const path = await dynamicImport("node:path") as {
    resolve(input: string): string;
    basename(input: string): string;
    join(...parts: string[]): string;
  };

  return {
    async stat(targetPath: string) {
      try {
        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
          return { exists: true, isDirectory: false, readable: false };
        }
        await fs.access(targetPath);
        return { exists: true, isDirectory: true, readable: true };
      } catch {
        return { exists: false, isDirectory: false, readable: false };
      }
    },
    async readDir(targetPath: string) {
      return fs.readdir(targetPath);
    },
    async exists(targetPath: string) {
      try {
        await fs.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    async resolve(targetPath: string) {
      return path.resolve(targetPath);
    },
    async basename(targetPath: string) {
      return path.basename(targetPath);
    },
    async join(...parts: string[]) {
      return path.join(...parts);
    },
  };
}

async function getAdapter(): Promise<LocalFsAdapter | null> {
  return getGlobalAdapter() ?? loadNodeAdapter();
}

function normalizeForComparison(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function pickDirectoryViaInput(): Promise<LocalProjectSelectionResult> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ status: "error", message: "No directory picker is available in this runtime." });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.style.display = "none";

    input.addEventListener("change", () => {
      const files = input.files;
      if (!files || files.length === 0) {
        resolve({ status: "cancelled", message: "No directory selected." });
        input.remove();
        return;
      }

      const firstFile = files[0] as File & { path?: string; webkitRelativePath?: string };
      const runtimePath = firstFile.path;
      if (runtimePath) {
        const inferredName = firstFile.webkitRelativePath?.split("/")[0] ?? runtimePath.split(/[\\/]/).pop() ?? "Local Project";
        const relativePath = firstFile.webkitRelativePath ?? "";
        const calculatedRoot =
          relativePath && runtimePath.endsWith(relativePath)
            ? `${runtimePath.slice(0, runtimePath.length - relativePath.length)}${inferredName}`
            : runtimePath.slice(0, Math.max(runtimePath.lastIndexOf("/"), runtimePath.lastIndexOf("\\")));
        resolve({ status: "selected", path: calculatedRoot || runtimePath, inferredName });
        input.remove();
        return;
      }

      const inferredName = firstFile.webkitRelativePath?.split("/")[0] ?? "Selected Project";
      resolve({
        status: "error",
        message: `Folder "${inferredName}" was selected, but this runtime does not expose an absolute local path.`,
      });
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}

export async function selectLocalProjectPath(): Promise<LocalProjectSelectionResult> {
  const adapter = await getAdapter();
  if (adapter?.pickDirectory) {
    const selected = await adapter.pickDirectory();
    if (!selected) {
      return { status: "cancelled", message: "No directory selected." };
    }
    return { status: "selected", path: selected.path, inferredName: selected.name };
  }

  return pickDirectoryViaInput();
}

export async function validateLocalProjectPath(rawPath: string): Promise<LocalProjectValidationResult> {
  const trimmedPath = rawPath.trim();
  if (!trimmedPath) {
    return { code: "missing_path", message: "Please select a local project path." };
  }

  const adapter = await getAdapter();
  if (!adapter) {
    return { code: "inaccessible_path", message: "Local filesystem access is not available in this runtime." };
  }

  const resolvedPath = await adapter.resolve(trimmedPath);
  const metadata = await adapter.stat(resolvedPath);

  if (!metadata.exists || !metadata.isDirectory) {
    return { code: "invalid_path", message: "Selected path is not a valid directory.", normalizedPath: resolvedPath };
  }

  if (!metadata.readable) {
    return { code: "inaccessible_path", message: "Selected path cannot be accessed.", normalizedPath: resolvedPath };
  }

  const entries = await adapter.readDir(resolvedPath);
  const isEmptyFolder = entries.length === 0;
  const inferredName = await adapter.basename(resolvedPath);
  const hasGitRepository = await adapter.exists(await adapter.join(resolvedPath, ".git"));
  const hasAgentsInstructions = await adapter.exists(await adapter.join(resolvedPath, "AGENTS.md"));

  if (isEmptyFolder) {
    return {
      code: "empty_folder",
      message: "Selected folder is empty. Add files or select a project folder.",
      normalizedPath: resolvedPath,
      inferredName,
      hasGitRepository,
      hasAgentsInstructions,
      isEmptyFolder,
    };
  }

  return {
    code: "ok",
    message: "Local path selected.",
    normalizedPath: resolvedPath,
    inferredName,
    hasGitRepository,
    hasAgentsInstructions,
    isEmptyFolder,
  };
}

export function hasDuplicateLocalPath(candidatePath: string, existingPaths: string[]): boolean {
  const normalizedCandidate = normalizeForComparison(candidatePath);
  return existingPaths.some((entry) => normalizeForComparison(entry) === normalizedCandidate);
}
