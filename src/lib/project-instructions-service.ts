export type ProjectInstructionFileType = "AGENTS.md" | "AGENT.md";

export type ProjectInstructionStatus = "not_found" | "found" | "loaded" | "parse_warning" | "load_error";

export interface ProjectInstructionSectionSummary {
  environmentHints: string[];
  commands: string[];
  testingInstructions: string[];
  conventions: string[];
  workflowNotes: string[];
}

export interface ProjectInstructionSource {
  path: string;
  fileType: ProjectInstructionFileType;
}

export interface ProjectInstructionState {
  status: ProjectInstructionStatus;
  source?: ProjectInstructionSource;
  candidates: ProjectInstructionSource[];
  rawContent?: string;
  parsed: ProjectInstructionSectionSummary;
  summary: string;
  lastLoadedAtIso?: string;
  warning?: string;
  error?: string;
}

interface InstructionFsAdapter {
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ exists: boolean; isDirectory: boolean; readable: boolean }>;
  readDir(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  join(...parts: string[]): Promise<string>;
}

const SKIP_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", "coverage"]);

const initialSummary: ProjectInstructionSectionSummary = {
  environmentHints: [],
  commands: [],
  testingInstructions: [],
  conventions: [],
  workflowNotes: [],
};

async function dynamicImport(specifier: string): Promise<unknown> {
  return import(/* @vite-ignore */ specifier);
}

function cloneInitialSummary(): ProjectInstructionSectionSummary {
  return {
    environmentHints: [],
    commands: [],
    testingInstructions: [],
    conventions: [],
    workflowNotes: [],
  };
}

function getGlobalAdapter(): InstructionFsAdapter | null {
  const runtime = globalThis as {
    __AIFORGE_LOCAL_FS__?: Partial<InstructionFsAdapter>;
  };

  const candidate = runtime.__AIFORGE_LOCAL_FS__;
  if (!candidate?.exists || !candidate?.stat || !candidate?.readDir || !candidate?.join || !candidate?.readFile) {
    return null;
  }

  return candidate as InstructionFsAdapter;
}

