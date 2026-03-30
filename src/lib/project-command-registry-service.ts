import type {
  ProjectCommandAvailability,
  ProjectCommandCategory,
  ProjectCommandConfidence,
  ProjectCommandEntry,
  ProjectCommandRegistry,
  ProjectCommandSource,
} from "@/types/project-commands";

interface LocalFsAdapter {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  join(...parts: string[]): Promise<string>;
}

interface BuildRegistryInput {
  projectRoot: string;
}

function getGlobalAdapter(): LocalFsAdapter | null {
  const runtime = globalThis as {
    __AIFORGE_LOCAL_FS__?: Partial<LocalFsAdapter>;
  };

  const candidate = runtime.__AIFORGE_LOCAL_FS__;
  if (!candidate?.exists || !candidate?.join || !candidate?.readFile) {
    return null;
  }

  return candidate as LocalFsAdapter;
}

async function loadNodeAdapter(): Promise<LocalFsAdapter | null> {
  const hasNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  if (!hasNode) return null;

  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const fs = await dynamicImport("node:fs/promises") as {
    access(path: string): Promise<void>;
    readFile(path: string, encoding: "utf8"): Promise<string>;
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
    async readFile(targetPath: string) {
      return fs.readFile(targetPath, "utf8");
    },
    async join(...parts: string[]) {
      return path.join(...parts);
    },
  };
}

