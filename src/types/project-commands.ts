export type ProjectCommandCategory =
  | "dev"
  | "build"
  | "test"
  | "lint"
  | "typecheck"
  | "format"
  | "database"
  | "release"
  | "custom";

export type ProjectCommandSource = "AGENTS.md" | "AGENT.md" | "package.json" | "inferred_project_metadata" | "Makefile";

export type ProjectCommandConfidence = "high" | "medium" | "low";
export type ProjectCommandSafety = "safe" | "caution" | "risky";

export type ProjectCommandAvailability = "discovered" | "likely_valid" | "unknown" | "invalid" | "unavailable";

export interface ProjectCommandEntry {
  id: string;
  displayName: string;
  rawCommand: string;
  source: ProjectCommandSource;
  sources: ProjectCommandSource[];
  category: ProjectCommandCategory;
  confidence: ProjectCommandConfidence;
  workingDirectory: string;
  description?: string;
  runSafety: ProjectCommandSafety;
  availability: ProjectCommandAvailability;
  isPrimaryWorkflow?: boolean;
}

export interface ProjectCommandRegistryDiagnostics {
  agentsFileFound: boolean;
  agentsCommandsExtracted: number;
  packageJsonFound: boolean;
  packageScriptsExtracted: number;
  makefileFound: boolean;
  makeTargetsExtracted: number;
  warnings: string[];
}

export interface ProjectCommandRegistry {
  projectRoot: string;
  generatedAtIso: string;
  commands: ProjectCommandEntry[];
  primaryCommandIds: string[];
  diagnostics: ProjectCommandRegistryDiagnostics;
}
