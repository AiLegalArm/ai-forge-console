import { cloudAndCustomProviders, providerCategories } from "@/data/mock-providers";
import { Plug, Wifi, WifiOff, AlertTriangle, CheckCircle2, ServerCrash, Cpu, ShieldCheck, Cloud } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { WorkspaceRuntimeState } from "@/types/workspace";
import { listAgentBackendSummaries } from "@/lib/agent-backends/provider-hub";
import type { AgentBackendStatus, AgentBackendSummary } from "@/types/agent-backends";
import { useEffect, useMemo, useState } from "react";
import { SmartActionChips } from "@/components/assistive/SmartActionChips";
import { getSmartActionSuggestions, type SmartActionId } from "@/lib/ai-native-suggestions";

interface ProviderHubViewProps {
  workspaceState: WorkspaceRuntimeState;
  onRefreshLocalInference: () => Promise<void>;
}

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

const backendStatusColor: Record<AgentBackendStatus, string> = {
  not_installed: "text-muted-foreground",
  installed: "text-warning",
  configured: "text-info",
  ready: "text-success",
  busy: "text-warning",
  unavailable: "text-destructive",
  degraded: "text-warning",
  error: "text-destructive",
};

export function ProviderHubView({ workspaceState, onRefreshLocalInference }: ProviderHubViewProps) {
  const { t } = useI18n();
  const [agentBackends, setAgentBackends] = useState<AgentBackendSummary[]>([]);

  useEffect(() => {
    void listAgentBackendSummaries().then((summaries) => setAgentBackends(summaries));
  }, []);

  const backendCapabilityLabel = useMemo(
    () =>
      ({
        localCliExecution: "local-cli",
        multiFileEditing: "multi-file-edit",
        taskExecution: "task-exec",
        terminalToolUse: "terminal-tools",
        streamingProgress: "streaming",
        approvalIntegration: "approval-aware",
        promptSystemConfig: "prompt-config",
      }) as const,
    [],
  );
  const localInferenceRuntime = workspaceState.localInference;
  const activeLocalModel = localInferenceRuntime.modelRegistry.find((model) => model.id === localInferenceRuntime.ollama.selectedModelId);
  const providers = [
    ...cloudAndCustomProviders,
    {
      id: "p-6",
      name: "Ollama Local Runtime",
      type: "self-hosted" as const,
      status:
        localInferenceRuntime.ollama.serviceState === "available"
          ? ("connected" as const)
          : localInferenceRuntime.ollama.serviceState === "degraded" || localInferenceRuntime.ollama.serviceState === "starting"
            ? ("degraded" as const)
            : ("disconnected" as const),
      models: localInferenceRuntime.modelRegistry.map((model) => model.name),
      capabilities: ["chat", "code", "local-inference", "privacy-local"],
      costTier: "low" as const,
      privacyMode: true,
      fallbackEnabled: true,
      requestsToday: 0,
      avgLatency: 0,
    },
  ];
  const recoveryActions = getSmartActionSuggestions(workspaceState).filter((action) => (
    ["reconnect_provider", "switch_provider_fallback", "switch_to_local_mode", "open_terminal_output"].includes(action.id)
  ));
  const handleRecoveryAction = (actionId: SmartActionId) => {
    if (actionId === "reconnect_provider" || actionId === "switch_provider_fallback") {
      void onRefreshLocalInference();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" /> {t("ph.title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void onRefreshLocalInference()}
            className="px-3 py-1 text-xs font-mono border border-border rounded hover:border-primary/50"
          >
            Refresh local
          </button>
          <button className="px-3 py-1 text-xs font-mono bg-primary text-primary-foreground rounded">{t("ph.add")}</button>
        </div>
      </div>


      <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono">
        <div><span className="text-muted-foreground block">active provider</span><span className="text-foreground">{workspaceState.providerSource}</span></div>
        <div><span className="text-muted-foreground block">active model</span><span className="text-primary">{workspaceState.activeModel}</span></div>
        <div><span className="text-muted-foreground block">routing mode</span><span className="text-foreground uppercase">{workspaceState.routingMode.replace(/_/g, " ")}</span></div>
        <div><span className="text-muted-foreground block">profile</span><span className="text-foreground uppercase">{workspaceState.routingProfile}</span></div>
        <div><span className="text-muted-foreground block">fallback</span><span className={localInferenceRuntime.resources.autoFallbackReady ? "text-success" : "text-warning"}>{localInferenceRuntime.resources.autoFallbackReady ? "ready" : "not-ready"}</span></div>
        <div><span className="text-muted-foreground block">task context</span><span className="text-foreground">{workspaceState.currentTask}</span></div>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono">
        <div><span className="text-muted-foreground block">budget pressure</span><span className={`${localInferenceRuntime.operational.budgetPressure === "critical" ? "text-destructive" : localInferenceRuntime.operational.budgetPressure === "high" ? "text-warning" : "text-foreground"} uppercase`}>{localInferenceRuntime.operational.budgetPressure}</span></div>
        <div><span className="text-muted-foreground block">degraded mode</span><span className={localInferenceRuntime.operational.degradedMode ? "text-warning" : "text-success"}>{localInferenceRuntime.operational.degradedMode ? "enabled" : "off"}</span></div>
        <div><span className="text-muted-foreground block">openrouter health</span><span className="text-foreground uppercase">{localInferenceRuntime.operational.providerHealth.openrouter}</span></div>
        <div><span className="text-muted-foreground block">ollama health</span><span className="text-foreground uppercase">{localInferenceRuntime.operational.providerHealth.ollama}</span></div>
        <div><span className="text-muted-foreground block">fallback events</span><span className="text-info">{localInferenceRuntime.operational.fallbackEvents.length}</span></div>
        <div><span className="text-muted-foreground block">blocked expensive runs</span><span className="text-warning">{localInferenceRuntime.operational.blockedExpensiveRuns}</span></div>
      </div>
      <SmartActionChips title="Failure recovery suggestions" suggestions={recoveryActions} onAction={handleRecoveryAction} maxVisible={3} />
      <div className="flex gap-2 flex-wrap">
        {providerCategories.map((c) => (
          <span key={c.label} className="px-2 py-0.5 text-[10px] font-mono bg-secondary text-secondary-foreground rounded">{c.label} ({c.count})</span>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h2 className="text-xs font-semibold text-foreground">Agent backends</h2>
        <div className="space-y-2">
          {agentBackends.map((backend) => {
            const capabilityFlags = Object.entries(backend.capabilities)
              .filter(([key, value]) => key !== "operationModes" && value === true)
              .map(([key]) => backendCapabilityLabel[key as keyof typeof backendCapabilityLabel]);

            return (
              <div key={backend.id} className="rounded border border-border/60 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{backend.metadata.displayName}</span>
                    <span className={`text-[10px] font-mono uppercase ${backendStatusColor[backend.availability.status]}`}>
                      {backend.availability.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{backend.eventStreamMode}</span>
                    <span className={`text-[10px] font-mono ${backend.availability.installed ? "text-success" : "text-muted-foreground"}`}>
                      {backend.availability.installed ? "connected" : "not connected"}
                    </span>
                    <span className={`text-[10px] font-mono ${backend.availability.active ? "text-success" : "text-muted-foreground"}`}>
                      {backend.availability.active ? "active" : "inactive"}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${backend.availability.preferenceCandidateFor?.length ? "text-info" : "text-muted-foreground"}`}
                    >
                      {backend.availability.preferenceCandidateFor?.length ? "preference candidate" : "not a candidate"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{backend.availability.health}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className={backend.availability.active ? "text-success" : "text-muted-foreground"}>
                    {backend.availability.active ? "active" : "inactive"}
                  </span>
                  {backend.availability.localRuntimeAvailable !== undefined && (
                    <span className={backend.availability.localRuntimeAvailable ? "text-success" : "text-warning"}>
                      runtime {backend.availability.localRuntimeAvailable ? "available" : "unavailable"}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{backend.metadata.description}</div>
                <div className="flex flex-wrap gap-1">
                  {capabilityFlags.map((capability) => (
                    <span key={`${backend.id}-${capability}`} className="px-1.5 py-0.5 text-[9px] bg-muted text-muted-foreground rounded">
                      {capability}
                    </span>
                  ))}
                  {backend.capabilities.operationModes.map((mode) => (
                    <span key={`${backend.id}-mode-${mode}`} className="px-1.5 py-0.5 text-[9px] bg-secondary text-secondary-foreground rounded">
                      {mode}
                    </span>
                  ))}
                </div>
                {backend.availability.preferenceCandidateFor && backend.availability.preferenceCandidateFor.length > 0 && (
                  <div className="text-[10px] font-mono text-info">
                    candidate for: {backend.availability.preferenceCandidateFor.join(", ")}
                  </div>
                )}
                {backend.availability.statusDetail && (
                  <div className="text-[10px] font-mono text-muted-foreground">{backend.availability.statusDetail}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Cloud className={`h-3.5 w-3.5 ${localInferenceRuntime.cloud.status === "connected" ? "text-success" : "text-warning"}`} />
            <h2 className="text-xs font-semibold text-foreground">OpenRouter cloud runtime</h2>
            <span className={`text-[10px] font-mono uppercase ${localInferenceRuntime.cloud.status === "connected" ? "text-success" : localInferenceRuntime.cloud.status === "error" ? "text-destructive" : "text-warning"}`}>
              {localInferenceRuntime.cloud.status}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            API key: {localInferenceRuntime.cloud.apiKeyConfigured ? "configured" : "missing"} • checked: {localInferenceRuntime.cloud.lastHealthCheckIso ?? "never"}
          </span>
        </div>

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
          <div className="flex justify-between"><span className="text-muted-foreground">Last refresh</span><span className="text-foreground">{localInferenceRuntime.ollama.lastModelRefreshIso ?? "not refreshed"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Active model</span><span className="text-primary">{activeLocalModel?.displayName ?? "none"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Routing mode</span><span className="text-foreground uppercase">{localInferenceRuntime.routing.activeMode.replace(/_/g, " ")}</span></div>
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
                  {model.localAvailability} • {model.weightClass} • {model.estimatedSizeGb}GB • {model.memoryCostGb ?? "~"}GB RAM • {model.metadataCompleteness ?? "runtime"}
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
          <div className="flex justify-between"><span className="text-muted-foreground">App routing profile</span><span className="font-mono text-info uppercase">{localInferenceRuntime.routing.appModeProfile}</span></div>
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
        <h2 className="text-xs font-semibold text-foreground mb-2">Routing context visibility</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
          <div className="flex justify-between gap-2">
            <span>Current task</span>
            <span className="font-mono text-foreground text-right truncate">{workspaceState.currentTask}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Session</span>
            <span className="font-mono text-foreground">{workspaceState.currentChatSessionId}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Privacy mode</span>
            <span className="font-mono text-success uppercase">{workspaceState.privacyMode}</span>
          </div>
        </div>

        <h2 className="text-xs font-semibold text-foreground mb-2">Agent/backend mapping</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {localInferenceRuntime.routing.agentAssignments.map((assignment) => (
            <div key={assignment.agentId} className="flex justify-between gap-2">
              <span className="truncate">{assignment.agentRole}</span>
              <span className="font-mono text-foreground text-right truncate" title={`${assignment.preferredProvider ?? "?"}/${assignment.preferredModelId ?? "auto"} -> ${assignment.fallbackProvider ?? "?"}/${assignment.fallbackModelId ?? "auto"}`}>
                {assignment.routingProfile ?? "balanced"} • {assignment.preferredBackend} → {assignment.fallbackBackend}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Hybrid model registry</h2>
        <div className="space-y-1 text-[10px]">
          {localInferenceRuntime.hybridModelRegistry.slice(0, 10).map((model) => (
            <div key={model.id} className="flex items-center justify-between border-b border-border/40 pb-1">
              <span className="text-foreground truncate">{model.displayName}</span>
              <span className="font-mono text-muted-foreground uppercase">
                {model.provider} • {model.costTier}/{model.qualityTier}/{model.speedTier}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Routing presets</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {Object.entries(localInferenceRuntime.routing.presets).map(([presetId, preset]) => (
            <div key={presetId} className="flex justify-between gap-2">
              <span className="truncate font-mono text-foreground">{presetId}</span>
              <span className="font-mono text-right truncate">
                {preset.provider} / {preset.profile}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-foreground mb-2">Per-agent default routing</h2>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {Object.entries(localInferenceRuntime.routing.agentRoutingDefaults).map(([agentId, defaults]) => (
            <div key={agentId} className="flex justify-between gap-2">
              <span className="truncate">{agentId}</span>
              <span className="font-mono text-foreground text-right truncate">
                {"firstPass" in defaults
                  ? `${defaults.firstPass} → ${defaults.finalPass}`
                  : `${defaults.primary} → ${defaults.fallback}`}
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
