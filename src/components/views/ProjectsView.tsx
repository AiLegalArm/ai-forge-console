import { FolderKanban, Clock3, Folder, Link2, CheckCircle2, PlusCircle, ArrowRightLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import { SmartActionChips } from "@/components/assistive/SmartActionChips";
import { getSmartActionSuggestions, type SmartActionId } from "@/lib/ai-native-suggestions";

interface ProjectsViewProps {
  workspaceState: WorkspaceRuntimeState;
  onAddLocalProject: (payload?: { name?: string; localPath?: string; projectRoot?: string }) => Promise<{ ok: boolean; message: string }>;
  onActiveProjectChange: (projectId: string) => void;
  onRunProjectCommand: (commandId: string) => Promise<{ ok: boolean; message: string; code?: string }>;
  onRunProjectCommandCategory: (category: "dev" | "build" | "test" | "lint" | "typecheck") => Promise<{ ok: boolean; message: string; code?: string }>;
}

export function ProjectsView({ workspaceState, onAddLocalProject, onActiveProjectChange, onRunProjectCommand, onRunProjectCommandCategory }: ProjectsViewProps) {
  const { t } = useI18n();
  const [projectFeedback, setProjectFeedback] = useState<string>("");
  const localCount = workspaceState.projects.filter((project) => project.source === "local").length;
  const connectedRepoCount = workspaceState.projects.filter((project) => project.repository?.connected).length;
  const recentProjects = workspaceState.projects.slice(0, 5);
  const primaryCommands = workspaceState.projectCommandRegistry.commands.filter((command) => command.isPrimaryWorkflow).slice(0, 6);
  const smartActions = getSmartActionSuggestions(workspaceState);
  const emptyStateActions = [
    !workspaceState.activeProjectId ? smartActions.find((action) => action.id === "resume_last_task") : undefined,
    !workspaceState.repository.connected ? smartActions.find((action) => action.id === "reconnect_provider") : undefined,
    workspaceState.providerSource === "ollama" && !workspaceState.localInference.ollama.connectionHealthy ? smartActions.find((action) => action.id === "switch_provider_fallback") : undefined,
  ].filter(Boolean);

  const handleSmartAction = (actionId: SmartActionId) => {
    if (actionId === "run_tests") {
      void onRunProjectCommandCategory("test").then((result) => setProjectFeedback(result.message));
      return;
    }
    if (actionId === "run_dev_server") {
      void onRunProjectCommandCategory("dev").then((result) => setProjectFeedback(result.message));
      return;
    }
    if (actionId === "reconnect_provider") {
      setProjectFeedback("Open Provider Hub to reconnect OpenRouter/Ollama.");
      return;
    }
    void onAddLocalProject().then((result) => setProjectFeedback(result.message));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" /> {t("projects.hub")}
        </h1>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              void (async () => {
                const result = await onAddLocalProject();
                setProjectFeedback(result.message);
              })();
            }}
            className="px-3 py-1 text-xs font-mono border border-border rounded hover:border-primary/60"
          >
            add local project
          </button>
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded hover:opacity-90 transition">
            {t("projects.new")}
          </button>
        </div>
      </div>
      {projectFeedback ? (
        <div className="text-[11px] font-mono text-muted-foreground">{projectFeedback}</div>
      ) : null}
      {emptyStateActions.length > 0 ? (
        <SmartActionChips title="Smart empty-state guidance" suggestions={emptyStateActions} onAction={handleSmartAction} maxVisible={3} />
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <SummaryTile label="projects" value={workspaceState.projects.length.toString()} icon={<Folder className="h-3.5 w-3.5 text-primary" />} />
        <SummaryTile label="local" value={localCount.toString()} icon={<PlusCircle className="h-3.5 w-3.5 text-success" />} />
        <SummaryTile label="repo connected" value={connectedRepoCount.toString()} icon={<Link2 className="h-3.5 w-3.5 text-info" />} />
        <SummaryTile label="active" value={workspaceState.currentProject} icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />} />
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> recent/opened projects</div>
        <div className="space-y-1.5">
          {recentProjects.map((project) => {
            const isActive = project.id === workspaceState.activeProjectId;
            return (
              <button
                key={project.id}
                onClick={() => onActiveProjectChange(project.id)}
                className={`w-full text-left rounded border px-2.5 py-2 transition ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{project.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{project.description ?? "No description"}</div>
                  </div>
                  <div className="text-right text-[10px] font-mono space-y-0.5 shrink-0">
                    {isActive && <div className="text-primary">active</div>}
                    <div className={project.source === "local" ? "text-success" : "text-muted-foreground"}>{project.source}</div>
                    <div className={project.repository?.connected ? "text-info" : "text-warning"}>{project.repository?.connected ? `repo ${project.repository.branch ?? "unknown"}` : "repo missing"}</div>
                    <div className={project.instructions?.status === "loaded" ? "text-success" : "text-muted-foreground"}>
                      instr {project.instructions?.status ?? "not_found"}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono truncate">{project.localPath ?? project.projectRoot ?? "manual"}</span>
                  <span className="font-mono">{project.branch}</span>
                </div>
                {project.instructions?.summary ? (
                  <div className="mt-1 text-[10px] text-muted-foreground truncate">{project.instructions.summary}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><ArrowRightLeft className="h-3 w-3" /> quick switch</div>
        <div className="grid md:grid-cols-2 gap-2">
          {workspaceState.projects.map((project) => (
            <button key={`quick-${project.id}`} onClick={() => onActiveProjectChange(project.id)} className="px-2.5 py-2 text-xs rounded border border-border hover:border-primary/50 text-left">
              <div className="font-semibold text-foreground truncate">{project.name}</div>
              <div className="text-[10px] text-muted-foreground">{project.repository?.connected ? "Repo connected" : "Repo disconnected"} • {project.provider?.connected ? "Provider connected" : "Provider disconnected"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">project command registry</div>
        <div className="flex flex-wrap gap-1">
          {(["dev", "build", "test", "lint", "typecheck"] as const).map((category) => (
            <button
              key={`quick-${category}`}
              onClick={() => void onRunProjectCommandCategory(category).then((result) => setProjectFeedback(result.message))}
              className="px-2 py-1 rounded border border-border text-[10px] font-mono hover:border-primary/50"
            >
              Run {category}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {workspaceState.projectCommandRegistry.commands.length} commands • {workspaceState.terminalCommandRegistryReady ? "terminal ready" : "terminal not ready"} • {workspaceState.agentCommandRegistryReady ? "agent ready" : "agent not ready"}
        </div>
        {primaryCommands.length === 0 ? (
          <div className="text-[10px] text-warning font-mono">No primary workflow commands identified yet.</div>
        ) : (
          <div className="space-y-1.5">
            {primaryCommands.map((command) => (
              <div key={command.id} className="rounded border border-border px-2 py-1.5 text-[10px] space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{command.displayName}</span>
                  <span className="font-mono text-muted-foreground">{command.source}</span>
                </div>
                <div className="font-mono text-primary truncate">{command.rawCommand}</div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{command.category}</span>
                  <span>{command.runSafety} • {command.availability}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {command.lastExecution ? `${command.lastExecution.status} @ ${new Date(command.lastExecution.launchTimestampIso).toLocaleTimeString()}` : "not run"}
                  </span>
                  <button
                    onClick={() => void onRunProjectCommand(command.id).then((result) => setProjectFeedback(result.message))}
                    className="px-1.5 py-0.5 border border-border rounded hover:border-primary/60 text-foreground"
                  >
                    Run
                  </button>
                </div>
                {command.description ? <div className="text-muted-foreground">{command.description}</div> : null}
              </div>
            ))}
          </div>
        )}
        {workspaceState.projectCommandRegistry.diagnostics.warnings.length > 0 ? (
          <div className="text-[10px] text-warning space-y-0.5">
            {workspaceState.projectCommandRegistry.diagnostics.warnings.slice(0, 3).map((warning) => (
              <div key={warning}>• {warning}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <div className="flex items-center justify-between gap-2 text-muted-foreground text-[10px] uppercase tracking-wide">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-xs font-semibold text-foreground mt-1 truncate">{value}</div>
    </div>
  );
}