async function loadNodeAdapter(): Promise<InstructionFsAdapter | null> {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) {
    return null;
  }

  const fs = await dynamicImport("node:fs/promises") as {
    access(path: string): Promise<void>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
    readdir(path: string): Promise<string[]>;
    readFile(path: string, encoding: string): Promise<string>;
  };
  const path = await dynamicImport("node:path") as {
    join(...parts: string[]): string;
  };

  return {
    async exists(targetPath: string) {
      try {
        await fs.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    async stat(targetPath: string) {
      try {
        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
          return { exists: true, isDirectory: false, readable: true };
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
    async readFile(targetPath: string) {
      return fs.readFile(targetPath, "utf8");
    },
    async join(...parts: string[]) {
      return path.join(...parts);
    },
  };
}

async function getAdapter(): Promise<InstructionFsAdapter | null> {
  return getGlobalAdapter() ?? loadNodeAdapter();
}

function classifyLine(line: string, summary: ProjectInstructionSectionSummary) {
  const normalized = line.trim();
  if (!normalized) return;

  const lowercase = normalized.toLowerCase();
  if (/(npm |pnpm |yarn |bun |make |cargo |go test|pytest|vitest|jest|docker )/.test(lowercase) || /^`[^`]+`$/.test(normalized)) {
    summary.commands.push(normalized.replace(/^`|`$/g, ""));
  }

  if (/(test|spec|verification|validate|checks?)/.test(lowercase)) {
    summary.testingInstructions.push(normalized);
  }

  if (/(env|setup|runtime|dependency|install|prereq|local)/.test(lowercase)) {
    summary.environmentHints.push(normalized);
  }

  if (/(convention|style|naming|format|lint|typescript|strict)/.test(lowercase)) {
    summary.conventions.push(normalized);
  }

  if (/(workflow|review|pr|commit|branch|release|deploy|approval|agent)/.test(lowercase)) {
    summary.workflowNotes.push(normalized);
  }
}

function createSummaryText(parsed: ProjectInstructionSectionSummary): string {
  const parts: string[] = [];
  if (parsed.environmentHints.length > 0) parts.push(`${parsed.environmentHints.length} environment/setup hints`);
  if (parsed.commands.length > 0) parts.push(`${parsed.commands.length} command notes`);
  if (parsed.testingInstructions.length > 0) parts.push(`${parsed.testingInstructions.length} testing/check hints`);
  if (parsed.conventions.length > 0) parts.push(`${parsed.conventions.length} conventions`);
  if (parsed.workflowNotes.length > 0) parts.push(`${parsed.workflowNotes.length} workflow notes`);

  return parts.length > 0 ? parts.join(" • ") : "Instructions loaded, but no structured hints were extracted yet.";
}

function uniqueTop(items: string[], max = 8): string[] {
  const deduped: string[] = [];
  for (const item of items) {
    if (!deduped.includes(item)) deduped.push(item);
    if (deduped.length >= max) break;
  }
  return deduped;
}

function parseInstructions(content: string): { parsed: ProjectInstructionSectionSummary; warning?: string } {
  const parsed = cloneInitialSummary();
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    classifyLine(rawLine, parsed);
  }

  parsed.environmentHints = uniqueTop(parsed.environmentHints);
  parsed.commands = uniqueTop(parsed.commands);
  parsed.testingInstructions = uniqueTop(parsed.testingInstructions);
  parsed.conventions = uniqueTop(parsed.conventions);
  parsed.workflowNotes = uniqueTop(parsed.workflowNotes);

  const extractedCount =
    parsed.environmentHints.length +
    parsed.commands.length +
    parsed.testingInstructions.length +
    parsed.conventions.length +
    parsed.workflowNotes.length;

  if (extractedCount === 0) {
    return { parsed, warning: "Structured extraction was limited. Review raw instructions." };
  }

  return { parsed };
}

async function walkForInstructionFiles(rootPath: string, adapter: InstructionFsAdapter): Promise<ProjectInstructionSource[]> {
  const discovered: ProjectInstructionSource[] = [];
  const queue: string[] = [rootPath];

  while (queue.length > 0 && discovered.length < 25) {
    const currentPath = queue.shift();
    if (!currentPath) continue;

    const metadata = await adapter.stat(currentPath);
    if (!metadata.exists || !metadata.isDirectory || !metadata.readable) {
      continue;
    }

    const entries = await adapter.readDir(currentPath);
    const hasAgents = entries.includes("AGENTS.md");
    const hasAgent = entries.includes("AGENT.md");

    if (hasAgents) {
      discovered.push({
        path: await adapter.join(currentPath, "AGENTS.md"),
        fileType: "AGENTS.md",
      });
    }

    if (hasAgent) {
      discovered.push({
        path: await adapter.join(currentPath, "AGENT.md"),
        fileType: "AGENT.md",
      });
    }

    for (const entry of entries) {
      if (SKIP_DIRECTORIES.has(entry)) continue;
      const childPath = await adapter.join(currentPath, entry);
      const childMeta = await adapter.stat(childPath);
      if (childMeta.exists && childMeta.isDirectory && childMeta.readable) {
        queue.push(childPath);
      }
    }
  }

  return discovered;
}

function chooseInstructionSource(candidates: ProjectInstructionSource[], projectRoot: string): ProjectInstructionSource | undefined {
  if (candidates.length === 0) return undefined;

  const inRoot = candidates.filter((entry) => {
    const normalizedPath = entry.path.replace(/\\/g, "/");
    const normalizedRoot = projectRoot.replace(/\\/g, "/").replace(/\/+$/g, "");
    return normalizedPath.startsWith(`${normalizedRoot}/`);
  });

  const prioritized = (inRoot.length > 0 ? inRoot : candidates).sort((a, b) => {
    if (a.fileType !== b.fileType) {
      return a.fileType === "AGENTS.md" ? -1 : 1;
    }
    return a.path.length - b.path.length;
  });

  return prioritized[0];
}

export async function loadProjectInstructions(projectRoot: string): Promise<ProjectInstructionState> {
  const adapter = await getAdapter();

  if (!adapter) {
    return {
      status: "load_error",
      candidates: [],
      parsed: cloneInitialSummary(),
      summary: "Project instruction runtime is unavailable in this environment.",
      error: "Filesystem access is unavailable.",
      lastLoadedAtIso: new Date().toISOString(),
    };
  }

  const candidates = await walkForInstructionFiles(projectRoot, adapter);
  const selectedSource = chooseInstructionSource(candidates, projectRoot);

  if (!selectedSource) {
    return {
      status: "not_found",
      candidates,
      parsed: cloneInitialSummary(),
      summary: "No AGENTS.md or AGENT.md file was found in the connected project.",
      lastLoadedAtIso: new Date().toISOString(),
    };
  }

  let content = "";
  try {
    content = await adapter.readFile(selectedSource.path);
  } catch (error) {
    return {
      status: "load_error",
      source: selectedSource,
      candidates,
      parsed: cloneInitialSummary(),
      summary: "An instruction file was discovered but could not be read.",
      error: error instanceof Error ? error.message : "Unknown file read error",
      lastLoadedAtIso: new Date().toISOString(),
    };
  }

  const parsedResult = parseInstructions(content);
  const hasMultipleCandidates = candidates.length > 1;
  const warning = [
    parsedResult.warning,
    hasMultipleCandidates ? `Multiple instruction files detected (${candidates.length}); loaded ${selectedSource.fileType}.` : undefined,
  ].filter(Boolean).join(" ");

  return {
    status: warning ? "parse_warning" : "loaded",
    source: selectedSource,
    candidates,
    rawContent: content,
    parsed: parsedResult.parsed,
    summary: createSummaryText(parsedResult.parsed),
    warning: warning || undefined,
    lastLoadedAtIso: new Date().toISOString(),
  };
}

export function createEmptyProjectInstructionState(): ProjectInstructionState {
  return {
    status: "not_found",
    candidates: [],
    parsed: cloneInitialSummary(),
    summary: "No AGENTS.md or AGENT.md file was found in the connected project.",
  };
}
