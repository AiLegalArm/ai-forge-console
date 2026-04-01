import { useState, useCallback, useEffect } from "react";
import { promptLibrary as defaultPrompts, promptLibraryTabs, type PromptEntry } from "@/data/mock-prompts";
import { Library, Star, StarOff, Plus, X, Trash2, Copy, Search, Download, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "armvibecode_prompts";
const IMPORTED_KEY = "armvibecode_imported";

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
  const [importing, setImporting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("My Prompts");
  const [newContent, setNewContent] = useState("");

  // Auto-import on first load
  useEffect(() => {
    const alreadyImported = localStorage.getItem(IMPORTED_KEY);
    if (alreadyImported) return;

    setImporting(true);
    fetch("/imported-prompts.json")
      .then(r => r.json())
      .then((data: PromptEntry[]) => {
        const existing = loadPrompts();
        const existingIds = new Set(existing.map(p => p.id));
        const newPrompts = data.filter(p => !existingIds.has(p.id));
        if (newPrompts.length > 0) {
          const merged = [...existing, ...newPrompts];
          savePrompts(merged);
          setPrompts(merged);
        }
        localStorage.setItem(IMPORTED_KEY, "true");
      })
      .catch(() => {})
      .finally(() => setImporting(false));
  }, []);

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
    navigator.clipboard.writeText(p.content || p.title);
  };

  // Get unique categories
  const categories = Array.from(new Set(prompts.map(p => p.category))).sort();

  // Filter
  const filtered = prompts.filter(p => {
    let matchTab = true;
    if (activeTab === "Избранное") matchTab = p.isFavorite;
    else if (activeTab === "My Prompts") matchTab = !p.id.startsWith("imp-");
    else if (activeTab === "Импортированные") matchTab = p.id.startsWith("imp-");
    // "Все" shows everything

    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.content || "").toLowerCase().includes(search.toLowerCase());

    return matchTab && matchCategory && matchSearch;
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

      {importing && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 animate-pulse">
          <Download className="h-3.5 w-3.5" /> Импорт 1000+ промптов...
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-card border border-primary/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-semibold text-foreground">Добавить новый промпт</div>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название промпта..."
            className="w-full h-7 rounded border border-border bg-input px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
            className="w-full h-7 rounded border border-border bg-input px-2 text-xs text-foreground focus:outline-none focus:border-primary">
            <option value="My Prompts">My Prompts</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Содержимое промпта..."
            className="w-full h-28 rounded border border-border bg-input px-2.5 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">Отмена</button>
            <button onClick={handleAdd} disabled={!newTitle.trim() || !newContent.trim()}
              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск промптов..."
          className="w-full h-7 rounded border border-border bg-input pl-7 pr-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {promptLibraryTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{tab}</button>
        ))}
      </div>

      {/* Category filter */}
      <div className="relative">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="w-full h-7 rounded border border-border bg-input px-2 text-xs text-foreground focus:outline-none focus:border-primary appearance-none pr-6">
          <option value="all">Все категории ({categories.length})</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      </div>

      {/* Count */}
      <div className="text-[10px] text-muted-foreground">
        Показано: {filtered.length} из {prompts.length}
      </div>

      {/* Prompt List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            {search ? "Ничего не найдено" : "Нет промптов в этой категории"}
          </div>
        )}
        {filtered.slice(0, 50).map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg hover:border-primary/30 transition">
            <div className="p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className="text-muted-foreground hover:text-warning mt-0.5 shrink-0">
                    {p.isFavorite ? <Star className="h-3.5 w-3.5 text-warning fill-warning" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-xs font-medium text-foreground line-clamp-2">{p.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); copyContent(p); }} className="p-1 text-muted-foreground hover:text-foreground rounded" title="Копировать">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deletePrompt(p.id); }} className="p-1 text-muted-foreground hover:text-destructive rounded" title="Удалить">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-secondary text-secondary-foreground rounded truncate max-w-[150px]">{p.category}</span>
                <span className="text-[10px] text-muted-foreground">{p.lastUsed}</span>
              </div>
            </div>
            {expandedId === p.id && (
              <div className="border-t border-border p-3 animate-in slide-in-from-top-1 duration-150">
                <div className="bg-muted rounded p-3 text-xs font-mono text-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                  {p.content || "Содержимое не задано"}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length > 50 && (
          <div className="text-center py-3 text-[10px] text-muted-foreground">
            Показаны первые 50 из {filtered.length}. Используйте поиск или фильтр категории.
          </div>
        )}
      </div>
    </div>
  );
}
