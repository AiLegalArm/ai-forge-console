import { useState } from "react";
import { promptLibrary, promptLibraryTabs } from "@/data/mock-prompts";
import { Library, Star, StarOff } from "lucide-react";

export function PromptLibraryView() {
  const [activeTab, setActiveTab] = useState(promptLibraryTabs[0]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" /> Prompt Library
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">+ New Prompt</button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {promptLibraryTabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{t}</button>
        ))}
      </div>

      <div className="space-y-2">
        {promptLibrary.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="text-muted-foreground hover:text-warning">
                  {p.isFavorite ? <Star className="h-3.5 w-3.5 text-warning fill-warning" /> : <StarOff className="h-3.5 w-3.5" />}
                </button>
                <span className="text-sm font-medium text-foreground">{p.title}</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground rounded">{p.category}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span>v{p.version}</span>
              <span>★ {p.rating}</span>
              <span>{p.usageCount} uses</span>
              <span>{p.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
