import { projects } from "@/data/mock-projects";
import { FolderKanban, Clock, Bot, FileCode, Link2 } from "lucide-react";

const modeColors: Record<string, string> = {
  plan: "bg-info/20 text-info",
  build: "bg-primary/20 text-primary",
  audit: "bg-warning/20 text-warning",
  release: "bg-success/20 text-success",
};

export function ProjectsView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" /> Project Hub
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded hover:opacity-90 transition">
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition cursor-pointer group">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
              </div>
              <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded uppercase ${modeColors[p.mode]}`}>
                {p.mode}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="font-mono">{p.progress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.lastActivity}</span>
              <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{p.agents} agents</span>
              <span className="flex items-center gap-1"><FileCode className="h-3 w-3" />{p.files} files</span>
              <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{p.promptChains} chains</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
