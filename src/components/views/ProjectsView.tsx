import { FolderKanban, Clock3, Folder, Link2, CheckCircle2, PlusCircle, ArrowRightLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";

interface ProjectsViewProps {
  workspaceState: WorkspaceRuntimeState;
  onAddLocalProject: (payload: { name: string; localPath: string; projectRoot?: string }) => void;
  onActiveProjectChange: (projectId: string) => void;
}

export function ProjectsView({ workspaceState, onAddLocalProject, onActiveProjectChange }: ProjectsViewProps) {
  const { t } = useI18n();
  const localCount = workspaceState.projects.filter((project) => project.source === "local").length;
  const connectedRepoCount = workspaceState.projects.filter((project) => project.repository?.connected).length;
  const recentProjects = workspaceState.projects.slice(0, 5);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" /> {t("projects.hub")}
        </h1>
        <div className="flex gap-1.5">
          <button
            onClick={() => onAddLocalProject({ name: "Imported Local Project", localPath: `${workspaceState.localShell.project.activeProjectRoot}/../imported-project` })}
            className="px-3 py-1 text-xs font-mono border border-border rounded hover:border-primary/60"
          >
            add local project
          </button>
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded hover:opacity-90 transition">
            {t("projects.new")}
          </button>
        </div>
      </div>

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
                    <div className={project.repository?.connected ? "text-info" : "text-warning"}>{project.repository?.connected ? "repo linked" : "repo missing"}</div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono truncate">{project.localPath ?? project.projectRoot ?? "manual"}</span>
                  <span className="font-mono">{project.branch}</span>
                </div>
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
