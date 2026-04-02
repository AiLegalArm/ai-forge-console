import { useState, useRef, useCallback } from "react";
import {
  Upload, FolderOpen, File, ChevronRight, ChevronDown,
  Edit3, Save, X, Search, Package, FileCode, Send,
} from "lucide-react";
import type { RepoTree, TreeNode } from "@/lib/zip-repository-service";
import { extractZipRepository, buildFileTree, getFileLanguage } from "@/lib/zip-repository-service";

interface ZipRepositoryViewProps {
  onSendToAgent?: (filePath: string, content: string) => void;
}

export function ZipRepositoryView({ onSendToAgent }: ZipRepositoryViewProps) {
  const [repo, setRepo] = useState<RepoTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Поддерживаются только .zip файлы");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await extractZipRepository(file);
      setRepo(result);
      // Auto-expand first level
      const firstLevelDirs = result.files.filter(f => f.isDirectory && !f.path.includes("/"));
      setExpandedDirs(new Set(firstLevelDirs.map(d => d.path)));
      setSelectedFile(null);
      setEditingContent(null);
      setIsEditing(false);
    } catch (err) {
      setError(`Ошибка распаковки: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  }, [handleUpload]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const selectedFileData = repo?.files.find(f => f.path === selectedFile && !f.isDirectory);
  const treeNodes = repo ? buildFileTree(repo.files) : [];
  const filteredFiles = searchQuery
    ? repo?.files.filter(f => !f.isDirectory && f.path.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const handleSave = () => {
    if (!repo || !selectedFile || editingContent === null) return;
    const updatedFiles = repo.files.map(f =>
      f.path === selectedFile ? { ...f, content: editingContent, size: editingContent.length } : f
    );
    setRepo({ ...repo, files: updatedFiles });
    setIsEditing(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full">
      {!repo ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-md border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary mx-auto mb-3 transition-colors" />
            <p className="text-sm font-medium text-foreground mb-1">
              Загрузите ZIP-репозиторий
            </p>
            <p className="text-xs text-muted-foreground">
              Перетащите .zip файл сюда или нажмите для выбора
            </p>
            {loading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary">
                <Package className="h-3.5 w-3.5 animate-spin" />
                Распаковка...
              </div>
            )}
            {error && (
              <p className="mt-3 text-xs text-destructive">{error}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-card/50">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-mono font-medium text-foreground truncate">{repo.rootName}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {repo.fileCount} файлов · {formatSize(repo.totalSize)}
              </span>
            </div>
            <button
              onClick={() => { setRepo(null); setSelectedFile(null); setEditingContent(null); }}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-1.5 border-b border-border-subtle">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск файлов..."
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* File tree */}
            <div className="w-48 border-r border-border-subtle overflow-auto shrink-0 bg-card/30">
              {filteredFiles ? (
                <div className="p-1 space-y-0.5">
                  {filteredFiles.map(f => (
                    <button
                      key={f.path}
                      onClick={() => { setSelectedFile(f.path); setIsEditing(false); setEditingContent(null); }}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-left truncate ${
                        selectedFile === f.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <FileCode className="h-3 w-3 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-1">
                  {treeNodes.map(node => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      expandedDirs={expandedDirs}
                      selectedFile={selectedFile}
                      onToggleDir={toggleDir}
                      onSelectFile={(path) => { setSelectedFile(path); setIsEditing(false); setEditingContent(null); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* File content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {selectedFileData ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-card/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileCode className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[10px] font-mono text-foreground truncate">{selectedFileData.path}</span>
                      <span className="text-[9px] text-muted-foreground">{getFileLanguage(selectedFileData.path)} · {formatSize(selectedFileData.size)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onSendToAgent && (
                        <button
                          onClick={() => onSendToAgent(selectedFileData.path, isEditing && editingContent !== null ? editingContent : selectedFileData.content)}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Отправить агенту"
                        >
                          <Send className="h-3 w-3" />
                          Агенту
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <button onClick={handleSave} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-success hover:bg-success/10 rounded">
                            <Save className="h-3 w-3" /> Сохранить
                          </button>
                          <button onClick={() => { setIsEditing(false); setEditingContent(null); }} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:bg-muted/50 rounded">
                            <X className="h-3 w-3" /> Отмена
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setIsEditing(true); setEditingContent(selectedFileData.content); }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit3 className="h-3 w-3" /> Редактировать
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {isEditing ? (
                      <textarea
                        value={editingContent ?? ""}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full h-full bg-background text-foreground font-mono text-[11px] leading-relaxed p-3 resize-none outline-none"
                        spellCheck={false}
                      />
                    ) : (
                      <pre className="p-3 text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all">
                        {selectedFileData.content}
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                  Выберите файл для просмотра
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileTreeNode({
  node, depth, expandedDirs, selectedFile, onToggleDir, onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          className="w-full flex items-center gap-1 px-1 py-0.5 text-[10px] text-foreground hover:bg-muted/50 rounded"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {isExpanded ? <ChevronDown className="h-2.5 w-2.5 shrink-0" /> : <ChevronRight className="h-2.5 w-2.5 shrink-0" />}
          <FolderOpen className="h-3 w-3 text-primary/70 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            selectedFile={selectedFile}
            onToggleDir={onToggleDir}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full flex items-center gap-1 px-1 py-0.5 text-[10px] rounded truncate ${
        selectedFile === node.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
      }`}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
    >
      <File className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
