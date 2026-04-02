import { useState } from "react";
import { Github, ExternalLink, CheckCircle, AlertCircle, Loader2, GitBranch, Lock } from "lucide-react";

type ConnectionStep = "idle" | "authorizing" | "selecting_repo" | "connected" | "error";

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
}

const MOCK_REPOS: GitHubRepo[] = [
  { id: "r1", name: "ai-forge-console", fullName: "user/ai-forge-console", isPrivate: false, defaultBranch: "main", updatedAt: "2026-03-28" },
  { id: "r2", name: "my-saas-app", fullName: "user/my-saas-app", isPrivate: true, defaultBranch: "main", updatedAt: "2026-03-25" },
  { id: "r3", name: "portfolio-site", fullName: "user/portfolio-site", isPrivate: false, defaultBranch: "master", updatedAt: "2026-03-20" },
  { id: "r4", name: "api-gateway", fullName: "user/api-gateway", isPrivate: true, defaultBranch: "develop", updatedAt: "2026-03-15" },
];

interface GitHubConnectViewProps {
  onConnect?: (repo: { name: string; url: string; branch: string }) => void;
}

export function GitHubConnectView({ onConnect }: GitHubConnectViewProps) {
  const [step, setStep] = useState<ConnectionStep>("idle");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuthorize = () => {
    setStep("authorizing");
    // Simulate OAuth flow
    setTimeout(() => {
      setRepos(MOCK_REPOS);
      setStep("selecting_repo");
    }, 1500);
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
  };

  const handleConnect = () => {
    if (!selectedRepo) return;
    setStep("connected");
    onConnect?.({
      name: selectedRepo.fullName,
      url: `https://github.com/${selectedRepo.fullName}`,
      branch: selectedRepo.defaultBranch,
    });
  };

  const handleDisconnect = () => {
    setStep("idle");
    setSelectedRepo(null);
    setRepos([]);
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Github className="h-4 w-4 text-foreground" />
        <h2 className="text-sm font-semibold text-foreground">GitHub</h2>
      </div>

      {step === "idle" && (
        <div className="bg-card border border-border rounded-lg p-4 text-center space-y-3">
          <Github className="h-8 w-8 text-muted-foreground mx-auto" />
          <div>
            <p className="text-xs font-medium text-foreground">Подключить GitHub</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Авторизуйтесь через GitHub OAuth для доступа к репозиториям
            </p>
          </div>
          <button
            onClick={handleAuthorize}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            <Github className="h-3.5 w-3.5" />
            Авторизоваться через GitHub
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}

      {step === "authorizing" && (
        <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
          <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Авторизация через GitHub...</p>
        </div>
      )}

      {step === "selecting_repo" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-success font-mono">Авторизация успешна</span>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск репозиториев..."
              className="w-full bg-muted/50 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border-subtle focus:border-primary/50"
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {filteredRepos.map(repo => (
              <button
                key={repo.id}
                onClick={() => handleSelectRepo(repo)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors border-b border-border-subtle/50 last:border-0 ${
                  selectedRepo?.id === repo.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-foreground flex items-center gap-1">
                      {repo.fullName}
                      {repo.isPrivate && <Lock className="h-2.5 w-2.5 text-warning" />}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {repo.defaultBranch} · {repo.updatedAt}
                    </div>
                  </div>
                </div>
                {selectedRepo?.id === repo.id && (
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
          {selectedRepo && (
            <div className="p-3 border-t border-border-subtle bg-card/50">
              <button
                onClick={handleConnect}
                className="w-full px-3 py-2 text-xs font-mono bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Подключить {selectedRepo.name}
              </button>
            </div>
          )}
        </div>
      )}

      {step === "connected" && selectedRepo && (
        <div className="bg-card border border-success/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-mono text-success">Подключено</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-[9px] font-mono text-muted-foreground hover:text-destructive transition-colors"
            >
              Отключить
            </button>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Репозиторий</span>
              <span className="font-mono text-foreground">{selectedRepo.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ветка</span>
              <span className="font-mono text-primary">{selectedRepo.defaultBranch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Доступ</span>
              <span className="font-mono text-foreground">{selectedRepo.isPrivate ? "private" : "public"}</span>
            </div>
          </div>
        </div>
      )}

      {step === "error" && (
        <div className="bg-card border border-destructive/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs text-destructive">{errorMsg || "Ошибка подключения"}</span>
          </div>
          <button
            onClick={() => setStep("idle")}
            className="text-[10px] font-mono text-primary hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
}