async function getAdapter(): Promise<LocalFsAdapter | null> {
  return getGlobalAdapter() ?? loadNodeAdapter();
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function inferCategory(name: string, command: string): ProjectCommandCategory {
  const key = `${name} ${command}`.toLowerCase();
  if (/(^|\s)(dev|start|serve|preview|watch)(\s|$)/.test(key)) return "dev";
  if (/(^|\s)(build|bundle)(\s|$)/.test(key)) return "build";
  if (/(^|\s)(test|spec|vitest|jest|cypress|playwright)(\s|$)/.test(key)) return "test";
  if (/(^|\s)(lint|eslint|stylelint)(\s|$)/.test(key)) return "lint";
  if (/(^|\s)(typecheck|tsc|pyright|mypy)(\s|$)/.test(key)) return "typecheck";
  if (/(^|\s)(format|prettier|fmt)(\s|$)/.test(key)) return "format";
  if (/(db|database|migrate|migration|seed|prisma|drizzle)/.test(key)) return "database";
  if (/(release|deploy|publish|ship|version|tag)/.test(key)) return "release";
  return "custom";
}

function inferSafety(command: string): ProjectCommandEntry["runSafety"] {
  const normalized = command.toLowerCase();
  if (/(rm\s+-rf|drop\s+database|truncate\s+table|git\s+push\s+--force|:\(\)\s*\{\s*:\|:&\s*\};:)/.test(normalized)) {
    return "risky";
  }
  if (/(git\s+push|git\s+reset|git\s+clean|docker\s+compose\s+down|npm\s+publish|pnpm\s+publish|deploy|release|migration)/.test(normalized)) {
    return "caution";
  }
  return "safe";
}

function inferConfidence(source: ProjectCommandSource): ProjectCommandConfidence {
  if (source === "package.json") return "high";
  if (source === "AGENTS.md" || source === "AGENT.md" || source === "Makefile") return "medium";
  return "low";
}

function inferAvailability(source: ProjectCommandSource): ProjectCommandAvailability {
  if (source === "package.json" || source === "Makefile") return "discovered";
  if (source === "AGENTS.md" || source === "AGENT.md") return "likely_valid";
  return "unknown";
}

function collectFromAgents(text: string, source: ProjectCommandSource, projectRoot: string): ProjectCommandEntry[] {
  const lines = text.split(/\r?\n/);
  const extracted: ProjectCommandEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bulletMatch = trimmed.match(/^[-*]\s+`([^`]+)`(?:\s*[-–:]\s*(.+))?$/);
    const inlineMatch = trimmed.match(/`((?:npm|pnpm|yarn|bun|make|cargo|go|python|pipx|uv|poetry)\s+[^`]+)`/);
    const headingCommandMatch = trimmed.match(/^(?:#+\s*)?(?:command|commands|workflow)[:\-]\s*(.+)$/i);

    const candidateCommand = bulletMatch?.[1] ?? inlineMatch?.[1] ?? headingCommandMatch?.[1];
    if (!candidateCommand) continue;

    const description = bulletMatch?.[2]?.trim();
    const displayName = candidateCommand.split(" ").slice(0, 2).join(" ");

    extracted.push({
      id: `cmd-${slugify(`${source}-${candidateCommand}`)}`,
      displayName,
      rawCommand: candidateCommand.trim(),
      source,
      sources: [source],
      category: inferCategory(displayName, candidateCommand),
      confidence: inferConfidence(source),
      workingDirectory: projectRoot,
      description,
      runSafety: inferSafety(candidateCommand),
      availability: inferAvailability(source),
    });
  }

  return extracted;
}

function collectFromPackageJson(text: string, projectRoot: string): ProjectCommandEntry[] {
  try {
    const parsed = JSON.parse(text) as { scripts?: Record<string, string> };
    const scripts = parsed.scripts ?? {};
    return Object.entries(scripts)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([name, value]) => ({
        id: `cmd-${slugify(`package-${name}`)}`,
        displayName: name,
        rawCommand: value.trim(),
        source: "package.json" as const,
        sources: ["package.json" as const],
        category: inferCategory(name, value),
        confidence: "high" as const,
        workingDirectory: projectRoot,
        description: `npm script: ${name}`,
        runSafety: inferSafety(value),
        availability: "discovered" as const,
      }));
  } catch {
    return [];
  }
}

function collectFromMakefile(text: string, projectRoot: string): ProjectCommandEntry[] {
  const targets = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[a-zA-Z0-9_.-]+:\s*(?:#.*)?$/.test(line) && !line.startsWith("."))
    .map((line) => line.split(":")[0])
    .filter((name) => name !== "default");

  return targets.map((target) => ({
    id: `cmd-${slugify(`make-${target}`)}`,
    displayName: target,
    rawCommand: `make ${target}`,
    source: "Makefile",
    sources: ["Makefile"],
    category: inferCategory(target, `make ${target}`),
    confidence: "medium",
    workingDirectory: projectRoot,
    description: `Make target: ${target}`,
    runSafety: inferSafety(`make ${target}`),
    availability: "discovered",
  }));
}

function inferFallbackCommands(existing: ProjectCommandEntry[], projectRoot: string): ProjectCommandEntry[] {
  const hasDev = existing.some((entry) => entry.category === "dev");
  const hasBuild = existing.some((entry) => entry.category === "build");
  const hasTest = existing.some((entry) => entry.category === "test");

  const inferred: ProjectCommandEntry[] = [];
  if (!hasDev) {
    inferred.push({
      id: "cmd-inferred-dev",
      displayName: "dev",
      rawCommand: "npm run dev",
      source: "inferred_project_metadata",
      sources: ["inferred_project_metadata"],
      category: "dev",
      confidence: "low",
      workingDirectory: projectRoot,
      description: "Common development entrypoint for JS projects.",
      runSafety: "safe",
      availability: "unknown",
    });
  }
  if (!hasBuild) {
    inferred.push({
      id: "cmd-inferred-build",
      displayName: "build",
      rawCommand: "npm run build",
      source: "inferred_project_metadata",
      sources: ["inferred_project_metadata"],
      category: "build",
      confidence: "low",
      workingDirectory: projectRoot,
      description: "Common production build command.",
      runSafety: "safe",
      availability: "unknown",
    });
  }
  if (!hasTest) {
    inferred.push({
      id: "cmd-inferred-test",
      displayName: "test",
      rawCommand: "npm test",
      source: "inferred_project_metadata",
      sources: ["inferred_project_metadata"],
      category: "test",
      confidence: "low",
      workingDirectory: projectRoot,
      description: "Common test command.",
      runSafety: "safe",
      availability: "unknown",
    });
  }

  return inferred;
}

function mergeDuplicateCommands(commands: ProjectCommandEntry[]): ProjectCommandEntry[] {
  const rank: Record<ProjectCommandSource, number> = {
    "package.json": 5,
    "AGENTS.md": 4,
    "AGENT.md": 4,
    Makefile: 3,
    inferred_project_metadata: 1,
  };

  const merged = new Map<string, ProjectCommandEntry>();

  for (const command of commands) {
    const key = `${command.rawCommand.toLowerCase()}::${command.workingDirectory.toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, command);
      continue;
    }

    const winner = rank[command.source] > rank[existing.source] ? command : existing;
    const loser = winner === command ? existing : command;

    merged.set(key, {
      ...winner,
      sources: Array.from(new Set([...winner.sources, ...loser.sources])),
      description: winner.description || loser.description,
      confidence:
        winner.confidence === "high" || loser.confidence === "high"
          ? "high"
          : winner.confidence === "medium" || loser.confidence === "medium"
            ? "medium"
            : "low",
    });
  }

  return Array.from(merged.values());
}

function pickPrimaryCommands(commands: ProjectCommandEntry[]): string[] {
  const priorityOrder: ProjectCommandCategory[] = ["dev", "build", "test", "lint", "typecheck", "format", "release", "database", "custom"];
  const picked = new Set<string>();

  for (const category of priorityOrder) {
    const candidate = commands
      .filter((entry) => entry.category === category)
      .sort((a, b) => {
        const score = (entry: ProjectCommandEntry) =>
          (entry.confidence === "high" ? 3 : entry.confidence === "medium" ? 2 : 1) + (entry.availability === "discovered" ? 2 : 0);
        return score(b) - score(a);
      })[0];

    if (candidate) picked.add(candidate.id);
    if (picked.size >= 5) break;
  }

  return Array.from(picked);
}

export async function buildProjectCommandRegistry(input: BuildRegistryInput): Promise<ProjectCommandRegistry> {
  const adapter = await getAdapter();
  if (!adapter) {
    return {
      projectRoot: input.projectRoot,
      generatedAtIso: new Date().toISOString(),
      commands: [],
      primaryCommandIds: [],
      diagnostics: {
        agentsFileFound: false,
        agentsCommandsExtracted: 0,
        packageJsonFound: false,
        packageScriptsExtracted: 0,
        makefileFound: false,
        makeTargetsExtracted: 0,
        warnings: ["Local filesystem adapter unavailable; command discovery skipped."],
      },
    };
  }

  const [agentsPath, agentPath, packageJsonPath, makefilePath] = await Promise.all([
    adapter.join(input.projectRoot, "AGENTS.md"),
    adapter.join(input.projectRoot, "AGENT.md"),
    adapter.join(input.projectRoot, "package.json"),
    adapter.join(input.projectRoot, "Makefile"),
  ]);

  const [hasAgents, hasAgent, hasPackageJson, hasMakefile] = await Promise.all([
    adapter.exists(agentsPath),
    adapter.exists(agentPath),
    adapter.exists(packageJsonPath),
    adapter.exists(makefilePath),
  ]);

  const warnings: string[] = [];
  const collected: ProjectCommandEntry[] = [];
  let agentsCommandsExtracted = 0;
  let packageScriptsExtracted = 0;
  let makeTargetsExtracted = 0;

  if (hasAgents) {
    const agentsText = await adapter.readFile(agentsPath);
    const agentsCommands = collectFromAgents(agentsText, "AGENTS.md", input.projectRoot);
    agentsCommandsExtracted += agentsCommands.length;
    collected.push(...agentsCommands);
    if (agentsCommands.length === 0) warnings.push("AGENTS.md found, but no commands were extracted.");
  }

  if (hasAgent) {
    const agentText = await adapter.readFile(agentPath);
    const agentCommands = collectFromAgents(agentText, "AGENT.md", input.projectRoot);
    agentsCommandsExtracted += agentCommands.length;
    collected.push(...agentCommands);
    if (agentCommands.length === 0) warnings.push("AGENT.md found, but no commands were extracted.");
  }

  if (hasPackageJson) {
    const packageText = await adapter.readFile(packageJsonPath);
    const packageCommands = collectFromPackageJson(packageText, input.projectRoot);
    packageScriptsExtracted = packageCommands.length;
    collected.push(...packageCommands);
    if (packageCommands.length === 0) warnings.push("package.json found, but scripts are missing or invalid.");
  } else {
    warnings.push("package.json not found.");
  }

  if (hasMakefile) {
    const makeText = await adapter.readFile(makefilePath);
    const makeCommands = collectFromMakefile(makeText, input.projectRoot);
    makeTargetsExtracted = makeCommands.length;
    collected.push(...makeCommands);
  }

  const merged = mergeDuplicateCommands(collected);
  const withFallbacks = [...merged, ...inferFallbackCommands(merged, input.projectRoot)];
  const primaryCommandIds = pickPrimaryCommands(withFallbacks);
  const marked = withFallbacks.map((command) => ({
    ...command,
    isPrimaryWorkflow: primaryCommandIds.includes(command.id),
  }));

  return {
    projectRoot: input.projectRoot,
    generatedAtIso: new Date().toISOString(),
    commands: marked,
    primaryCommandIds,
    diagnostics: {
      agentsFileFound: hasAgents || hasAgent,
      agentsCommandsExtracted,
      packageJsonFound: hasPackageJson,
      packageScriptsExtracted,
      makefileFound: hasMakefile,
      makeTargetsExtracted,
      warnings,
    },
  };
}
