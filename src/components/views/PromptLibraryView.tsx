import { useState, useCallback } from "react";
import { promptLibrary as defaultPrompts, promptLibraryTabs, type PromptEntry } from "@/data/mock-prompts";
import { Library, Star, StarOff, Plus, X, Trash2, Copy, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "armvibecode_prompts";

function loadPrompts(): PromptEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultPrompts;
}

function savePrompts(prompts: PromptEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

export function PromptLibraryView() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(promptLibraryTabs[0]);
  const [prompts, setPrompts] = useState<PromptEntry[]>(loadPrompts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New prompt form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("My Prompts");
  const [newContent, setNewContent] = useState("");

  const updatePrompts = useCallback((updated: PromptEntry[]) => {
    setPrompts(updated);
    savePrompts(updated);
  }, []);

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const entry: PromptEntry = {
      id: `pl-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      version: 1,
      rating: 0,
      usageCount: 0,
      lastUsed: "just now",
      isFavorite: false,
      content: newContent.trim(),
    };
    updatePrompts([entry, ...prompts]);
    setNewTitle("");
    setNewCategory("My Prompts");
    setNewContent("");
    setShowAddForm(false);
  };

  const toggleFavorite = (id: string) => {
    updatePrompts(prompts.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const deletePrompt = (id: string) => {
    updatePrompts(prompts.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const copyContent = (p: PromptEntry) => {
    const text = p.content || p.title;
    navigator.clipboard.writeText(text);
  };

  // Filter by tab & search
  const filtered = prompts.filter(p => {
    const matchTab = activeTab === "My Prompts" || activeTab === "Favorites"
      ? (activeTab === "Favorites" ? p.isFavorite : true)
      : p.category === activeTab || activeTab === "Generated" && p.category === "Generated Prompts";
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" /> {t("pl.title")}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">{prompts.length} промптов</span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded flex items-center gap-1 hover:bg-primary/90 transition"
          >
            {showAddForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showAddForm ? "Отмена" : t("pl.new")}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-semibold text-foreground">Добавить новый промпт</div>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Название промпта..."
            className="w-full h-7 rounded border border-border bg-input px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="w-full h-7 rounded border border-border bg-input px-2 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="My Prompts">My Prompts</option>
            <option value="Project Prompts">Project Prompts</option>
            <option value="Agent Instructions">Agent Instructions</option>
            <option value="Tool Plans">Tool Plans</option>
            <option value="Prompt Chains">Prompt Chains</option>
            <option value="Generated Prompts">Generated Prompts</option>
          </select>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Содержимое промпта..."
            className="w-full h-28 rounded border border-border bg-input px-2.5 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">Отмена</button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск промптов..."
          className="w-full h-7 rounded border border-border bg-input pl-7 pr-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {promptLibraryTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab}</button>
        ))}
      </div>

      {/* Prompt List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            {search ? "Ничего не найдено" : "Нет промптов в этой категории"}
            <br />
            <button onClick={() => setShowAddForm(true)} className="mt-2 text-primary hover:underline">
              + Добавить первый промпт
            </button>
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg hover:border-primary/30 transition">
            <div className="p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className="text-muted-foreground hover:text-warning"
                  >
                    {p.isFavorite ? <Star className="h-3.5 w-3.5 text-warning fill-warning" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-sm font-medium text-foreground">{p.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={e => { e.stopPropagation(); copyContent(p); }} className="p-1 text-muted-foreground hover:text-foreground rounded" title="Копировать">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deletePrompt(p.id); }} className="p-1 text-muted-foreground hover:text-destructive rounded" title="Удалить">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground rounded">{p.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span>v{p.version}</span>
                {p.rating > 0 && <span>★ {p.rating}</span>}
                <span>{p.usageCount} uses</span>
                <span>{p.lastUsed}</span>
              </div>
            </div>
            {/* Expanded content */}
            {expandedId === p.id && (
              <div className="border-t border-border p-3 animate-in slide-in-from-top-1 duration-150">
                <div className="bg-muted rounded p-3 text-xs font-mono text-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                  {p.content || "Содержимое не задано"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
