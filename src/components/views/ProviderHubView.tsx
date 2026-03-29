import { providers, providerCategories } from "@/data/mock-providers";
import { Plug, Wifi, WifiOff, AlertTriangle } from "lucide-react";

const statusIcon: Record<string, React.ReactNode> = {
  connected: <Wifi className="h-3 w-3 text-success" />,
  disconnected: <WifiOff className="h-3 w-3 text-muted-foreground" />,
  degraded: <AlertTriangle className="h-3 w-3 text-warning" />,
};

export function ProviderHubView() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" /> Provider Hub
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">+ Add Provider</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {providerCategories.map((c) => (
          <span key={c.label} className="px-2 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground rounded">
            {c.label} ({c.count})
          </span>
        ))}
      </div>

      <div className="space-y-2">
        {providers.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {statusIcon[p.status]}
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                  p.type === "built-in" ? "bg-primary/20 text-primary" :
                  p.type === "self-hosted" ? "bg-accent/20 text-accent" :
                  "bg-secondary text-secondary-foreground"
                }`}>{p.type}</span>
                {p.privacyMode && <span className="px-1.5 py-0.5 text-[10px] font-mono bg-success/20 text-success rounded">Privacy</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {p.fallbackEnabled && <span className="text-info">Fallback ✓</span>}
                <span className="font-mono">{p.costTier}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {p.models.map((m) => (
                <span key={m} className="px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded">{m}</span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {p.capabilities.map((c) => (
                <span key={c} className="px-1.5 py-0.5 text-[10px] bg-surface text-foreground rounded">{c}</span>
              ))}
            </div>

            {p.status === "connected" && (
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>Today: <span className="font-mono text-foreground">{p.requestsToday.toLocaleString()}</span> reqs</span>
                <span>Latency: <span className="font-mono text-foreground">{p.avgLatency}ms</span></span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Routing Rules</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>Code generation</span><span className="font-mono text-foreground">Anthropic → OpenAI (fallback)</span></div>
          <div className="flex justify-between"><span>Planning & reasoning</span><span className="font-mono text-foreground">Anthropic → DeepSeek (fallback)</span></div>
          <div className="flex justify-between"><span>Quick tasks</span><span className="font-mono text-foreground">OpenAI (gpt-4o-mini)</span></div>
          <div className="flex justify-between"><span>Privacy-sensitive</span><span className="font-mono text-foreground">Ollama via VPS</span></div>
        </div>
      </div>
    </div>
  );
}
