import { providers, providerCategories } from "@/data/mock-providers";
import { localInferenceRuntime } from "@/data/mock-local-inference";
import { Plug, Wifi, WifiOff, AlertTriangle, CheckCircle2, ServerCrash, Cpu, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const statusIcon: Record<string, React.ReactNode> = {
  connected: <Wifi className="h-3 w-3 text-success" />,
  disconnected: <WifiOff className="h-3 w-3 text-muted-foreground" />,
  degraded: <AlertTriangle className="h-3 w-3 text-warning" />,
};

const ollamaStatusColor: Record<string, string> = {
  unknown: "text-muted-foreground",
  available: "text-success",
  unavailable: "text-destructive",
  starting: "text-warning",
  degraded: "text-warning",
  error: "text-destructive",
};

export function ProviderHubView() {
  const { t } = useI18n();
  const activeLocalModel = localInferenceRuntime.modelRegistry.find((model) => model.id === localInferenceRuntime.ollama.selectedModelId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" /> {t("ph.title")}
        </h1>
        <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("ph.add")}</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {providerCategories.map((c) => (
          <span key={c.label} className="px-2 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground rounded">{c.label} ({c.count})</span>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2">
            {localInferenceRuntime.ollama.serviceState === "available" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : localInferenceRuntime.ollama.serviceState === "error" ? (
              <ServerCrash className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <Cpu className="h-3.5 w-3.5 text-warning" />
            )}
            <h2 className="text-xs font-semibold text-foreground">Ollama local runtime</h2>
            <span className={`text-[10px] font-mono uppercase ${ollamaStatusColor[localInferenceRuntime.ollama.serviceState]}`}>
              {localInferenceRuntime.ollama.serviceState}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Health: {localInferenceRuntime.ollama.connectionHealthy ? "healthy" : "failing"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] font-mono">
          <div className="flex justify-between"><span className="text-muted-foreground">Runtime</span><span className="text-foreground">{localInferenceRuntime.ollama.runtimeAvailable ? "detected" : "offline"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Last check</span><span className="text-foreground">{localInferenceRuntime.ollama.lastHealthCheckIso ?? "not checked"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Active model</span><span className="text-primary">{activeLocalModel?.displayName ?? "none"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Routing mode</span><span className="text-foreground uppercase">{localInferenceRuntime.routing.activeMode.replaceAll("_", " ")}</span></div>
        </div>

        <div className="pt-1 border-t border-border/50">
          <div className="text-[10px] font-mono text-foreground mb-1">Local model registry</div>
          <div className="space-y-1.5">
            {localInferenceRuntime.modelRegistry.map((model) => (
              <div key={model.id} className="rounded border border-border/60 p-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-foreground">{model.displayName}</span>
                  <span className={`font-mono ${model.status === "active" ? "text-success" : "text-muted-foreground"}`}>{model.status}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {model.capabilityTags.slice(0, 4).map((capability) => (
                    <span key={capability} className="px-1.5 py-0.5 text-[9px] bg-muted text-muted-foreground rounded">{capability}</span>
                  ))}
                </div>
                <div className="mt-1 text-[9px] text-muted-foreground font-mono">
                  {model.localAvailability} • {model.weightClass} • {model.estimatedSizeGb}GB • {model.memoryCostGb ?? "~"}GB RAM
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-1 border-t border-border/50 space-y-1 text-[10px]">
          <div className="flex items-center gap-1 text-foreground font-mono">
            <ShieldCheck className="h-3 w-3 text-success" />
            Privacy / routing controls
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Global mode</span><span className="font-mono text-primary uppercase">{localInferenceRuntime.routing.activeMode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sensitive tasks</span><span className="font-mono text-success">local only enforced</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fallback readiness</span><span className="font-mono text-foreground">{localInferenceRuntime.resources.autoFallbackReady ? "ready" : "not-ready"}</span></div>
        </div>
      </div>

      <div className="space-y-2">
        {providers.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                {statusIcon[p.status]}
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${p.type === "built-in" ? "bg-primary/20 text-primary" : p.type === "self-hosted" ? "bg-accent/20 text-accent" : "bg-secondary text-secondary-foreground"}`}>{p.type}</span>
                {p.privacyMode && <span className="px-1.5 py-0.5 text-[10px] font-mono bg-success/20 text-success rounded">Privacy</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {p.fallbackEnabled && <span className="text-info">Fallback ✓</span>}
                <span className="font-mono">{p.costTier}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {p.models.map((m) => (<span key={m} className="px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded">{m}</span>))}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {p.capabilities.map((c) => (<span key={c} className="px-1.5 py-0.5 text-[10px] bg-surface text-foreground rounded">{c}</span>))}
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
        <h2 className="text-xs font-semibold text-foreground mb-2">Agent/backend mapping</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {localInferenceRuntime.routing.agentAssignments.map((assignment) => (
            <div key={assignment.agentId} className="flex justify-between gap-2">
              <span className="truncate">{assignment.agentRole}</span>
              <span className="font-mono text-foreground text-right truncate">
                {assignment.preferredBackend} → {assignment.fallbackBackend}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Local routing scenarios</h2>
        <div className="space-y-1 text-[10px] text-muted-foreground">
          {localInferenceRuntime.scenarioLog.map((scenario) => (
            <div key={scenario} className="border-l border-primary/40 pl-2">{scenario}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
