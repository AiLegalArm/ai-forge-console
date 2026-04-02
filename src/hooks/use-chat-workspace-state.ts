import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ORACLE_SYSTEM_PROMPT } from "@/data/oracle-system-prompt";
import type { AgentActivityEventType, ActivitySeverity } from "@/types/workflow";
import { activeAgents, initialChatState } from "@/data/mock-chat";
import { workflowState as initialWorkflowState } from "@/data/mock-workflow";
import { localInferenceRuntime } from "@/data/mock-local-inference";
import { browserSession, designSession } from "@/data/mock-agent-workspace";
import { evidenceFlowState } from "@/data/mock-evidence";
import { localShellState } from "@/data/mock-local-shell";
import { releaseControlState } from "@/data/mock-release-control";
import { createDeployProviderClientFromEnv, RealDeployIntegrationService } from "@/lib/deploy-integration-service";
import { deriveReleaseControlState, upsertApproval, upsertDeployment } from "@/lib/release-control-state";
import { createLocalGitService } from "@/lib/local-git-service";
import { createLocalGitHubService } from "@/lib/local-github-service";
import { createLocalTerminalExecutionService } from "@/lib/local-terminal-service";
import { hasDuplicateLocalPath, selectLocalProjectPath, validateLocalProjectPath } from "@/lib/local-project-service";
import { validateRepositoryConnection } from "@/lib/local-repository-service";
import { buildProjectCommandRegistry } from "@/lib/project-command-registry-service";
import { ollamaRuntimeService } from "@/lib/ollama-runtime-service";
import { openRouterProviderService, type OpenRouterExecutionState } from "@/lib/openrouter-provider-service";
import { modelRoutingEngine } from "@/lib/model-routing-engine";
import { buildAuditorControlStateFromSignals } from "@/lib/auditor-execution-engine";
import { BrowserAutomationService, RuntimeBridgeBrowserAdapter } from "@/lib/browser-automation-service";
import { createMockAssistantMessage } from "@/lib/chat-mock-responder";
import { runMainChatOrchestrator } from "@/lib/main-chat-orchestrator";
import { routedAgentExecutionService } from "@/lib/routed-agent-execution-service";
import { assembleContextPacket, buildContextPrompt } from "@/lib/context-assembly";
import { evaluateExecutionPolicy, pushPolicyDecision } from "@/lib/execution-policy-engine";
import { appendExecutionTraceStep, completeExecutionTrace, createExecutionTrace } from "@/lib/execution-trace-service";
import { evaluateBudgetGuardrails, shouldEnterDegradedMode } from "@/lib/operational-guardrails";
import { buildOperatorDashboard, type OperatorDashboardWorkspaceInput, type OperatorProjectSnapshot } from "@/lib/operator-dashboard";
import { evaluatePullRequestReviewOperations } from "@/lib/pr-review-operations";
import {
  buildWorkspaceMemorySnapshot,
  getMemoryStorageKey,
  loadWorkspaceMemory,
  mergeWorkspaceMemory,
  persistWorkspaceMemory,
  retrieveMemoryContext,
} from "@/lib/workspace-memory-service";
import type { ChatState, ChatType } from "@/types/chat";
import type { BrowserSession } from "@/types/agents";
import type { EvidenceFlowState, EvidenceRecord } from "@/types/evidence";
import type { AgentRole, AppRoutingModeProfile, LocalInferenceRuntimeState, RoutingMode, TaskType, RoutingDecision } from "@/types/local-inference";
import type { LocalShellWorkspaceState, TerminalCommand } from "@/types/local-shell";
import type { AgentCommandRequest, WorkflowState } from "@/types/workflow";
import type { ChatContextMap, WorkspaceProjectEntry, WorkspaceRepositoryState, WorkspaceRuntimeState } from "@/types/workspace";
import type { ProjectCommandEntry, ProjectCommandExecutionRecord, ProjectCommandRegistry } from "@/types/project-commands";
import type { WorkspaceMemoryState } from "@/types/memory";
import type { ContextInjectionPacket } from "@/types/context";
import type { ExecutionPolicyAction, ExecutionPolicyContext, ExecutionPolicyState } from "@/types/execution-policy";

type Action =
  | { type: "set_all_state"; payload: WorkspaceReducerState }
  | { type: "set_active_chat_type"; chatType: ChatType }
  | { type: "select_session"; chatType: ChatType; sessionId: string }
  | { type: "update_draft"; sessionId: string; value: string }
  | { type: "clear_approval"; sessionId: string }
  | { type: "approve_workflow_approval"; approvalId: string }
  | { type: "set_local_inference"; localInference: LocalInferenceRuntimeState }
  | { type: "set_local_shell"; localShell: LocalShellWorkspaceState }
  | { type: "set_browser_session"; browserSession: BrowserSession }
  | { type: "set_evidence_flow"; evidenceFlow: EvidenceFlowState }
  | { type: "set_chat"; chat: ChatState }
  | { type: "set_workflow"; workflow: WorkflowState };

interface WorkspaceReducerState {
  chat: ChatState;
  workflow: WorkflowState;
  localInference: LocalInferenceRuntimeState;
  localShell: LocalShellWorkspaceState;
  browserSession: BrowserSession;
  evidenceFlow: EvidenceFlowState;
}

interface ProjectScopedWorkspaceState {
  chat: ChatState;
  workflow: WorkflowState;
  localInference: LocalInferenceRuntimeState;
  localShell: LocalShellWorkspaceState;
  browserSession: BrowserSession;
  evidenceFlow: EvidenceFlowState;
  providerSource: "openrouter" | "ollama";
  deploymentMode: "local" | "cloud" | "hybrid";
  activeModel: string;
  routingProfile: AppRoutingModeProfile;
  repository: WorkspaceRepositoryState;
  projectCommandRegistry: ProjectCommandRegistry;
  pendingCommandLaunchByApprovalId: Record<string, { commandId: string; taskId?: string; chatId?: string; projectId: string }>;
  policyState: ExecutionPolicyState;
  routingDecisionsBySession: Record<string, RoutingDecision>;
  lastUsedModelByProvider: Record<"openrouter" | "ollama", string>;
}

const cloneSnapshot = <T,>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;

function reducer(state: WorkspaceReducerState, action: Action): WorkspaceReducerState {
  switch (action.type) {
    case "set_all_state": {
      return action.payload;
    }
    case "set_active_chat_type": {
      return { ...state, chat: { ...state.chat, activeChatType: action.chatType } };
    }
    case "select_session": {
      return {
        ...state,
        chat: {
          ...state.chat,
          selectedSessionIdByType: {
            ...state.chat.selectedSessionIdByType,
            [action.chatType]: action.sessionId,
          },
        },
      };
    }
    case "update_draft": {
      return {
        ...state,
        chat: {
          ...state.chat,
          draftInputBySessionId: {
            ...state.chat.draftInputBySessionId,
            [action.sessionId]: action.value,
          },
        },
      };
    }
    case "clear_approval": {
      return {
        ...state,
        chat: {
          ...state.chat,
          approvalRequestBySessionId: {
            ...state.chat.approvalRequestBySessionId,
            [action.sessionId]: null,
          },
        },
      };
    }
    case "approve_workflow_approval": {
      return {
        ...state,
        workflow: {
          ...state.workflow,
          approvals: state.workflow.approvals.map((approval) =>
            approval.id === action.approvalId ? { ...approval, status: "approved" } : approval,
          ),
        },
      };
    }
    case "set_local_inference": {
      return {
        ...state,
        localInference: action.localInference,
      };
    }
    case "set_local_shell": {
      return {
        ...state,
        localShell: action.localShell,
      };
    }
    case "set_browser_session": {
      return {
        ...state,
        browserSession: action.browserSession,
      };
    }
    case "set_evidence_flow": {
      return {
        ...state,
        evidenceFlow: action.evidenceFlow,
      };
    }
    case "set_chat": {
      return {
        ...state,
        chat: action.chat,
      };
    }
    case "set_workflow": {
      return {
        ...state,
        workflow: action.workflow,
      };
    }
    default:
      return state;
  }
}

export function useChatWorkspaceState() {
  const buildProjectScopedState = (
    _projectId: string,
    projectName: string,
    projectRoot: string,
    provider: "openrouter" | "ollama" = "ollama",
  ): ProjectScopedWorkspaceState => ({
    chat: cloneSnapshot(initialChatState),
    workflow: cloneSnapshot(initialWorkflowState),
    localInference: cloneSnapshot(localInferenceRuntime),
    localShell: {
      ...cloneSnapshot(localShellState),
      project: {
        ...cloneSnapshot(localShellState.project),
        workspaceName: projectName,
        activeProjectRoot: projectRoot,
      },
    },
    browserSession: cloneSnapshot(browserSession),
    evidenceFlow: cloneSnapshot(evidenceFlowState),
    providerSource: provider,
    deploymentMode: "hybrid",
    activeModel: provider === "openrouter" ? "openai/gpt-4.1" : "qwen3-coder:14b",
    routingProfile: "balanced",
    repository: {
      connected: false,
      syncStatus: "idle",
      connectionState: "disconnected",
    },
    projectCommandRegistry: {
      projectRoot,
      generatedAtIso: new Date().toISOString(),
      commands: [],
      primaryCommandIds: [],
      diagnostics: {
        agentsFileFound: false,
        agentsCommandsExtracted: 0,
        packageJsonFound: false,
        packageScriptsExtracted: 0,
        makefileFound: false,
        makeTargetsExtracted: 0,
        warnings: ["Command registry not loaded yet."],
      },
    },
    pendingCommandLaunchByApprovalId: {},
    policyState: { recentDecisions: [] },
    routingDecisionsBySession: {},
    lastUsedModelByProvider: {
      openrouter: "openai/gpt-4.1",
      ollama: "qwen3-coder:14b",
    },
  });

  const [state, dispatch] = useReducer(reducer, {
    chat: initialChatState,
    workflow: initialWorkflowState,
    localInference: localInferenceRuntime,
    localShell: localShellState,
    browserSession,
    evidenceFlow: evidenceFlowState,
  });

  const chatState = state.chat;
  const chatStateRef = useRef(chatState);
  chatStateRef.current = chatState;
  const workflow = state.workflow;
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;
  const localInference = state.localInference;
  const localShell = state.localShell;
  const activeBrowserSession = state.browserSession;
  const activeEvidenceFlow = state.evidenceFlow;
  const localInferenceRef = useRef(localInference);
  localInferenceRef.current = localInference;
  const localShellRef = useRef(localShell);
  localShellRef.current = localShell;
  const gitService = useMemo(() => createLocalGitService(localShell.project.activeProjectRoot), [localShell.project.activeProjectRoot]);
  const githubService = useMemo(() => createLocalGitHubService(localShell.project.activeProjectRoot), [localShell.project.activeProjectRoot]);
  const terminalService = useMemo(
    () => createLocalTerminalExecutionService(localShellState.project.activeProjectRoot),
    [],
  );
  const browserAutomationService = useMemo(
    () => new BrowserAutomationService(new RuntimeBridgeBrowserAdapter()),
    [],
  );
  const defaultProjectId = "project-local-1";
  const defaultProjectRoot = localShell.project.activeProjectRoot;
  const defaultProjectName = localShell.project.workspaceName;
  const [projectScopedStateById, setProjectScopedStateById] = useState<Record<string, ProjectScopedWorkspaceState>>({
    [defaultProjectId]: buildProjectScopedState(defaultProjectId, defaultProjectName, defaultProjectRoot),
  });
  const [providerSource, setProviderSource] = useState<"openrouter" | "ollama">("openrouter");
  const [deploymentMode, setDeploymentMode] = useState<"local" | "cloud" | "hybrid">("cloud");
  const [activeModel, setActiveModel] = useState("anthropic/claude-sonnet-4");
  const [routingProfile, setRoutingProfile] = useState<AppRoutingModeProfile>("balanced");
  const [providerExecutionState, setProviderExecutionState] = useState<OpenRouterExecutionState>("idle");
  const [lastUsedModelByProvider, setLastUsedModelByProvider] = useState<Record<"openrouter" | "ollama", string>>({
    openrouter: "anthropic/claude-sonnet-4",
    ollama: "qwen3-coder:14b",
  });
  const [projects, setProjects] = useState<WorkspaceProjectEntry[]>([
    {
      id: "project-local-1",
      name: localShell.project.workspaceName,
      description: "Default local workspace",
      projectType: "web-app",
      source: "local",
      localPath: localShell.project.activeProjectRoot,
      projectRoot: localShell.project.activeProjectRoot,
      branch: localShell.project.gitBranch || "main",
      status: "active",
      repository: {
        connected: false,
        syncStatus: "idle",
      },
      provider: {
        connected: true,
        source: "ollama",
      },
      instructions: {
        status: localShell.project.projectInstructionsDetected ? "found" : "not_found",
      },
    },
  ]);
  const [activeProjectId, setActiveProjectId] = useState(defaultProjectId);
  const [repository, setRepository] = useState<WorkspaceRepositoryState>({
    connected: false,
    syncStatus: "idle",
    connectionState: "disconnected",
  });
  const [projectCommandRegistry, setProjectCommandRegistry] = useState<ProjectCommandRegistry>({
    projectRoot: localShell.project.activeProjectRoot,
    generatedAtIso: new Date().toISOString(),
    commands: [],
    primaryCommandIds: [],
    diagnostics: {
      agentsFileFound: false,
      agentsCommandsExtracted: 0,
      packageJsonFound: false,
      packageScriptsExtracted: 0,
      makefileFound: false,
      makeTargetsExtracted: 0,
      warnings: ["Command registry not loaded yet."],
    },
  });
  const [pendingCommandLaunchByApprovalId, setPendingCommandLaunchByApprovalId] = useState<
    Record<string, { commandId: string; taskId?: string; chatId?: string; projectId: string }>
  >({});
  const [policyState, setPolicyState] = useState<ExecutionPolicyState>({ recentDecisions: [] });
  const [releaseControl, setReleaseControl] = useState(releaseControlState);
  const deployIntegrationService = useMemo(
    () => new RealDeployIntegrationService(createDeployProviderClientFromEnv()),
    [],
  );
  useEffect(() => {
    setReleaseControl((prev) => deriveReleaseControlState(prev, workflow, auditorControlState, activeEvidenceFlow));
  }, [workflow, activeEvidenceFlow]);

  type AddLocalProjectResult = {
    ok: boolean;
    message: string;
    code:
      | "added"
      | "selection_cancelled"
      | "missing_path"
      | "invalid_path"
      | "inaccessible_path"
      | "duplicate_path"
      | "empty_folder";
    path?: string;
    projectId?: string;
    projectName?: string;
    hasGitRepository?: boolean;
    hasAgentsInstructions?: boolean;
  };

  const currentChatType = chatState.activeChatType;
  const currentChatSessionId = chatState.selectedSessionIdByType[currentChatType];
  const currentSession = chatState.sessions.find((session) => session.id === currentChatSessionId);
  const currentSessionRoutingMode = localInference.routing.conversationOverrides[currentChatSessionId] ?? localInference.routing.activeMode;
  const [routingDecisionsBySession, setRoutingDecisionsBySession] = useState<Record<string, RoutingDecision>>({});

  const mapProfileToRoutingMode = (profile: AppRoutingModeProfile): RoutingMode => {
    switch (profile) {
      case "cheap_fast":
        return "cloud_preferred";
      case "balanced":
        return "hybrid";
      case "quality_first":
        return "cloud_preferred";
      case "privacy_first":
        return "sensitive_local_only";
      case "local_only":
        return "local_only";
      default:
        return "hybrid";
    }
  };

  const resolveModelOptions = (provider: "openrouter" | "ollama") => {
    if (provider === "openrouter") {
      const cloudModels = localInference.hybridModelRegistry.filter((entry) => entry.provider === "openrouter");
      const fallbackCloud = [
        // Anthropic
        { id: "anthropic/claude-sonnet-4", displayName: "Claude Sonnet 4", group: "Anthropic" },
        { id: "anthropic/claude-3.5-sonnet", displayName: "Claude 3.5 Sonnet", group: "Anthropic" },
        { id: "anthropic/claude-3.5-haiku", displayName: "Claude 3.5 Haiku", group: "Anthropic" },
        // OpenAI
        { id: "openai/gpt-4.1", displayName: "GPT-4.1", group: "OpenAI" },
        { id: "openai/gpt-4.1-mini", displayName: "GPT-4.1 Mini", group: "OpenAI" },
        { id: "openai/gpt-4.1-nano", displayName: "GPT-4.1 Nano", group: "OpenAI" },
        { id: "openai/o3", displayName: "OpenAI o3", group: "OpenAI" },
        { id: "openai/o4-mini", displayName: "OpenAI o4-mini", group: "OpenAI" },
        // Google
        { id: "google/gemini-2.5-pro", displayName: "Gemini 2.5 Pro", group: "Google" },
        { id: "google/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", group: "Google" },
        { id: "google/gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite", group: "Google" },
        // DeepSeek
        { id: "deepseek/deepseek-r1", displayName: "DeepSeek R1", group: "DeepSeek" },
        { id: "deepseek/deepseek-chat", displayName: "DeepSeek V3", group: "DeepSeek" },
        // Qwen
        { id: "qwen/qwen3-235b-a22b", displayName: "Qwen3 235B", group: "Qwen" },
        { id: "qwen/qwen3-30b-a3b", displayName: "Qwen3 30B", group: "Qwen" },
        // Meta
        { id: "meta-llama/llama-4-maverick", displayName: "Llama 4 Maverick", group: "Meta" },
        { id: "meta-llama/llama-4-scout", displayName: "Llama 4 Scout", group: "Meta" },
        // Mistral
        { id: "mistralai/mistral-large", displayName: "Mistral Large", group: "Mistral" },
        { id: "mistralai/codestral", displayName: "Codestral", group: "Mistral" },
      ];

      return cloudModels.length > 0
        ? cloudModels.map((entry) => ({ id: entry.providerModelId, displayName: entry.displayName, group: "OpenRouter" }))
        : fallbackCloud;
    }

    const localModels = localInference.modelRegistry.map((entry) => ({
      id: entry.name,
      displayName: entry.displayName,
      group: "Ollama",
    }));
    return localModels.length > 0 ? localModels : [{ id: "qwen3-coder:14b", displayName: "Qwen3 Coder 14B", group: "Ollama" }];
  };

  const activeWorkflowTask =
    workflow.tasks.find((task) => task.linkedChatSessionId === currentChatSessionId) ??
    workflow.tasks.find((task) => task.id === currentSession?.linked.taskId) ??
    workflow.tasks[0];

  const activeRepository = workflow.github.repositories.find((repo) => repo.id === workflow.github.activeRepositoryId);

  const activeReviewId = activeWorkflowTask?.linkedReviewId ?? currentSession?.linked.reviewId;
  const activeReleaseCandidateId = activeWorkflowTask?.linkedReleaseCandidateId;
  const activeAuditGate = activeWorkflowTask?.github?.pullRequest?.auditGate;

  const pendingApprovals = workflow.approvals.filter((approval) => {
    const inSession = approval.chatId === currentChatSessionId;
    const inTask = activeWorkflowTask ? approval.taskId === activeWorkflowTask.id : false;
    return approval.status === "pending" && (inSession || inTask);
  });
  const auditorControlState = useMemo(
    () =>
      buildAuditorControlStateFromSignals({
        workflow,
        localShell,
        localInference,
        browserSession: activeBrowserSession,
        evidenceFlow: activeEvidenceFlow,
        releaseControl: releaseControlState,
        repository,
        currentTaskId: activeWorkflowTask?.id,
        currentChatSessionId,
        currentReviewId: activeReviewId,
        currentReleaseCandidateId: activeReleaseCandidateId,
      }),
    [
      workflow,
      localShell,
      localInference,
      activeBrowserSession,
      activeEvidenceFlow,
      repository,
      activeWorkflowTask?.id,
      currentChatSessionId,
      activeReviewId,
      activeReleaseCandidateId,
    ],
  );
  const resolveTaskTypeForRouting = (chatType: ChatType, taskPhase?: WorkflowState["tasks"][number]["phase"]): TaskType => {
    if (chatType === "audit") return "audit";
    if (chatType === "review") return taskPhase === "release" ? "release" : "review";
    if (taskPhase === "release") return "release";
    if (taskPhase === "audit") return "audit";
    if (taskPhase === "review") return "review";
    return "coding";
  };

  const resolveAgentRoleForRouting = (chatType: ChatType, agentId?: string): AgentRole => {
    const linkedAgent = agentId ? activeAgents.find((agent) => agent.id === agentId) : undefined;
    const role = linkedAgent?.role;
    if (role) return role;
    if (chatType === "audit") return "code_auditor";
    if (chatType === "review") return "reviewer";
    if (chatType === "main") return "planner";
    return "worker";
  };

  const buildRuntimeRoutingDecision = (chatType: ChatType, sessionId: string, agentId?: string) =>
    modelRoutingEngine.chooseModel(
      {
        agentRole: resolveAgentRoleForRouting(chatType, agentId ?? activeWorkflowTask?.ownerAgentId),
        taskType: resolveTaskTypeForRouting(chatType, activeWorkflowTask?.phase),
        chatType,
        appModeProfile: routingProfile,
        routingMode: currentSessionRoutingMode,
        privacyMode: currentSessionRoutingMode === "sensitive_local_only" || currentSessionRoutingMode === "local_only" ? "strict_local" : "standard",
        preferredBackend: providerSource === "openrouter" ? "cloud" : "ollama",
        preferredProvider: providerSource,
        preferredModelId: activeModel,
        openRouterAvailable: localInference.cloud.status === "connected",
        ollamaAvailable: localInference.ollama.runtimeAvailable,
        localOnly: deploymentMode === "local",
        releaseCritical: Boolean(activeWorkflowTask?.phase === "release" || activeWorkflowTask?.github?.pullRequest?.auditGate?.verdict === "no_go"),
        budgetPressure: localInference.operational.budgetPressure,
        degradedMode: localInference.operational.degradedMode,
        blockWeakFallbackForRelease: true,
        fallbackRequired: true,
      },
      localInference.hybridModelRegistry,
    );

  const chatContexts = useMemo<ChatContextMap>(() => {
    const contextMap = {
      main: [],
      agent: [],
      audit: [],
      review: [],
    } as ChatContextMap;

    (Object.keys(contextMap) as ChatType[]).forEach((type) => {
      const sessionId = chatState.selectedSessionIdByType[type];
      contextMap[type] = sessionId ? (chatState.messagesBySessionId[sessionId] ?? []) : [];
    });

    return contextMap;
  }, [chatState.messagesBySessionId, chatState.selectedSessionIdByType]);

  const refreshLocalInference = async () => {
    const currentLocalInference = localInferenceRef.current;
    const [snapshot, openRouterSnapshot] = await Promise.all([
      ollamaRuntimeService.getRuntimeSnapshot(currentLocalInference.ollama.selectedModelId),
      openRouterProviderService.getProviderSnapshot(),
    ]);

    const nextHybridRegistry = [
      ...openRouterSnapshot.models,
      ...snapshot.modelRegistry.map((model) => ({
        id: `ollama-${model.id}`,
        provider: "ollama" as const,
        providerModelId: model.name,
        displayName: `${model.displayName} (Ollama)`,
        costTier: "low" as const,
        qualityTier: model.weightClass === "xlarge" || model.weightClass === "large" ? ("high" as const) : ("medium" as const),
        speedTier: model.weightClass === "small" || model.weightClass === "tiny" ? ("fast" as const) : ("balanced" as const),
        contextSuitability: model.capabilityTags.includes("long_context") ? ("high" as const) : ("medium" as const),
        codingSuitability: model.capabilityTags.includes("coding") ? ("high" as const) : ("medium" as const),
        auditSuitability: model.capabilityTags.includes("auditing") ? ("high" as const) : ("medium" as const),
        reviewSuitability: model.capabilityTags.includes("reviewing") ? ("high" as const) : ("medium" as const),
        structuredOutputSuitability: model.capabilityTags.includes("structured_output") ? ("high" as const) : ("medium" as const),
        availability: model.localAvailability === "available" ? ("available" as const) : ("degraded" as const),
      })),
    ];

    const nextRoutingMode = snapshot.connection.runtimeAvailable
      ? currentLocalInference.routing.activeMode
      : currentLocalInference.routing.activeMode === "local_only" || currentLocalInference.routing.activeMode === "sensitive_local_only"
        ? "hybrid"
        : currentLocalInference.routing.activeMode;

    const baseAssignments = currentLocalInference.routing.agentAssignments.map((assignment) => {
      if (snapshot.connection.runtimeAvailable) {
        return assignment;
      }

      const localPreferred = assignment.preferredBackend === "ollama" || assignment.preferredBackend === "local";
      const fallbackBackend = assignment.fallbackBackend === "ollama" ? "cloud" : assignment.fallbackBackend;

      return {
        ...assignment,
        preferredBackend: localPreferred ? "cloud" : assignment.preferredBackend,
        fallbackBackend,
        assignedModelId: localPreferred ? undefined : assignment.assignedModelId,
      };
    });

    const nextAgentAssignments = modelRoutingEngine.assignAgents(baseAssignments, nextHybridRegistry);

    dispatch({
      type: "set_local_inference",
      localInference: {
        ...currentLocalInference,
        ollama: snapshot.connection,
        cloud: openRouterSnapshot.config,
        hybridModelRegistry: nextHybridRegistry,
        modelRegistry: snapshot.modelRegistry.length > 0 ? snapshot.modelRegistry : currentLocalInference.modelRegistry,
        routing: {
          ...currentLocalInference.routing,
          activeMode: nextRoutingMode,
          agentAssignments: nextAgentAssignments,
          runtimeDecisionsBySurface: currentLocalInference.routing.runtimeDecisionsBySurface ?? {},
        },
        resources: {
          ...currentLocalInference.resources,
          autoFallbackReady: !snapshot.connection.runtimeAvailable || currentLocalInference.resources.autoFallbackReady,
          degradedMode: snapshot.connection.serviceState === "degraded" || snapshot.connection.serviceState === "error",
        },
        operational: {
          ...currentLocalInference.operational,
          degradedMode:
            currentLocalInference.operational.degradedMode ||
            snapshot.connection.serviceState === "degraded" ||
            snapshot.connection.serviceState === "error",
          providerHealth: {
            ...currentLocalInference.operational.providerHealth,
            ollama: snapshot.connection.runtimeAvailable ? "healthy" : "degraded",
            openrouter: openRouterSnapshot.config.status === "connected" ? "healthy" : "pressured",
          },
        },
        scenarioLog: [
          `${new Date().toISOString()}: Ollama ${snapshot.connection.serviceState} (${snapshot.connection.offlineReason ?? "runtime healthy"}).`,
          ...currentLocalInference.scenarioLog.slice(0, 7),
        ],
      },
    });
  };

  const activeProject = projects.find((project) => project.id === activeProjectId);
  const syncProjectScopedSnapshot = (projectId: string) => {
    setProjectScopedStateById((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] ?? buildProjectScopedState(projectId, activeProject?.name ?? localShell.project.workspaceName, activeProject?.projectRoot ?? localShell.project.activeProjectRoot, providerSource)),
        chat: cloneSnapshot(chatStateRef.current),
        workflow: cloneSnapshot(workflowRef.current),
        localInference: cloneSnapshot(localInferenceRef.current),
        localShell: cloneSnapshot(localShellRef.current),
        browserSession: cloneSnapshot(state.browserSession),
        evidenceFlow: cloneSnapshot(state.evidenceFlow),
        providerSource,
        deploymentMode,
        activeModel,
        routingProfile,
        repository: cloneSnapshot(repository),
        projectCommandRegistry: cloneSnapshot(projectCommandRegistry),
        pendingCommandLaunchByApprovalId: cloneSnapshot(pendingCommandLaunchByApprovalId),
        policyState: cloneSnapshot(policyState),
        routingDecisionsBySession: cloneSnapshot(routingDecisionsBySession),
        lastUsedModelByProvider: cloneSnapshot(lastUsedModelByProvider),
      },
    }));
  };
  const memoryStorageKey = useMemo(
    () => getMemoryStorageKey(activeProjectId, activeProject?.projectRoot ?? localShell.project.activeProjectRoot),
    [activeProject?.projectRoot, activeProjectId, localShell.project.activeProjectRoot],
  );
  const [persistedMemory, setPersistedMemory] = useState<WorkspaceMemoryState | null>(null);

  useEffect(() => {
    setPersistedMemory(loadWorkspaceMemory(memoryStorageKey));
  }, [memoryStorageKey]);

  const workspaceMemorySnapshot = useMemo(
    () =>
      buildWorkspaceMemorySnapshot({
        projectId: activeProject?.id ?? activeProjectId,
        projectName: activeProject?.name ?? localShell.project.workspaceName,
        projectPath: activeProject?.projectRoot ?? localShell.project.activeProjectRoot,
        repositorySummary: repository.connected
          ? `${repository.name ?? "repo"} @ ${repository.branch ?? "unknown"} (${repository.syncStatus ?? "idle"})`
          : "Repository disconnected",
        discoveredInstructions: localShell.project.instructionSources,
        commandRegistry: projectCommandRegistry,
        providerSource,
        activeModel,
        deploymentMode,
        localCloudPreference: deploymentMode === "local" ? "local" : deploymentMode === "cloud" ? "cloud" : "hybrid",
        knownConventions: [
          ...(projectCommandRegistry.diagnostics.agentsFileFound ? ["AGENTS.md instructions present"] : []),
          ...(projectCommandRegistry.diagnostics.packageJsonFound ? ["package.json scripts workflow"] : []),
          ...(projectCommandRegistry.diagnostics.makefileFound ? ["Makefile targets available"] : []),
        ],
        workflow,
        auditors: auditorControlState,
        releaseControl: releaseControl,
        chatState,
        currentChatType,
        currentChatSessionId,
        activeAgentId: activeWorkflowTask?.ownerAgentId ?? currentSession?.linked.agentId,
      }),
    [
      activeModel,
      activeProject?.id,
      activeProject?.name,
      activeProject?.projectRoot,
      activeProjectId,
      chatState,
      currentChatSessionId,
      currentChatType,
      currentSession?.linked.agentId,
      deploymentMode,
      localShell.project.activeProjectRoot,
      localShell.project.instructionSources,
      localShell.project.workspaceName,
      projectCommandRegistry,
      providerSource,
      repository.branch,
      repository.connected,
      repository.name,
      repository.syncStatus,
      workflow,
      activeWorkflowTask?.ownerAgentId,
    ],
  );
  const workspaceMemory = useMemo(
    () => mergeWorkspaceMemory(persistedMemory, workspaceMemorySnapshot),
    [persistedMemory, workspaceMemorySnapshot],
  );

  useEffect(() => {
    syncProjectScopedSnapshot(activeProjectId);
  }, [
    activeProjectId,
    activeModel,
    deploymentMode,
    pendingCommandLaunchByApprovalId,
    policyState,
    projectCommandRegistry,
    repository,
    routingDecisionsBySession,
    routingProfile,
    providerSource,
    lastUsedModelByProvider,
    state.browserSession,
    state.chat,
    state.evidenceFlow,
    state.localInference,
    state.localShell,
    state.workflow,
  ]);

  useEffect(() => {
    persistWorkspaceMemory(memoryStorageKey, workspaceMemory);
  }, [memoryStorageKey, workspaceMemory]);

  const contextEnvelope = useMemo(
    () =>
      retrieveMemoryContext(workspaceMemory, {
        projectId: activeProject?.id ?? activeProjectId,
        taskId: activeWorkflowTask?.id,
        chatSessionId: currentChatSessionId,
        releaseCandidateId: activeWorkflowTask?.linkedReleaseCandidateId,
        agentRole: activeWorkflowTask?.ownerAgentId,
        audience:
          currentChatType === "agent"
            ? "agent"
            : currentChatType === "audit" || currentChatType === "review"
              ? "auditor"
              : "main_chat",
      }),
    [
      workspaceMemory,
      activeProject?.id,
      activeProjectId,
      activeWorkflowTask?.id,
      activeWorkflowTask?.linkedReleaseCandidateId,
      activeWorkflowTask?.ownerAgentId,
      currentChatSessionId,
      currentChatType,
    ],
  );

  const evaluatePolicy = (action: ExecutionPolicyAction, contextOverride?: Partial<ExecutionPolicyContext>) => {
    const context: ExecutionPolicyContext = {
      activeProjectId,
      activeProjectName: activeProject?.name ?? localShell.project.workspaceName,
      activeTaskId: activeWorkflowTask?.id,
      activeTaskStatus: activeWorkflowTask?.status,
      providerSource,
      activeModel,
      deploymentMode,
      localCloudMode: deploymentMode,
      hasAuditBlockers: auditorControlState.blockers.some((blocker) => blocker.status === "active"),
      hasCriticalAuditBlockers: auditorControlState.blockers.some((blocker) => blocker.status === "active" && blocker.blockingSeverity === "critical"),
      releaseState:
        releaseControl.finalDecision.status === "go" ? "go" : releaseControl.finalDecision.status === "blocked" || releaseControl.finalDecision.status === "no_go" ? "blocked" : "warning",
      commandSafetyLevel: action.commandSafetyLevel ?? "safe",
      repoConnected: repository.connected,
      repoClean: repository.clean ?? true,
      ...contextOverride,
    };

    const decision = evaluateExecutionPolicy(action, context);
    setPolicyState((prev) => pushPolicyDecision(prev, decision));
    return decision;
  };

  const workspaceStateBase: Omit<WorkspaceRuntimeState, "contextPackets" | "contextEnvelope" | "operatorDashboard"> = {
    // runtime-selected route is reflected in chat/session metadata and surfaced here for badges
    currentProject: activeProject?.name ?? localShell.project.workspaceName,
    currentBranch:
      activeProject?.repository?.branch ??
      (repository as any).branch ??
      activeWorkflowTask?.github?.branch?.localBranchName ??
      localShell.project.gitBranch ??
      activeWorkflowTask?.branchName ??
      activeRepository?.defaultBranch ??
      "main",
    currentTask: activeWorkflowTask?.title ?? currentSession?.linked.taskTitle ?? "Build user management module",
    activeProvider:
      (routingDecisionsBySession[currentChatSessionId]?.selectedProvider ?? providerSource) === "ollama" ? "Ollama" : "OpenRouter",
    activeModel:
      localInference.hybridModelRegistry.find((entry) => entry.id === routingDecisionsBySession[currentChatSessionId]?.selectedModelId)?.providerModelId ??
      activeModel,
    lastUsedModel: lastUsedModelByProvider[providerSource],
    availableModels: resolveModelOptions(providerSource),
    providerSource,
    activeBackend: providerSource === "openrouter" ? "cloud" : "ollama",
    deploymentMode,
    routingProfile,
    routingMode: currentSessionRoutingMode,
    privacyMode: "private",
    syncStatus: repository.connected ? "connected" : (activeRepository?.state ?? "disconnected"),
    activeAgents,
    currentConversationType: currentChatType,
    currentChatSessionId,
    currentPhase: activeWorkflowTask?.phase ?? "planning",
    currentTaskStatus: activeWorkflowTask?.status ?? "queued",
    activeAgentId: activeWorkflowTask?.ownerAgentId ?? currentSession?.linked.agentId,
    currentReviewId: activeReviewId,
    currentReleaseCandidateId: activeReleaseCandidateId,
    auditGateVerdict: activeAuditGate?.verdict,
    releaseReadinessStatus: releaseControl.finalDecision.status,
    pendingApprovals,
    workflow,
    auditors: auditorControlState,
    designSession,
    browserSession: activeBrowserSession,
    evidenceFlow: activeEvidenceFlow,
    releaseControl: releaseControl,
    localInference,
    localShell,
    projects,
    activeProjectId,
    repository,
    projectCommandRegistry,
    policyState,
    terminalCommandRegistryReady: localShell.terminal.state !== "error" && projectCommandRegistry.commands.length > 0,
    agentCommandRegistryReady: projectCommandRegistry.commands.length > 0,
    providerExecutionState,
    projectInstructions: { status: "not_found" },
    memory: workspaceMemory,
  };

  const contextPackets = useMemo<WorkspaceRuntimeState["contextPackets"]>(() => {
    const mainChat = assembleContextPacket({
      workspace: workspaceStateBase as WorkspaceRuntimeState,
      target: "main_chat",
      chatType: "main",
      memoryContext: contextEnvelope,
    });
    return {
      mainChat,
      agentChat: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "agent_chat",
        chatType: "agent",
        agentId: workspaceStateBase.activeAgentId,
        memoryContext: contextEnvelope,
      }),
      auditChat: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "audit_chat",
        chatType: "audit",
        agentId: workspaceStateBase.activeAgentId,
        memoryContext: contextEnvelope,
      }),
      reviewChat: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "review_chat",
        chatType: "review",
        agentId: workspaceStateBase.activeAgentId,
        memoryContext: contextEnvelope,
      }),
      workerAgent: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "worker_agent",
        agentId: workspaceStateBase.activeAgentId,
        memoryContext: contextEnvelope,
      }),
      auditor: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "auditor",
        agentId: workspaceStateBase.activeAgentId,
        memoryContext: contextEnvelope,
      }),
      releaseFlow: assembleContextPacket({
        workspace: workspaceStateBase as WorkspaceRuntimeState,
        target: "release_flow",
        memoryContext: contextEnvelope,
      }),
    };
  }, [contextEnvelope, workspaceStateBase]);

  const operatorProjectSnapshots = useMemo<OperatorProjectSnapshot[]>(() => projects.map((project) => {
    const scoped = projectScopedStateById[project.id];
    return {
      projectId: project.id,
      projectName: project.name,
      providerSource: scoped?.providerSource ?? providerSource,
      activeModel: scoped?.activeModel ?? activeModel,
      routingProfile: scoped?.routingProfile ?? routingProfile,
      workflow: scoped?.workflow ?? workflow,
      localInference: scoped?.localInference ?? localInference,
    };
  }), [projects, projectScopedStateById, providerSource, activeModel, routingProfile, workflow, localInference]);

  const operatorDashboardInput = useMemo<OperatorDashboardWorkspaceInput>(() => ({
    workflow,
    auditors: auditorControlState,
    releaseControl: releaseControl,
    pendingApprovals,
    localInference,
    activeAgents,
    activeProjectId,
    releaseReadinessStatus: releaseControl.finalDecision.status,
  }), [workflow, pendingApprovals, localInference, activeProjectId]);

  const operatorDashboard = useMemo(() => buildOperatorDashboard(operatorDashboardInput, operatorProjectSnapshots), [operatorDashboardInput, operatorProjectSnapshots]);

  const workspaceState: WorkspaceRuntimeState = {
    ...workspaceStateBase,
    contextPackets,
    memory: workspaceMemory,
    contextEnvelope,
    operatorDashboard,
  };

  useEffect(() => {
    let active = true;
    const projectRoot = localShell.project.activeProjectRoot;
    if (!projectRoot) return () => {
      active = false;
    };

    void (async () => {
      const registry = await buildProjectCommandRegistry({ projectRoot });
      if (!active) return;

      setProjectCommandRegistry(registry);
      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          project: {
            ...localShellRef.current.project,
            projectInstructionsDetected: registry.diagnostics.agentsFileFound,
            instructionSources: [
              ...(registry.diagnostics.agentsFileFound ? ["AGENTS.md/AGENT.md"] : []),
              ...(registry.diagnostics.packageJsonFound ? ["package.json"] : []),
              ...(registry.diagnostics.makefileFound ? ["Makefile"] : []),
            ],
            commandRegistryLoaded: true,
            commandRegistryUpdatedAtIso: registry.generatedAtIso,
          },
        },
      });
    })();

    return () => {
      active = false;
    };
  }, [localShell.project.activeProjectRoot]);

  useEffect(() => {
    const existing = terminalService.selectSession(localShellRef.current.terminal.selectedSessionId);
    if (!existing) {
      terminalService.createSession({
        workingDirectory: localShellRef.current.project.activeProjectRoot,
        linkedChatSessionId: currentChatSessionId,
        linkedTaskId: activeWorkflowTask?.id,
      });
    }
    dispatch({
      type: "set_local_shell",
      localShell: {
        ...localShellRef.current,
        terminal: terminalService.getSessionState(),
      },
    });
  }, [activeWorkflowTask?.id, currentChatSessionId, terminalService]);

  const appendTerminalMessage = (command: TerminalCommand) => {
    const sessionId = command.linkedChatSessionId ?? currentChatSessionId;
    const currentMessages = chatState.messagesBySessionId[sessionId] ?? [];
    const nextMessage = {
      id: `msg-term-${command.id}`,
      sessionId,
      role: "system" as const,
      authorLabel: "Terminal Runtime",
      content:
        command.state === "approval_required"
          ? `Command awaiting approval: ${command.command}`
          : command.state === "failed"
            ? `Command failed (${command.failureReason ?? "unknown"}): ${command.command}`
            : `Command completed (exit ${command.exitCode ?? 0}): ${command.command}`,
      createdAtIso: new Date().toISOString(),
      status: command.state === "failed" ? ("failed" as const) : ("completed" as const),
      linked: command.linkedTaskId
        ? {
            taskId: command.linkedTaskId,
            taskTitle: workflow.tasks.find((task) => task.id === command.linkedTaskId)?.title,
          }
        : undefined,
    };

    dispatch({
      type: "set_chat",
      chat: {
        ...chatState,
        messagesBySessionId: {
          ...chatState.messagesBySessionId,
          [sessionId]: [...currentMessages, nextMessage],
        },
      },
    });
  };

  const pickAgentSuggestedCommand = (chatType: ChatType, agentId?: string) => {
    const commands = projectCommandRegistry.commands.filter((command) => command.availability !== "invalid" && command.availability !== "unavailable");
    const selectByCategories = (categories: string[]) => commands.find((command) => categories.includes(command.category));

    if (chatType === "audit") return selectByCategories(["test", "lint", "typecheck"]);
    if (chatType === "review") return selectByCategories(["lint", "typecheck", "build"]);
    if (agentId?.includes("frontend")) return selectByCategories(["dev", "build"]);
    if (agentId?.includes("backend")) return selectByCategories(["test", "build"]);
    return selectByCategories(["test", "build", "dev"]);
  };

  const executeAgentCommandRequest = async (requestId: string, approved: boolean, requestOverride?: AgentCommandRequest) => {
    const request = requestOverride ?? workflow.agentCommandRequests.find((entry) => entry.id === requestId);
    if (!request) return;

    const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
      workingDirectory: localShell.project.activeProjectRoot,
      linkedTaskId: request.linkedTaskId,
      linkedChatSessionId: request.linkedChatId,
    });
    terminalService.selectSession(activeTerminal.id);

    const terminalResult = await terminalService.execute(activeTerminal.id, {
      command: request.rawCommand,
      linkedTaskId: request.linkedTaskId,
      linkedChatSessionId: request.linkedChatId,
      approved,
      origin: approved ? "agent_approved" : "agent_suggested",
      linkedAgentId: request.linkedAgentId,
      linkedAgentCommandRequestId: request.id,
      commandSource: request.commandSource,
      originReason: request.reason,
    });

    dispatch({
      type: "set_local_shell",
      localShell: {
        ...localShellRef.current,
        terminal: terminalService.getSessionState(),
      },
    });
    appendTerminalMessage(terminalResult.command);

    const succeeded = terminalResult.command.state === "completed";
    const nextIso = new Date().toISOString();
    dispatch({
      type: "set_workflow",
      workflow: {
        ...workflow,
        agentCommandRequests: workflow.agentCommandRequests.map((entry) =>
          entry.id === request.id
            ? {
                ...entry,
                origin: approved ? "agent_approved_to_run_command" : entry.origin,
                executionState: succeeded ? "executed" : terminalResult.command.state === "approval_required" ? "awaiting_approval" : "blocked",
                resultState: succeeded ? "success" : terminalResult.command.state === "approval_required" ? "none" : "failed",
                linkedTerminalCommandId: terminalResult.command.id,
                executedAtIso: succeeded ? nextIso : entry.executedAtIso,
                updatedAtIso: nextIso,
              }
            : entry,
        ),
        activityEvents: [
          {
            id: `activity-agent-command-${request.id}`,
            type: succeeded ? "command_executed" : "command_blocked",
            title: succeeded ? "Agent command executed" : "Agent command blocked",
            details: request.rawCommand,
            taskId: request.linkedTaskId,
            chatId: request.linkedChatId,
            agentId: request.linkedAgentId,
            severity: succeeded ? "info" : "warning",
            createdAtIso: nextIso,
          },
          ...workflow.activityEvents,
        ],
      },
    });
  };

  const proposeAgentCommand = async (chatType: ChatType, chatSessionId: string, reason: string, agentId?: string) => {
    const suggestion = pickAgentSuggestedCommand(chatType, agentId);
    if (!suggestion || !activeWorkflowTask) return;

    const existingPending = workflow.agentCommandRequests.some(
      (request) => request.linkedChatId === chatSessionId && request.executionState !== "executed" && request.resultState === "none",
    );
    if (existingPending) return;

    const requestId = `acr-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const policyDecision = evaluatePolicy({
      actionType: "agent_triggered_command_execution",
      subject: { type: "agent", id: agentId ?? activeWorkflowTask.ownerAgentId ?? "agent-system" },
      target: { type: "command", id: suggestion.id, label: suggestion.displayName },
      commandSafetyLevel: suggestion.runSafety,
      metadata: { category: suggestion.category },
    });
    if (policyDecision.blocked) return;
    const requiresApproval = policyDecision.requiresApproval;
    const approvalId = requiresApproval ? `approval-agent-command-${requestId}` : undefined;

    const nextRequest: AgentCommandRequest = {
      id: requestId,
      origin: "agent_suggested_command",
      linkedAgentId: agentId ?? activeWorkflowTask.ownerAgentId ?? "agent-system",
      linkedTaskId: activeWorkflowTask.id,
      linkedChatId: chatSessionId,
      commandId: suggestion.id,
      rawCommand: suggestion.rawCommand,
      commandSource: suggestion.source,
      reason,
      intent: `agent_requested_${suggestion.category}`,
      safetyLevel: suggestion.runSafety,
      approvalRequirement: requiresApproval ? "required" : "not_required",
      executionState: requiresApproval ? "awaiting_approval" : "proposed",
      resultState: "none",
      linkedApprovalId: approvalId,
      requestedAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    dispatch({
      type: "set_workflow",
      workflow: {
        ...workflow,
        approvals: approvalId
          ? [
              ...workflow.approvals,
              {
                id: approvalId,
                category: "agent_command_execution",
                title: `Approve agent command: ${suggestion.displayName}`,
                reason: `${reason} (${suggestion.rawCommand})`,
                status: "pending",
                taskId: activeWorkflowTask.id,
                chatId: chatSessionId,
                agentId: nextRequest.linkedAgentId,
                requestedBy: "agent-command-orchestrator",
                requestedAtIso: nowIso,
                linkedAgentCommandRequestId: requestId,
              },
            ]
          : workflow.approvals,
        agentCommandRequests: [nextRequest, ...workflow.agentCommandRequests],
        activityEvents: [
          {
            id: `activity-agent-command-proposed-${requestId}`,
            type: "command_proposed",
            title: "Agent proposed command",
            details: `${suggestion.displayName}: ${suggestion.rawCommand}`,
            taskId: activeWorkflowTask.id,
            chatId: chatSessionId,
            agentId: nextRequest.linkedAgentId,
            severity: requiresApproval ? "warning" : "info",
            createdAtIso: nowIso,
          },
          ...workflow.activityEvents,
        ],
      },
    });

    if (!requiresApproval) {
      await executeAgentCommandRequest(requestId, true, nextRequest);
    }
  };

  const mapRunSafetyToTerminalClassification = (entry: ProjectCommandEntry): TerminalCommand["classification"] => {
    if (entry.runSafety === "safe") return "safe_read_only";
    if (entry.runSafety === "caution") return "modifying";
    return "risky";
  };

  const setCommandExecutionSnapshot = (commandId: string, execution: ProjectCommandExecutionRecord, pendingApprovalId?: string) => {
    setProjectCommandRegistry((prev) => ({
      ...prev,
      commands: prev.commands.map((entry) =>
        entry.id === commandId
          ? {
              ...entry,
              lastExecution: execution,
              pendingApprovalId,
            }
          : entry,
      ),
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const syncGitSnapshot = async () => {
      const snapshot = await gitService.getSnapshot();
      if (cancelled || snapshot.branch === "unknown") return;

      setRepository((prev) => ({
        ...prev,
        branch: snapshot.branch,
        clean: snapshot.clean,
        aheadBy: snapshot.aheadBy,
        behindBy: snapshot.behindBy,
        syncStatus: snapshot.behindBy > 0 ? "behind" : "up_to_date",
        lastValidatedAtIso: new Date().toISOString(),
      }));

      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          project: {
            ...localShellRef.current.project,
            gitBranch: snapshot.branch,
            hasLocalChanges: !snapshot.clean,
          },
        },
      });

      const updatedWorkflow: WorkflowState = {
        ...workflow,
        tasks: workflow.tasks.map((task) => {
          if (!task.github) return task;
          const isBoundToCurrentBranch =
            task.github.branch?.localBranchName === snapshot.branch || task.branchName === snapshot.branch;
          const lifecycle = snapshot.clean ? (snapshot.aheadBy > 0 ? "committed" : "branch_created") : "local_changes";
          const nextBranchName = task.github.branch?.localBranchName ?? task.branchName;
          const requiresWriteApproval = task.github.syncMode === "auto_commit" || task.github.syncMode === "auto_push";
          const hasDirtyChanges = !snapshot.clean && isBoundToCurrentBranch;

          return {
            ...task,
            github: {
              ...task.github,
              branchLifecycle: isBoundToCurrentBranch ? lifecycle : task.github.branchLifecycle,
              branch: isBoundToCurrentBranch
                ? snapshot.branchState
                : {
                    ...(task.github.branch ?? snapshot.branchState),
                    localBranchName: nextBranchName ?? task.github.branch?.localBranchName ?? snapshot.branch,
                  },
              commitSummary: isBoundToCurrentBranch
                ? snapshot.clean
                  ? "Working tree clean."
                  : `${snapshot.stagedSummary.filesChanged} changed file(s) on branch.`
                : `Task branch mismatch: on ${snapshot.branch}.`,
              commitWorkflow: {
                ...task.github.commitWorkflow,
                stagedChanges: isBoundToCurrentBranch
                  ? snapshot.stagedSummary
                  : {
                      ...task.github.commitWorkflow.stagedChanges,
                      hasUncommittedChanges: true,
                    },
              },
              pushWorkflow: {
                ...task.github.pushWorkflow,
                behindRemoteByCommits: isBoundToCurrentBranch ? snapshot.behindBy : task.github.pushWorkflow.behindRemoteByCommits,
                status:
                  task.github.pushWorkflow.status === "approval_required"
                    ? "approval_required"
                    : task.github.syncMode === "auto_push" && requiresWriteApproval && hasDirtyChanges
                      ? "approval_required"
                    : snapshot.aheadBy > 0
                      ? "ready"
                      : task.github.pushWorkflow.status,
                pendingError:
                  task.github.syncMode === "auto_push" && hasDirtyChanges
                    ? "Auto-push requested, awaiting approval checkpoint."
                    : task.github.pushWorkflow.pendingError,
              },
            },
            branchName: isBoundToCurrentBranch ? snapshot.branch : task.branchName,
          };
        }),
        github: {
          ...workflow.github,
          repositories: workflow.github.repositories.map((repo) =>
            repo.id === workflow.github.activeRepositoryId
              ? { ...repo, state: "connected", lastSyncAtIso: new Date().toISOString(), lastError: undefined }
              : repo,
          ),
        },
      };

      const activeTaskForSync =
        workflow.tasks.find((task) => task.linkedChatSessionId === currentChatSessionId) ?? workflow.tasks[0];
      const activeTaskChanged =
        activeTaskForSync?.github?.branch?.localBranchName !== snapshot.branch ||
        activeTaskForSync?.github?.commitWorkflow.stagedChanges.filesChanged !== snapshot.stagedSummary.filesChanged ||
        activeTaskForSync?.github?.pushWorkflow.behindRemoteByCommits !== snapshot.behindBy;

      if (activeTaskChanged) {
        dispatch({ type: "set_workflow", workflow: updatedWorkflow });
      }
    };

    void syncGitSnapshot();
    const timer = setInterval(() => void syncGitSnapshot(), 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentChatSessionId, gitService, workflow]);

  useEffect(() => {
    let cancelled = false;

    const syncOllamaRuntime = async () => {
      await refreshLocalInference();
      if (cancelled) return;
    };

    void syncOllamaRuntime();
    const timer = setInterval(() => void syncOllamaRuntime(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return {
    chatState,
    workspaceState,
    chatContexts,
    setConversationType: (chatType: ChatType) => dispatch({ type: "set_active_chat_type", chatType }),
    setDraft: (sessionId: string, value: string) => dispatch({ type: "update_draft", sessionId, value }),
    clearApproval: (sessionId: string) => dispatch({ type: "clear_approval", sessionId }),
    approveWorkflowApproval: async (approvalId: string) => {
      dispatch({ type: "approve_workflow_approval", approvalId });
      const approval = workflow.approvals.find((entry) => entry.id === approvalId);
      if (approval?.linkedAgentCommandRequestId) {
        await executeAgentCommandRequest(approval.linkedAgentCommandRequestId, true);
      }
      const pendingLaunch = pendingCommandLaunchByApprovalId[approvalId];
      if (!pendingLaunch) return;

      setPendingCommandLaunchByApprovalId((prev) => {
        const next = { ...prev };
        delete next[approvalId];
        return next;
      });

      const commandEntry = projectCommandRegistry.commands.find((entry) => entry.id === pendingLaunch.commandId);
      if (!commandEntry) return;

      const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
        workingDirectory: commandEntry.workingDirectory || localShellRef.current.project.activeProjectRoot,
        linkedTaskId: pendingLaunch.taskId,
        linkedChatSessionId: pendingLaunch.chatId,
      });
      terminalService.selectSession(activeTerminal.id);

      const terminalResult = await terminalService.execute(activeTerminal.id, {
        command: commandEntry.rawCommand,
        source: commandEntry.source,
        sourceCommandId: commandEntry.id,
        sourceCategory: commandEntry.category,
        linkedProjectId: pendingLaunch.projectId,
        cwd: commandEntry.workingDirectory || localShellRef.current.project.activeProjectRoot,
        linkedTaskId: pendingLaunch.taskId,
        linkedChatSessionId: pendingLaunch.chatId,
        approved: true,
        classificationHint: mapRunSafetyToTerminalClassification(commandEntry),
        forceApproval: false,
      });

      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          terminal: terminalService.getSessionState(),
        },
      });
      appendTerminalMessage(terminalResult.command);

      setCommandExecutionSnapshot(commandEntry.id, {
        executionId: terminalResult.command.id,
        commandId: commandEntry.id,
        rawCommand: commandEntry.rawCommand,
        source: commandEntry.source,
        launchTimestampIso: terminalResult.command.launchedAtIso ?? new Date().toISOString(),
        workingDirectory: terminalResult.command.cwd,
        projectId: pendingLaunch.projectId,
        linkedTaskId: pendingLaunch.taskId,
        linkedChatSessionId: pendingLaunch.chatId,
        status: terminalResult.command.state === "completed" ? "completed" : terminalResult.command.state === "failed" ? "failed" : "running",
        approvalState: "approved",
        exitCode: terminalResult.command.exitCode,
        failureReason: terminalResult.command.failureReason,
      });

      const latestWorkflow = workflowRef.current;
      dispatch({
        type: "set_workflow",
        workflow: {
          ...latestWorkflow,
          activityEvents: [
            {
              id: `activity-project-command-${terminalResult.command.id}`,
              type: terminalResult.command.state === "completed" ? "execution_update" : "failed",
              title: terminalResult.command.state === "completed" ? "Project command completed after approval" : "Project command failed after approval",
              details: commandEntry.rawCommand,
              severity: terminalResult.command.state === "completed" ? "info" : "critical",
              taskId: pendingLaunch.taskId,
              chatId: pendingLaunch.chatId,
              createdAtIso: new Date().toISOString(),
            },
            ...latestWorkflow.activityEvents,
          ],
        },
      });
    },
    runProjectCommand: async (commandId: string) => {
      const commandEntry = projectCommandRegistry.commands.find((entry) => entry.id === commandId);
      const activeProject = projects.find((project) => project.id === activeProjectId);
      const projectId = activeProject?.id ?? activeProjectId;
      const linkedTaskId = activeWorkflowTask?.id;
      const linkedChatSessionId = currentChatSessionId;

      if (!commandEntry) {
        return { ok: false, code: "command_missing", message: "Command not found in project registry." };
      }
      if (commandEntry.availability === "invalid" || commandEntry.availability === "unavailable") {
        return { ok: false, code: "command_unavailable", message: "Command is unavailable for the active project." };
      }

      const cwd = commandEntry.workingDirectory || activeProject?.projectRoot || localShellRef.current.project.activeProjectRoot;
      const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
        workingDirectory: cwd,
        linkedTaskId,
        linkedChatSessionId,
      });
      terminalService.selectSession(activeTerminal.id);
      terminalService.setWorkingDirectory(activeTerminal.id, cwd);

      const policyDecision = evaluatePolicy({
        actionType: commandEntry.runSafety === "safe" ? "safe_command_execution" : "risky_command_execution",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "command", id: commandEntry.id, label: commandEntry.displayName },
        commandSafetyLevel: commandEntry.runSafety,
        metadata: { category: commandEntry.category },
      });
      if (policyDecision.blocked) {
        return { ok: false, code: "policy_blocked", message: policyDecision.rationale };
      }
      const requiresApproval = policyDecision.requiresApproval;
      if (requiresApproval) {
        const approvalId = `approval-project-command-${commandEntry.id}-${Date.now()}`;
        setPendingCommandLaunchByApprovalId((prev) => ({
          ...prev,
          [approvalId]: {
            commandId: commandEntry.id,
            taskId: linkedTaskId,
            chatId: linkedChatSessionId,
            projectId,
          },
        }));
        setCommandExecutionSnapshot(commandEntry.id, {
          executionId: approvalId,
          commandId: commandEntry.id,
          rawCommand: commandEntry.rawCommand,
          source: commandEntry.source,
          launchTimestampIso: new Date().toISOString(),
          workingDirectory: cwd,
          projectId,
          linkedTaskId,
          linkedChatSessionId,
          status: "approval_required",
          approvalState: "pending",
        }, approvalId);

        const latestWorkflow = workflowRef.current;
        dispatch({
          type: "set_workflow",
          workflow: {
            ...latestWorkflow,
            approvals: [
              ...latestWorkflow.approvals,
              {
                id: approvalId,
                category: policyDecision.linkedApprovalRequirement?.approvalCategory ?? (commandEntry.category === "release" ? "production_deploy_approval" : "destructive_file_operations"),
                title: `Approve ${commandEntry.displayName} command`,
                reason: policyDecision.rationale,
                status: "pending",
                taskId: linkedTaskId,
                chatId: linkedChatSessionId,
                requestedBy: "project-command-registry",
                requestedAtIso: new Date().toISOString(),
              },
            ],
            activityEvents: [
              {
                id: `activity-${approvalId}`,
                type: "waiting_for_approval",
                title: "Project command awaiting approval",
                details: commandEntry.rawCommand,
                severity: "warning",
                taskId: linkedTaskId,
                chatId: linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...latestWorkflow.activityEvents,
            ],
          },
        });

        return { ok: false, code: "approval_required", message: "Approval required before running this project command.", approvalId };
      }

      const terminalResult = await terminalService.execute(activeTerminal.id, {
        command: commandEntry.rawCommand,
        source: commandEntry.source,
        sourceCommandId: commandEntry.id,
        sourceCategory: commandEntry.category,
        linkedProjectId: projectId,
        cwd,
        linkedTaskId,
        linkedChatSessionId,
        approved: true,
        classificationHint: mapRunSafetyToTerminalClassification(commandEntry),
        forceApproval: false,
      });

      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          terminal: terminalService.getSessionState(),
        },
      });
      appendTerminalMessage(terminalResult.command);

      setCommandExecutionSnapshot(commandEntry.id, {
        executionId: terminalResult.command.id,
        commandId: commandEntry.id,
        rawCommand: commandEntry.rawCommand,
        source: commandEntry.source,
        launchTimestampIso: terminalResult.command.launchedAtIso ?? new Date().toISOString(),
        workingDirectory: terminalResult.command.cwd,
        projectId,
        linkedTaskId,
        linkedChatSessionId,
        status: terminalResult.command.state === "completed" ? "completed" : terminalResult.command.state === "failed" ? "failed" : "running",
        approvalState: "not_required",
        exitCode: terminalResult.command.exitCode,
        failureReason: terminalResult.command.failureReason,
      });

      const latestWorkflow = workflowRef.current;
      dispatch({
        type: "set_workflow",
        workflow: {
          ...latestWorkflow,
          activityEvents: [
            {
              id: `activity-project-command-${terminalResult.command.id}`,
              type: terminalResult.command.state === "completed" ? "execution_update" : "failed",
              title: terminalResult.command.state === "completed" ? "Project command completed" : "Project command failed",
              details: commandEntry.rawCommand,
              severity: terminalResult.command.state === "completed" ? "info" : "critical",
              taskId: linkedTaskId,
              chatId: linkedChatSessionId,
              createdAtIso: new Date().toISOString(),
            },
            ...latestWorkflow.activityEvents,
          ],
        },
      });

      return {
        ok: terminalResult.command.state === "completed",
        code: terminalResult.command.state === "completed" ? "executed" : terminalResult.command.failureReason ?? "execution_failure",
        message: terminalResult.command.state === "completed" ? "Project command executed." : "Project command failed.",
      };
    },
    runProjectCommandCategory: async (category: "dev" | "build" | "test" | "lint" | "typecheck") => {
      const matches = projectCommandRegistry.commands.filter(
        (entry) => entry.category === category && entry.availability !== "invalid" && entry.availability !== "unavailable",
      );
      if (matches.length === 0) return { ok: false, code: "command_unavailable", message: `No ${category} command available for this project.` };

      const preferred = matches.find((entry) => entry.isPrimaryWorkflow) ?? matches[0];
      const hasConflicts = matches.length > 1 && !matches.some((entry) => entry.isPrimaryWorkflow);
      if (hasConflicts) {
        return { ok: false, code: "conflicting_choices", message: `Multiple ${category} commands found. Pick a specific command from the registry list.` };
      }
      if (!preferred) return { ok: false, code: "command_missing", message: "Command missing." };

      const activeProject = projects.find((project) => project.id === activeProjectId);
      const projectId = activeProject?.id ?? activeProjectId;
      const linkedTaskId = activeWorkflowTask?.id;
      const linkedChatSessionId = currentChatSessionId;
      const cwd = preferred.workingDirectory || activeProject?.projectRoot || localShellRef.current.project.activeProjectRoot;
      const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
        workingDirectory: cwd,
        linkedTaskId,
        linkedChatSessionId,
      });
      terminalService.selectSession(activeTerminal.id);
      terminalService.setWorkingDirectory(activeTerminal.id, cwd);

      const policyDecision = evaluatePolicy({
        actionType: preferred.runSafety === "safe" ? "safe_command_execution" : "risky_command_execution",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "command", id: preferred.id, label: preferred.displayName },
        commandSafetyLevel: preferred.runSafety,
        metadata: { category: preferred.category },
      });
      if (policyDecision.blocked) {
        return { ok: false, code: "policy_blocked", message: policyDecision.rationale };
      }
      const requiresApproval = policyDecision.requiresApproval;
      if (requiresApproval) {
        const approvalId = `approval-project-command-${preferred.id}-${Date.now()}`;
        setPendingCommandLaunchByApprovalId((prev) => ({
          ...prev,
          [approvalId]: { commandId: preferred.id, taskId: linkedTaskId, chatId: linkedChatSessionId, projectId },
        }));
        setCommandExecutionSnapshot(preferred.id, {
          executionId: approvalId,
          commandId: preferred.id,
          rawCommand: preferred.rawCommand,
          source: preferred.source,
          launchTimestampIso: new Date().toISOString(),
          workingDirectory: cwd,
          projectId,
          linkedTaskId,
          linkedChatSessionId,
          status: "approval_required",
          approvalState: "pending",
        }, approvalId);
        const latestWorkflow = workflowRef.current;
        dispatch({
          type: "set_workflow",
          workflow: {
            ...latestWorkflow,
            approvals: [
              ...latestWorkflow.approvals,
              {
                id: approvalId,
                category: policyDecision.linkedApprovalRequirement?.approvalCategory ?? (preferred.category === "release" ? "production_deploy_approval" : "destructive_file_operations"),
                title: `Approve ${preferred.displayName} command`,
                reason: policyDecision.rationale,
                status: "pending",
                taskId: linkedTaskId,
                chatId: linkedChatSessionId,
                requestedBy: "project-command-registry",
                requestedAtIso: new Date().toISOString(),
              },
            ],
            activityEvents: [
              {
                id: `activity-${approvalId}`,
                type: "waiting_for_approval",
                title: "Project command awaiting approval",
                details: preferred.rawCommand,
                severity: "warning",
                taskId: linkedTaskId,
                chatId: linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...latestWorkflow.activityEvents,
            ],
          },
        });
        return { ok: false, code: "approval_required", message: "Approval required before running this project command.", approvalId };
      }

      const terminalResult = await terminalService.execute(activeTerminal.id, {
        command: preferred.rawCommand,
        source: preferred.source,
        sourceCommandId: preferred.id,
        sourceCategory: preferred.category,
        linkedProjectId: projectId,
        cwd,
        linkedTaskId,
        linkedChatSessionId,
        approved: true,
        classificationHint: mapRunSafetyToTerminalClassification(preferred),
        forceApproval: false,
      });
      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          terminal: terminalService.getSessionState(),
        },
      });
      appendTerminalMessage(terminalResult.command);
      setCommandExecutionSnapshot(preferred.id, {
        executionId: terminalResult.command.id,
        commandId: preferred.id,
        rawCommand: preferred.rawCommand,
        source: preferred.source,
        launchTimestampIso: terminalResult.command.launchedAtIso ?? new Date().toISOString(),
        workingDirectory: terminalResult.command.cwd,
        projectId,
        linkedTaskId,
        linkedChatSessionId,
        status: terminalResult.command.state === "completed" ? "completed" : terminalResult.command.state === "failed" ? "failed" : "running",
        approvalState: "not_required",
        exitCode: terminalResult.command.exitCode,
        failureReason: terminalResult.command.failureReason,
      });
      return {
        ok: terminalResult.command.state === "completed",
        code: terminalResult.command.state === "completed" ? "executed" : terminalResult.command.failureReason ?? "execution_failure",
        message: terminalResult.command.state === "completed" ? "Project command executed." : "Project command failed.",
      };
    },
    setProviderSource: (nextSource: "openrouter" | "ollama") => {
      const providerDecision = evaluatePolicy({
        actionType: "provider_model_switch",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "provider", id: nextSource, label: nextSource },
        metadata: { nextProvider: nextSource },
      });
      if (providerDecision.blocked) return;
      setProviderSource(nextSource);
      const nextModel = lastUsedModelByProvider[nextSource];
      setActiveModel(nextModel);
      setProjects((prev) =>
        prev.map((project) =>
          project.id === activeProjectId
            ? {
                ...project,
                provider: {
                  connected: true,
                  source: nextSource,
                },
              }
            : project,
        ),
      );
      const providerLabel = nextSource === "ollama" ? "Ollama" : "OpenRouter";
      const backend = deploymentMode === "hybrid" ? "hybrid" : deploymentMode;
      dispatch({
        type: "set_chat",
        chat: {
          ...chatState,
          sessions: chatState.sessions.map((session) =>
            session.id === currentChatSessionId
              ? {
                  ...session,
                  providerMeta: {
                    ...session.providerMeta,
                    provider: providerLabel,
                    model: nextModel,
                    backend,
                    routingKey: routingProfile,
                  },
                }
              : session,
          ),
        },
      });
    },
    setActiveModel: (nextModel: string) => {
      const modelDecision = evaluatePolicy({
        actionType: providerSource === "openrouter" ? "cloud_execution" : "local_only_execution",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "provider", id: nextModel, label: nextModel },
      });
      if (modelDecision.blocked) return;
      setActiveModel(nextModel);
      setLastUsedModelByProvider((prev) => ({
        ...prev,
        [providerSource]: nextModel,
      }));
      dispatch({
        type: "set_chat",
        chat: {
          ...chatState,
          sessions: chatState.sessions.map((session) =>
            session.id === currentChatSessionId
              ? {
                  ...session,
                  providerMeta: {
                    ...session.providerMeta,
                    model: nextModel,
                  },
                }
              : session,
          ),
        },
      });
    },
    setDeploymentMode: (nextMode: "local" | "cloud" | "hybrid") => {
      const modeDecision = evaluatePolicy({
        actionType: nextMode === "local" ? "local_only_execution" : "cloud_execution",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "provider", id: nextMode, label: nextMode },
      });
      if (modeDecision.blocked) return;
      setDeploymentMode(nextMode);
      dispatch({
        type: "set_chat",
        chat: {
          ...chatState,
          sessions: chatState.sessions.map((session) =>
            session.id === currentChatSessionId
              ? {
                  ...session,
                  providerMeta: {
                    ...session.providerMeta,
                    backend: nextMode === "hybrid" ? "hybrid" : nextMode,
                  },
                }
              : session,
          ),
        },
      });
    },
    setRoutingProfile: (nextProfile: AppRoutingModeProfile) => {
      const mappedRoutingMode = mapProfileToRoutingMode(nextProfile);
      setRoutingProfile(nextProfile);
      dispatch({
        type: "set_local_inference",
        localInference: {
          ...localInference,
          routing: {
            ...localInference.routing,
            appModeProfile: nextProfile,
            conversationOverrides: {
              ...localInference.routing.conversationOverrides,
              [currentChatSessionId]: mappedRoutingMode,
            },
          },
        },
      });
      dispatch({
        type: "set_chat",
        chat: {
          ...chatState,
          sessions: chatState.sessions.map((session) =>
            session.id === currentChatSessionId
              ? {
                  ...session,
                  providerMeta: {
                    ...session.providerMeta,
                    routingKey: nextProfile,
                  },
                }
              : session,
          ),
        },
      });
    },
    addLocalProject: async (payload?: { name?: string; localPath?: string; projectRoot?: string }): Promise<AddLocalProjectResult> => {
      const selectedPath = payload?.localPath?.trim() ? payload.localPath.trim() : undefined;

      let resolvedPath = selectedPath;
      let inferredName = payload?.name?.trim();
      if (!resolvedPath) {
        const pickedPath = await selectLocalProjectPath();
        if (pickedPath.status === "cancelled") {
          return { ok: false, code: "selection_cancelled", message: pickedPath.message || "Project selection cancelled." };
        }
        if (pickedPath.status === "error" || !pickedPath.path) {
          return { ok: false, code: "inaccessible_path", message: pickedPath.message || "Unable to select a local path." };
        }
        resolvedPath = pickedPath.path;
        inferredName = inferredName || pickedPath.inferredName;
      }

      const validation = await validateLocalProjectPath(resolvedPath);
      if (validation.code !== "ok") {
        return { ok: false, code: validation.code, message: validation.message, path: validation.normalizedPath };
      }

      const normalizedPath = validation.normalizedPath || resolvedPath;
      const existingPaths = projects.map((project) => project.localPath || project.projectRoot).filter(Boolean) as string[];
      if (hasDuplicateLocalPath(normalizedPath, existingPaths)) {
        return { ok: false, code: "duplicate_path", message: "This local project path is already added.", path: normalizedPath };
      }

      const id = `project-local-${Date.now()}`;
      const nextName = inferredName || validation.inferredName || "Local Project";
      const branch = localShellRef.current.project.gitBranch || "main";

      setProjects((prev) => [
        {
          id,
          name: nextName,
          description: "Local project connected from this machine",
          projectType: "local",
          source: "local",
          localPath: normalizedPath,
          projectRoot: payload?.projectRoot || normalizedPath,
          branch,
          status: "active",
          repository: {
            connected: false,
            syncStatus: "idle",
          },
          provider: {
            connected: true,
            source: providerSource,
          },
          instructions: {
            status: validation.hasAgentsInstructions ? "found" : "not_found",
          },
        },
        ...prev.map((project) => ({ ...project, status: "idle" as const })),
      ]);
      setActiveProjectId(id);
      setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
      setProjectScopedStateById((prev) => ({
        ...prev,
        [id]: buildProjectScopedState(id, nextName, payload?.projectRoot || normalizedPath, providerSource),
      }));
      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          project: {
            ...localShellRef.current.project,
            workspaceName: nextName,
            activeProjectRoot: normalizedPath,
            projectInstructionsDetected: Boolean(validation.hasAgentsInstructions),
            commandRegistryLoaded: false,
            commandRegistryUpdatedAtIso: undefined,
            runtimeResourcesAvailable: true,
          },
        },
      });

      return {
        ok: true,
        code: "added",
        message: "Local project added and activated.",
        path: normalizedPath,
        projectId: id,
        projectName: nextName,
        hasGitRepository: validation.hasGitRepository,
        hasAgentsInstructions: validation.hasAgentsInstructions,
      };
    },
    createProject: (payload: { name: string; description?: string; projectType?: string }) => {
      const id = `project-manual-${Date.now()}`;
      setProjects((prev) => [
        {
          id,
          name: payload.name,
          description: payload.description || "New project",
          projectType: payload.projectType || "general",
          source: "manual",
          branch: "main",
          status: "active",
          repository: {
            connected: false,
            syncStatus: "idle",
          },
          provider: {
            connected: true,
            source: providerSource,
          },
          instructions: {
            status: "not_found",
          },
        },
        ...prev.map((project) => ({ ...project, status: "idle" as const })),
      ]);
      setActiveProjectId(id);
      setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
      setProjectScopedStateById((prev) => ({
        ...prev,
        [id]: buildProjectScopedState(id, payload.name, `manual://${id}`, providerSource),
      }));
    },
    connectRepository: async (payload: { pathOrUrl: string; name?: string; branch?: string }) => {
      const activeProject = projects.find((project) => project.id === activeProjectId);
      const validation = await validateRepositoryConnection({
        pathOrUrl: payload.pathOrUrl,
        activeProject: activeProject
          ? {
              id: activeProject.id,
              name: activeProject.name,
              projectRoot: activeProject.projectRoot ?? activeProject.localPath,
              repositoryConnected: Boolean(activeProject.repository?.connected),
            }
          : undefined,
        connectedRepoRoots: projects
          .map((project) => (project.repository?.connected ? (project.projectRoot ?? project.localPath) : undefined))
          .filter((entry): entry is string => Boolean(entry)),
      });

      if (validation.code !== "ok" || !validation.metadata || !activeProject) {
        return { ok: false, code: validation.code, message: validation.message };
      }

      const nextRepository: WorkspaceRepositoryState = {
        connected: true,
        url: validation.metadata.remoteUrl ?? validation.metadata.rootPath,
        rootPath: validation.metadata.rootPath,
        name: payload.name || validation.metadata.name,
        branch: payload.branch || validation.metadata.branch,
        source: validation.source,
        syncStatus: "up_to_date",
        connectionState: "connected",
        clean: validation.metadata.clean,
        aheadBy: validation.metadata.aheadBy,
        behindBy: validation.metadata.behindBy,
        relationToProject: "bound",
        readyForGitWorkflow: true,
        lastValidatedAtIso: new Date().toISOString(),
      };

      setRepository(nextRepository);
      setProjects((prev) =>
        prev.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                source: "git",
                projectRoot: validation.metadata?.rootPath ?? project.projectRoot,
                localPath: validation.metadata?.rootPath ?? project.localPath,
                branch: nextRepository.branch || project.branch,
                repository: {
                  connected: true,
                  name: nextRepository.name,
                  url: nextRepository.url,
                  branch: nextRepository.branch,
                  syncStatus: nextRepository.syncStatus,
                },
              }
            : project,
        ),
      );

      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          project: {
            ...localShellRef.current.project,
            workspaceName: activeProject.name,
            activeProjectRoot: validation.metadata.rootPath,
            commandRegistryLoaded: false,
            commandRegistryUpdatedAtIso: undefined,
            gitBranch: nextRepository.branch ?? localShellRef.current.project.gitBranch,
            hasLocalChanges: !validation.metadata.clean,
          },
        },
      });

      return { ok: true, code: "ok", message: validation.message };
    },
    disconnectRepository: () => {
      setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
      setProjects((prev) =>
        prev.map((project) =>
          project.id === activeProjectId
            ? {
                ...project,
                repository: { connected: false, syncStatus: "idle" },
              }
            : project,
        ),
      );
    },
    setActiveProject: (projectId: string) => {
      syncProjectScopedSnapshot(activeProjectId);
      const selectedProject = projects.find((project) => project.id === projectId);
      const projectRoot = selectedProject?.localPath || selectedProject?.projectRoot || localShellRef.current.project.activeProjectRoot;
      const scopedState =
        projectScopedStateById[projectId] ??
        buildProjectScopedState(projectId, selectedProject?.name ?? "Project", projectRoot, selectedProject?.provider?.source ?? "ollama");

      dispatch({
        type: "set_all_state",
        payload: {
          chat: cloneSnapshot(scopedState.chat),
          workflow: cloneSnapshot(scopedState.workflow),
          localInference: cloneSnapshot(scopedState.localInference),
          localShell: cloneSnapshot(scopedState.localShell),
          browserSession: cloneSnapshot(scopedState.browserSession),
          evidenceFlow: cloneSnapshot(scopedState.evidenceFlow),
        },
      });
      setProviderSource(scopedState.providerSource);
      setDeploymentMode(scopedState.deploymentMode);
      setActiveModel(scopedState.activeModel);
      setRoutingProfile(scopedState.routingProfile);
      setRepository(cloneSnapshot(scopedState.repository));
      setProjectCommandRegistry(cloneSnapshot(scopedState.projectCommandRegistry));
      setPendingCommandLaunchByApprovalId(cloneSnapshot(scopedState.pendingCommandLaunchByApprovalId));
      setPolicyState(cloneSnapshot(scopedState.policyState));
      setRoutingDecisionsBySession(cloneSnapshot(scopedState.routingDecisionsBySession));
      setLastUsedModelByProvider(cloneSnapshot(scopedState.lastUsedModelByProvider));

      setActiveProjectId(projectId);
      setProjects((prev) => prev.map((project) => ({ ...project, status: project.id === projectId ? "active" : "idle" })));
      if (selectedProject?.source === "local" && (selectedProject.localPath || selectedProject.projectRoot)) {
        const nextPath = selectedProject.localPath || selectedProject.projectRoot || localShellRef.current.project.activeProjectRoot;
        dispatch({
          type: "set_local_shell",
          localShell: {
            ...localShellRef.current,
            project: {
              ...localShellRef.current.project,
              workspaceName: selectedProject.name,
              activeProjectRoot: nextPath,
              commandRegistryLoaded: false,
              commandRegistryUpdatedAtIso: undefined,
            },
          },
        });
      }
      setProjectScopedStateById((prev) => ({
        ...prev,
        [projectId]: scopedState,
      }));
    },
    sendMessage: (chatType: ChatType) => {
      const currentChat = chatStateRef.current;
      const sessionId = currentChat.selectedSessionIdByType[chatType];
      const draft = (currentChat.draftInputBySessionId[sessionId] ?? "").trim();
      if (!draft) return;

      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const responseId = `resp-${now + 1}`;
      const userMessage = {
        id: `user-${now}`,
        sessionId,
        role: "user" as const,
        content: draft,
        createdAtIso: nowIso,
        status: "completed" as const,
      };

      const activeSession = currentChat.sessions.find((session) => session.id === sessionId);
      const activeAgent = workspaceState.activeAgents.find((agent) => agent.id === workspaceState.activeAgentId);
      const linkedTask =
        workflowRef.current.tasks.find((task) => task.linkedChatSessionId === sessionId) ??
        workflowRef.current.tasks.find((task) => task.id === activeSession?.linked.taskId) ??
        workflowRef.current.tasks[0];
      const releaseCritical = Boolean(linkedTask?.phase === "release" || linkedTask?.github?.pullRequest?.releaseGateReadiness === "blocked");
      const budgetDecision = evaluateBudgetGuardrails({
        runEstimateUsd: routingProfile === "quality_first" ? 0.12 : 0.04,
        modeProfile: routingProfile,
        releaseCritical,
        buckets: [
          { scope: "run", scopeId: sessionId, spentUsd: 0, guardrails: { softLimitUsd: 0.5, hardLimitUsd: 1.2, warnBeforeRunUsd: 0.35, stopOrFallbackUsd: 0.8 } },
          { scope: "task", scopeId: linkedTask?.id ?? "unknown-task", spentUsd: 0.72, guardrails: { softLimitUsd: 2.5, hardLimitUsd: 4, warnBeforeRunUsd: 2, stopOrFallbackUsd: 3 } },
          { scope: "project", scopeId: activeProjectId, spentUsd: 6.4, guardrails: { softLimitUsd: 14, hardLimitUsd: 20, warnBeforeRunUsd: 12, stopOrFallbackUsd: 16 } },
        ],
      });

      if (!budgetDecision.allowRun) {
        const blockedMessage = {
          id: responseId,
          sessionId,
          role: "system" as const,
          authorLabel: "Operator Guardrail",
          content: budgetDecision.blockReason ?? "Execution blocked by guardrails.",
          createdAtIso: nowIso,
          status: "failed" as const,
        };
        dispatch({
          type: "set_chat",
          chat: {
            ...currentChat,
            messagesBySessionId: {
              ...currentChat.messagesBySessionId,
              [sessionId]: [...(currentChat.messagesBySessionId[sessionId] ?? []), userMessage, blockedMessage],
            },
            draftInputBySessionId: {
              ...currentChat.draftInputBySessionId,
              [sessionId]: "",
            },
          },
        });
        dispatch({
          type: "set_local_inference",
          localInference: {
            ...localInferenceRef.current,
            operational: {
              ...localInferenceRef.current.operational,
              blockedExpensiveRuns: localInferenceRef.current.operational.blockedExpensiveRuns + 1,
              budgetPressure: budgetDecision.pressure,
            },
          },
        });
        return;
      }

      const routingDecision = buildRuntimeRoutingDecision(chatType, sessionId, activeSession?.linked.agentId ?? activeWorkflowTask?.ownerAgentId);
      const selectedProviderLabel = routingDecision.selectedProvider === "openrouter" ? "OpenRouter" : "Ollama";
      const selectedProviderModel =
        localInference.hybridModelRegistry.find((entry) => entry.id === routingDecision.selectedModelId)?.providerModelId ?? activeModel;
      setRoutingDecisionsBySession((prev) => ({ ...prev, [sessionId]: routingDecision }));
      dispatch({
        type: "set_local_inference",
        localInference: {
          ...localInferenceRef.current,
          routing: {
            ...localInferenceRef.current.routing,
            runtimeDecisionsBySurface: {
              ...(localInferenceRef.current.routing.runtimeDecisionsBySurface ?? {}),
              [`${chatType}:${sessionId}`]: routingDecision,
            },
          },
        },
      });
      const chatContextPacket: ContextInjectionPacket =
        chatType === "main"
          ? workspaceState.contextPackets.mainChat
          : chatType === "agent"
            ? workspaceState.contextPackets.agentChat
            : chatType === "audit"
              ? workspaceState.contextPackets.auditChat
              : workspaceState.contextPackets.reviewChat;
      const turnIndex = (currentChat.messagesBySessionId[sessionId] ?? []).length;
      const mockResponse = createMockAssistantMessage({
        chatType,
        prompt: draft,
        currentProject: workspaceState.currentProject,
        currentTask: workspaceState.currentTask,
        activeProvider: selectedProviderLabel,
        activeModel: selectedProviderModel,
        routingMode: workspaceState.routingMode,
        routingProfile: routingDecision.profile,
        deploymentMode,
        activeAgent,
        linkedContext: activeSession?.linked,
        turnIndex,
        contextPacket: chatContextPacket,
      });

      const pendingResponse = {
        id: responseId,
        sessionId,
        role: mockResponse.role,
        authorLabel: mockResponse.authorLabel,
        content:
          routingDecision.selectedProvider === "openrouter" && chatType === "main"
            ? "Sending request to OpenRouter…"
            : routingDecision.selectedProvider === "ollama"
              ? "Routing to local model…"
              : "Working on it…",
        createdAtIso: new Date(now + 250).toISOString(),
        status: "pending" as const,
        liveState: "preparing" as const,
        phaseLabel: "Building context",
        linked: mockResponse.linked,
        providerMeta: {
          ...mockResponse.providerMeta,
          provider: selectedProviderLabel,
          model: selectedProviderModel,
          backend: routingDecision.deploymentTarget,
          routingKey: `${routingDecision.profile}${routingDecision.usedFallback ? " • fallback" : ""}`,
        },
      };

      dispatch({
        type: "set_chat",
        chat: {
          ...currentChat,
          messagesBySessionId: {
            ...currentChat.messagesBySessionId,
            [sessionId]: [...(currentChat.messagesBySessionId[sessionId] ?? []), userMessage, pendingResponse],
          },
          sessions: currentChat.sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  lastMessageAtIso: pendingResponse.createdAtIso,
                  providerMeta: pendingResponse.providerMeta ?? session.providerMeta,
                  linked: {
                    ...session.linked,
                    taskTitle: workspaceState.currentTask,
                    agentId: workspaceState.activeAgentId ?? session.linked.agentId,
                    agentName: activeAgent?.name ?? session.linked.agentName,
                  },
                }
              : session,
          ),
          draftInputBySessionId: {
            ...currentChat.draftInputBySessionId,
            [sessionId]: "",
          },
        },
      });
      dispatch({
        type: "set_local_inference",
        localInference: {
          ...localInferenceRef.current,
          operational: {
            ...localInferenceRef.current.operational,
            budgetPressure: budgetDecision.pressure,
            degradedMode: localInferenceRef.current.operational.degradedMode || budgetDecision.pressure === "critical",
          },
        },
      });
      const runId = `run-${sessionId}-${now}`;
      const trace = createExecutionTrace({
        runId,
        nowIso,
        taskId: linkedTask?.id,
        chatId: sessionId,
        agentId: activeSession?.linked.agentId ?? linkedTask?.ownerAgentId,
        provider: selectedProviderLabel,
        model: selectedProviderModel,
        routingDecision,
        evidenceIds: linkedTask?.linkedEvidenceIds ?? [],
      });
      const traceId = trace.traceId;
      pendingResponse.linked = {
        ...pendingResponse.linked,
        executionContextId: traceId,
      };
      const tracedWorkflow = appendExecutionTraceStep(
        {
          ...workflowRef.current,
          executionTraces: [trace, ...workflowRef.current.executionTraces],
        },
        {
          traceId,
          nowIso,
          type: "context_built",
          title: "Context built",
          details: budgetDecision.warning ? `${chatContextPacket.summary} • ${budgetDecision.warning}` : chatContextPacket.summary,
          phaseLabel: "Building context",
          liveState: "preparing",
          nextStatus: "in_progress",
        },
      );
      dispatch({
        type: "set_workflow",
        workflow: appendExecutionTraceStep(tracedWorkflow, {
          traceId,
          nowIso: new Date().toISOString(),
          type: "routing_selected",
          title: "Routing selected",
          details: `${routingDecision.reason} • budget:${budgetDecision.pressure} • degraded:${localInference.operational.degradedMode ? "yes" : "no"}`,
          phaseLabel: "Choosing model/provider",
          liveState: "preparing",
          provider: selectedProviderLabel,
          model: selectedProviderModel,
          nextStatus: "waiting_provider",
        }),
      });

      if (chatType === "main") {
        const orchestration = runMainChatOrchestrator({
          message: draft,
          sessionId,
          chatId: sessionId,
          workflow: workflowRef.current,
          agents: workspaceState.activeAgents,
          nowIso: new Date().toISOString(),
          contextPacket: workspaceState.contextPackets.mainChat,
        });

        if (orchestration.handled) {
          const completionIso = new Date().toISOString();
          dispatch({
            type: "set_workflow",
            workflow: completeExecutionTrace(
              appendExecutionTraceStep(orchestration.updatedWorkflow, {
                traceId,
                nowIso: completionIso,
                type: "run_completed",
                title: "Orchestration completed",
                details: "Main orchestrator handled request and updated workflow graph.",
                phaseLabel: "Finalizing result",
                liveState: "completed",
                provider: selectedProviderLabel,
                model: selectedProviderModel,
                nextStatus: "completed",
              }),
              traceId,
              {
                nowIso: completionIso,
                outcome: "success",
                usage: {
                  executionLocation: "hybrid",
                  executionWeight: "standard",
                },
              },
            ),
          });

          const latestChat = chatStateRef.current;
          const sessionMessages = latestChat.messagesBySessionId[sessionId] ?? [];
          const updatedTask = orchestration.updatedWorkflow.tasks[0];

          dispatch({
            type: "set_chat",
            chat: {
              ...latestChat,
              messagesBySessionId: {
                ...latestChat.messagesBySessionId,
                [sessionId]: sessionMessages.map((message) =>
                  message.id === responseId
                    ? {
                        ...message,
                        role: "orchestrator" as const,
                        authorLabel: "Orchestrator",
                        content: orchestration.response,
                        status: "completed" as const,
                        liveState: "completed" as const,
                        phaseLabel: "Completed",
                        createdAtIso: new Date().toISOString(),
                        linked: {
                          taskId: updatedTask?.id,
                          taskTitle: updatedTask?.title,
                          agentId: updatedTask?.ownerAgentId,
                        },
                      }
                    : message,
                ),
              },
              sessions: latestChat.sessions.map((session) =>
                session.id === sessionId
                  ? {
                      ...session,
                      lastMessageAtIso: new Date().toISOString(),
                      linked: {
                        ...session.linked,
                        taskId: updatedTask?.id ?? session.linked.taskId,
                        taskTitle: updatedTask?.title ?? session.linked.taskTitle,
                      },
                    }
                  : session,
              ),
            },
          });

          orchestration.triggers.forEach((trigger) => {
            const triggerSessionId = chatStateRef.current.selectedSessionIdByType[trigger.chatType];
            if (!triggerSessionId) return;
            void proposeAgentCommand(trigger.chatType, triggerSessionId, trigger.reason, trigger.agentId);
          });
          return;
        }
      }

      const executeProviderRequest = async () => {
        if (routingDecision.selectedProvider === "openrouter" && chatType === "main") {
          setProviderExecutionState("sending");

          const recentMessages = (currentChat.messagesBySessionId[sessionId] ?? [])
            .filter((message) => message.role === "user" || message.role === "orchestrator" || message.role === "agent")
            .slice(-8)
            .map((message) => ({
              role: message.role === "user" ? "user" : "assistant",
              content: message.content,
            })) as Array<{ role: "user" | "assistant"; content: string }>;
          const contextSystemPrompt = buildContextPrompt(workspaceState.contextPackets.mainChat);

          setProviderExecutionState("waiting");
          dispatch({
            type: "set_workflow",
            workflow: appendExecutionTraceStep(workflowRef.current, {
              traceId,
              nowIso: new Date().toISOString(),
              type: "provider_called",
              title: "Primary provider called",
              phaseLabel: "Waiting for provider response",
              liveState: "waiting_for_tool",
              provider: "OpenRouter",
              model: selectedProviderModel,
              nextStatus: "waiting_provider",
            }),
          });
          dispatch({
            type: "set_chat",
            chat: {
              ...chatStateRef.current,
              messagesBySessionId: {
                ...chatStateRef.current.messagesBySessionId,
                [sessionId]: (chatStateRef.current.messagesBySessionId[sessionId] ?? []).map((message) =>
                  message.id === responseId
                    ? {
                        ...message,
                        status: "streaming" as const,
                        liveState: "waiting_for_tool" as const,
                        phaseLabel: "Waiting for provider",
                      }
                    : message,
                ),
              },
            },
          });
          const openRouterResult = await openRouterProviderService.executeChatCompletion({
            model: selectedProviderModel,
            userInput: draft,
            contextMessages: recentMessages,
            systemPrompt:
              `You are assisting in a chat-first software workspace. Routing profile: ${routingDecision.profile}. Routing mode: ${workspaceState.routingMode}. Route reason: ${routingDecision.reason}.\n` +
              `${contextSystemPrompt}`,
          });

          const latestChat = chatStateRef.current;
          const sessionMessages = latestChat.messagesBySessionId[sessionId] ?? [];

          // Graceful fallback to mock when API key is not configured (demo mode)
          if (openRouterResult.executionState === "failed" && openRouterResult.errorCode === "missing_api_key") {
            const demoIso = new Date().toISOString();
            const demoText = mockResponse.content;
            dispatch({
              type: "set_workflow",
              workflow: completeExecutionTrace(
                appendExecutionTraceStep(workflowRef.current, {
                  traceId,
                  nowIso: demoIso,
                  type: "result_received",
                  title: "Demo mode — mock response",
                  details: "OpenRouter API key not configured. Using mock response.",
                  phaseLabel: "Demo mode",
                  liveState: "completed",
                  provider: "Demo",
                  model: selectedProviderModel,
                  nextStatus: "completed",
                }),
                traceId,
                { nowIso: demoIso, outcome: "success", usage: { executionLocation: "local", executionWeight: "light" } },
              ),
            });
            dispatch({
              type: "set_chat",
              chat: {
                ...latestChat,
                messagesBySessionId: {
                  ...latestChat.messagesBySessionId,
                  [sessionId]: sessionMessages.map((msg) =>
                    msg.id === responseId
                      ? {
                          ...msg,
                          content: demoText,
                          status: "completed" as const,
                          liveState: "completed" as const,
                          phaseLabel: "Demo mode",
                          createdAtIso: demoIso,
                          providerMeta: { provider: "Demo (no API key)", model: selectedProviderModel, backend: "local" as const, routingKey: "demo" },
                        }
                      : msg,
                  ),
                },
              },
            });
            setProviderExecutionState("completed");
            return;
          }

          if (openRouterResult.executionState === "completed") {
            setProviderExecutionState("streaming_ready");
            dispatch({
              type: "set_workflow",
              workflow: completeExecutionTrace(
                appendExecutionTraceStep(workflowRef.current, {
                  traceId,
                  nowIso: openRouterResult.receivedAtIso,
                  type: "result_received",
                  title: "Provider result received",
                  details: "Primary provider returned output.",
                  phaseLabel: "Streaming partial output",
                  liveState: "streaming",
                  partialOutput: openRouterResult.outputText.slice(0, 220),
                  provider: "OpenRouter",
                  model: openRouterResult.model,
                  nextStatus: "completed",
                }),
                traceId,
                {
                  nowIso: openRouterResult.receivedAtIso,
                  outcome: "success",
                  usage: {
                    executionLocation: "cloud",
                    executionWeight: "standard",
                  },
                },
              ),
            });
            dispatch({
              type: "set_chat",
              chat: {
                ...latestChat,
                messagesBySessionId: {
                  ...latestChat.messagesBySessionId,
                  [sessionId]: sessionMessages.map((message) =>
                    message.id === responseId
                      ? {
                          ...message,
                          content: openRouterResult.outputText,
                          partialContent: openRouterResult.outputText.slice(0, 220),
                          status: "completed" as const,
                          liveState: "completed" as const,
                          phaseLabel: "Completed",
                          createdAtIso: openRouterResult.receivedAtIso,
                          providerMeta: {
                            provider: "OpenRouter",
                            model: openRouterResult.model,
                            backend: "cloud",
                            routingKey: `${routingDecision.profile}${routingDecision.usedFallback ? " • fallback" : ""}`,
                          },
                        }
                      : message,
                  ),
                },
                sessions: latestChat.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        lastMessageAtIso: openRouterResult.receivedAtIso,
                        unreadCount: 0,
                        providerMeta: {
                          provider: "OpenRouter",
                          model: openRouterResult.model,
                          backend: "cloud",
                          routingKey: `${routingDecision.profile}${routingDecision.usedFallback ? " • fallback" : ""}`,
                        },
                      }
                    : session,
                ),
              },
            });
            setProviderExecutionState("completed");
            return;
          }

          const failureIso = openRouterResult.receivedAtIso;
          const fallbackAllowed = routingDecision.fallbackProvider === "ollama" && (!releaseCritical || Boolean(routingDecision.fallbackModelId));
          const fallbackReason = openRouterResult.errorCode === "rate_limited" ? "provider_rate_limited" : "provider_unavailable";
          if (fallbackAllowed) {
            const fallbackIso = new Date().toISOString();
            const fallbackText = `Primary provider unavailable (${openRouterResult.errorCode}). Switched to local fallback (${routingDecision.fallbackModelId ?? "auto"}).\\n\\n${mockResponse.content}`;
            const fallbackWorkflow = completeExecutionTrace(
              appendExecutionTraceStep(
                appendExecutionTraceStep(
                  appendExecutionTraceStep(workflowRef.current, {
                    traceId,
                    nowIso: failureIso,
                    type: "provider_failed",
                    title: "Primary provider failed",
                    details: openRouterResult.errorMessage,
                    phaseLabel: "Primary provider failed",
                    liveState: "fallback_running",
                    failureType: openRouterResult.errorCode === "rate_limited" ? "timeout" : "provider_failure",
                    provider: "OpenRouter",
                    model: selectedProviderModel,
                    nextStatus: "fallback_in_progress",
                  }),
                  {
                    traceId,
                    nowIso: fallbackIso,
                    type: "fallback_selected",
                    title: "Fallback selected",
                    details: `Fallback executed due to ${fallbackReason}.`,
                    phaseLabel: "Fallback activated",
                    liveState: "fallback_running",
                    provider: "Ollama",
                    model: routingDecision.fallbackModelId ?? undefined,
                    nextStatus: "fallback_in_progress",
                  },
                ),
                {
                  traceId,
                  nowIso: fallbackIso,
                  type: "result_received",
                  title: "Fallback result received",
                  details: "Local fallback completed successfully.",
                  phaseLabel: "Fallback streaming output",
                  liveState: "streaming",
                  partialOutput: fallbackText.slice(0, 220),
                  provider: "Ollama",
                  model: routingDecision.fallbackModelId ?? undefined,
                  nextStatus: "completed",
                },
              ),
              traceId,
              {
                nowIso: fallbackIso,
                outcome: "success",
                usage: {
                  executionLocation: "hybrid",
                  executionWeight: "light",
                },
              },
            );

            dispatch({ type: "set_workflow", workflow: fallbackWorkflow });
            dispatch({
              type: "set_local_inference",
              localInference: {
                ...localInferenceRef.current,
                operational: {
                  ...localInferenceRef.current.operational,
                  degradedMode: shouldEnterDegradedMode([
                    { provider: "openrouter", consecutiveFailures: 2, consecutiveRateLimits: openRouterResult.errorCode === "rate_limited" ? 2 : 0 },
                    { provider: "ollama", consecutiveFailures: 0, consecutiveRateLimits: 0 },
                  ]),
                  providerHealth: {
                    ...localInferenceRef.current.operational.providerHealth,
                    openrouter: openRouterResult.errorCode === "rate_limited" ? "degraded" : "pressured",
                    ollama: "healthy",
                  },
                  fallbackEvents: [
                    {
                      atIso: fallbackIso,
                      reason: fallbackReason,
                      from: "openrouter" as const,
                      to: "ollama" as const,
                      runId,
                    },
                    ...localInferenceRef.current.operational.fallbackEvents,
                  ].slice(0, 20),
                },
              },
            });
            dispatch({
              type: "set_chat",
              chat: {
                ...latestChat,
                messagesBySessionId: {
                  ...latestChat.messagesBySessionId,
                  [sessionId]: sessionMessages.map((message) =>
                    message.id === responseId
                      ? {
                          ...message,
                          content: fallbackText,
                          status: "completed" as const,
                          partialContent: fallbackText.slice(0, 220),
                          liveState: "completed" as const,
                          phaseLabel: "Completed via fallback",
                          createdAtIso: fallbackIso,
                        }
                      : message,
                  ),
                },
              },
            });
            setProviderExecutionState("completed");
            return;
          }

          let failedWorkflow = appendExecutionTraceStep(workflowRef.current, {
            traceId,
            nowIso: failureIso,
            type: "provider_failed",
            title: "Primary provider failed",
            details: openRouterResult.errorMessage,
            phaseLabel: "Primary provider failed",
            liveState: "blocked",
            blockedReason: openRouterResult.errorMessage,
            failureType: "provider_failure",
            provider: "OpenRouter",
            model: selectedProviderModel,
            nextStatus: "fallback_in_progress",
          });
          if (routingDecision.usedFallback) {
            failedWorkflow = appendExecutionTraceStep(failedWorkflow, {
              traceId,
              nowIso: new Date().toISOString(),
              type: "fallback_selected",
              title: "Fallback selected",
              details: `Fallback provider ${routingDecision.fallbackProvider} selected by routing.`,
              phaseLabel: "Fallback selected",
              liveState: "fallback_running",
              provider: routingDecision.fallbackProvider === "openrouter" ? "OpenRouter" : "Ollama",
              model: routingDecision.fallbackModelId ?? undefined,
              nextStatus: "fallback_in_progress",
            });
            failedWorkflow = appendExecutionTraceStep(failedWorkflow, {
              traceId,
              nowIso: new Date().toISOString(),
              type: "fallback_called",
              title: "Fallback invoked",
              details: "Fallback execution attempted after primary provider failure.",
              phaseLabel: "Fallback running",
              liveState: "fallback_running",
              provider: routingDecision.fallbackProvider === "openrouter" ? "OpenRouter" : "Ollama",
              model: routingDecision.fallbackModelId ?? undefined,
              nextStatus: "fallback_in_progress",
            });
          }
          dispatch({
            type: "set_workflow",
            workflow: completeExecutionTrace(
              appendExecutionTraceStep(failedWorkflow, {
                traceId,
                nowIso: failureIso,
                type: "run_failed",
                title: "Run failed",
                details: openRouterResult.errorMessage,
                phaseLabel: "Execution failed",
                liveState: "failed",
                blockedReason: openRouterResult.errorMessage,
                failureType: routingDecision.usedFallback ? "fallback_failure" : "provider_failure",
                nextStatus: "failed",
              }),
              traceId,
              {
                nowIso: failureIso,
                outcome: "failed",
                failureType: routingDecision.usedFallback ? "fallback_failure" : "provider_failure",
                failureMessage: openRouterResult.errorMessage,
                failurePoint: "run_failed",
                linkedFindingIds: linkedTask?.linkedAuditId ? [linkedTask.linkedAuditId] : [],
                linkedBlockerIds: linkedTask?.blockedByTaskIds ?? [],
                usage: {
                  executionLocation: routingDecision.usedFallback ? "hybrid" : "cloud",
                  executionWeight: "standard",
                },
              },
            ),
          });

          dispatch({
            type: "set_chat",
            chat: {
              ...latestChat,
              messagesBySessionId: {
                ...latestChat.messagesBySessionId,
                [sessionId]: sessionMessages.map((message) =>
                  message.id === responseId
                    ? {
                        ...message,
                        content: `Execution failed before completion.\n\n${openRouterResult.errorMessage}`,
                        role: (chatType as string) === "audit" ? "auditor" : (chatType as string) === "review" ? "reviewer" : (chatType as string) === "agent" ? "agent" : "orchestrator",
                        status: "failed" as const,
                        liveState: "failed" as const,
                        phaseLabel: "Blocked",
                        createdAtIso: failureIso,
                        providerMeta: {
                          provider: "OpenRouter",
                          model: selectedProviderModel,
                          backend: "cloud",
                          routingKey: `${routingDecision.profile}${routingDecision.usedFallback ? " • fallback" : ""}`,
                        },
                      }
                    : message,
                ),
              },
              sessions: latestChat.sessions.map((session) =>
                session.id === sessionId
                  ? {
                      ...session,
                      lastMessageAtIso: failureIso,
                      unreadCount: 0,
                      providerMeta: {
                        provider: "OpenRouter",
                        model: selectedProviderModel,
                        backend: "cloud",
                        routingKey: `${routingDecision.profile}${routingDecision.usedFallback ? " • fallback" : ""}`,
                      },
                    }
                  : session,
              ),
            },
          });
          dispatch({
            type: "set_workflow",
            workflow: {
              ...workflowRef.current,
              activityEvents: [
                {
                  id: `activity-${traceId}-blocked`,
                  type: "blocked",
                  title: `${activeAgent?.name ?? "Agent"} execution blocked`,
                  details: openRouterResult.errorMessage,
                  taskId: linkedTask?.id,
                  chatId: sessionId,
                  agentId: activeSession?.linked.agentId ?? linkedTask?.ownerAgentId,
                  provider: "OpenRouter",
                  backend: "cloud",
                  severity: "critical",
                  traceId,
                  createdAtIso: failureIso,
                },
                ...workflowRef.current.activityEvents,
              ],
            },
          });
          setProviderExecutionState("completed");
          return;
        }

        const previewSegments = [
          "Building context",
          "Delegating subtasks",
          "Running audit",
          "Finalizing result",
        ];
        let segmentIndex = 0;
        const partialInterval = setInterval(() => {
          if (segmentIndex >= previewSegments.length) {
            clearInterval(partialInterval);
            const completionIso = new Date(Date.now()).toISOString();
            dispatch({
              type: "set_workflow",
              workflow: completeExecutionTrace(
                appendExecutionTraceStep(workflowRef.current, {
                  traceId,
                  nowIso: completionIso,
                  type: "result_received",
                  title: "Result received",
                  details: "Local/mock execution completed.",
                  phaseLabel: "Finalizing result",
                  liveState: "completed",
                  partialOutput: mockResponse.content.slice(0, 280),
                  provider: selectedProviderLabel,
                  model: selectedProviderModel,
                  nextStatus: "completed",
                }),
                traceId,
                {
                  nowIso: completionIso,
                  outcome: "success",
                  usage: {
                    executionLocation: routingDecision.selectedProvider === "ollama" ? "local" : "cloud",
                    executionWeight: "light",
                  },
                },
              ),
            });
            const latestChat = chatStateRef.current;
            const sessionMessages = latestChat.messagesBySessionId[sessionId] ?? [];
            dispatch({
              type: "set_chat",
              chat: {
                ...latestChat,
                messagesBySessionId: {
                  ...latestChat.messagesBySessionId,
                  [sessionId]: sessionMessages.map((message) =>
                    message.id === responseId
                      ? {
                          ...message,
                          content: mockResponse.content,
                          partialContent: mockResponse.content.slice(0, 280),
                          status: "completed" as const,
                          liveState: "completed" as const,
                          phaseLabel: "Completed",
                          createdAtIso: completionIso,
                        }
                      : message,
                  ),
                },
                sessions: latestChat.sessions.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        lastMessageAtIso: completionIso,
                        unreadCount: 0,
                      }
                    : session,
                ),
              },
            });
            return;
          }
          const nowIsoTick = new Date().toISOString();
          const phaseLabel = previewSegments[segmentIndex];
          const chunkSize = Math.ceil(mockResponse.content.length * ((segmentIndex + 1) / previewSegments.length));
          const partialOutput = mockResponse.content.slice(0, chunkSize);
          dispatch({
            type: "set_workflow",
            workflow: appendExecutionTraceStep(workflowRef.current, {
              traceId,
              nowIso: nowIsoTick,
              type: "provider_called",
              title: phaseLabel,
              details: "Partial update emitted while execution is in-flight.",
              phaseLabel,
              liveState: "streaming",
              partialOutput,
              provider: selectedProviderLabel,
              model: selectedProviderModel,
              nextStatus: "in_progress",
            }),
          });
          const latestChat = chatStateRef.current;
          const sessionMessages = latestChat.messagesBySessionId[sessionId] ?? [];
          dispatch({
            type: "set_chat",
            chat: {
              ...latestChat,
              messagesBySessionId: {
                ...latestChat.messagesBySessionId,
                [sessionId]: sessionMessages.map((message) =>
                  message.id === responseId
                    ? {
                        ...message,
                        partialContent: partialOutput,
                        content: partialOutput,
                        status: "streaming" as const,
                        liveState: "streaming" as const,
                        phaseLabel,
                        createdAtIso: nowIsoTick,
                      }
                    : message,
                ),
              },
            },
          });
          segmentIndex += 1;
        }, 450);
      };

      void executeProviderRequest();
      if (chatType !== "main") {
        void proposeAgentCommand(
          chatType,
          sessionId,
          `Requested from ${chatType} chat to support task execution and validation context. ${chatContextPacket.summary}`,
          activeSession?.linked.agentId ?? activeWorkflowTask?.ownerAgentId,
        );
      }
    },
    runBrowserScenario: async () => {
      const output = await browserAutomationService.executeScenario({
        scenario: activeBrowserSession.scenario,
        linkedTaskId: activeWorkflowTask?.id,
        linkedChatId: currentChatSessionId,
      });

      const runState = output.session.resultState === "passed" ? "completed" : "failed";
      const browserSessionState: BrowserSession = {
        ...output.session,
        runState,
        consoleSummary: output.session.consoleEvents.map((event) => `${event.level}: ${event.message}`).slice(0, 6),
        networkSummary: output.session.networkEvents.map((event) => `${event.method} ${event.url} → ${event.statusCode}`).slice(0, 6),
        findings: output.evidence
          .filter((item) => item.kind === "console_issue" || item.kind === "network_issue" || item.kind === "scenario_summary" || item.kind === "step_failure")
          .map((item) => ({
            id: `finding-${item.id}`,
            title: item.title,
            findingType:
              item.kind === "console_issue"
                ? "console_issue"
                : item.kind === "network_issue"
                  ? "network_issue"
                  : item.kind === "step_failure"
                    ? "scenario_failure"
                    : "ui_issue",
            summary: item.summary,
            severity: item.blocking ? "high" : "medium",
            blocking: item.blocking,
            linkedEvidenceId: item.id,
          })),
      };

      const mappedEvidence: EvidenceRecord[] = output.evidence.map((capture) => ({
        id: capture.id,
        title: capture.title,
        summary: capture.summary,
        source: "browser_agent",
        kind:
          capture.kind === "screenshot"
            ? "screenshot"
            : capture.kind === "console_issue"
              ? "console_finding"
              : capture.kind === "network_issue"
                ? "network_finding"
                : capture.kind === "ui_finding"
                  ? "ux_observation"
                  : "scenario_trace",
        severity: capture.blocking ? "high" : "medium",
        blocking: capture.blocking,
        createdAtIso: capture.createdAtIso,
        tags: ["browser", "automation", capture.kind],
        assets: capture.uri
          ? [
              {
                id: `asset-${capture.id}`,
                label: capture.title,
                kind: capture.kind === "screenshot" ? "screenshot" : "trace",
                uri: capture.uri,
              },
            ]
          : [],
        links: {
          taskId: activeWorkflowTask?.id,
          chatSessionId: currentChatSessionId,
          reviewId: activeWorkflowTask?.linkedReviewId,
          releaseCandidateId: activeWorkflowTask?.linkedReleaseCandidateId,
        },
      }));

      const nextEvidenceFlow: EvidenceFlowState = {
        ...activeEvidenceFlow,
        records: [...mappedEvidence, ...activeEvidenceFlow.records.filter((record) => !record.id.startsWith("ev-browser-"))],
        linkedByChatSessionId: {
          ...activeEvidenceFlow.linkedByChatSessionId,
          [currentChatSessionId]: mappedEvidence.map((record) => record.id),
        },
        linkedByTaskId: {
          ...activeEvidenceFlow.linkedByTaskId,
          ...(activeWorkflowTask?.id ? { [activeWorkflowTask.id]: mappedEvidence.map((record) => record.id) } : {}),
        },
        linkedByReviewId: {
          ...activeEvidenceFlow.linkedByReviewId,
          ...(activeWorkflowTask?.linkedReviewId ? { [activeWorkflowTask.linkedReviewId]: mappedEvidence.map((record) => record.id) } : {}),
        },
        releaseReadinessBlockers: mappedEvidence.filter((record) => record.blocking).map((record) => record.id),
      };

      dispatch({ type: "set_browser_session", browserSession: browserSessionState });
      dispatch({ type: "set_evidence_flow", evidenceFlow: nextEvidenceFlow });
      dispatch({
        type: "set_workflow",
        workflow: {
          ...workflow,
          activityEvents: [
            ...output.events.map((event) => ({
              id: event.id,
              type: (
                event.status === "scenario_started"
                  ? "browser_scenario_started"
                  : event.status === "step_passed"
                    ? "browser_step_passed"
                    : event.status === "step_failed" || event.status === "session_failed"
                      ? "browser_step_failed"
                      : "evidence_attached"
              ) as AgentActivityEventType,
              title: event.summary,
              details: event.stepId ? `Step ${event.stepId}` : undefined,
              taskId: activeWorkflowTask?.id,
              chatId: currentChatSessionId,
              severity: (event.status === "step_failed" || event.status === "session_failed" ? "critical" : "info") as ActivitySeverity,
              createdAtIso: event.timestampIso,
            })),
            ...workflow.activityEvents,
          ],
          tasks: workflow.tasks.map((task) =>
            task.id === activeWorkflowTask?.id
              ? {
                  ...task,
                  linkedEvidenceIds: mappedEvidence.map((record) => record.id),
                  designBrowserBlockers: mappedEvidence.filter((record) => record.blocking).length,
                  auditVerdict: mappedEvidence.some((record) => record.blocking) ? "warning" : task.auditVerdict,
                  progressSummary: mappedEvidence.some((record) => record.blocking)
                    ? "Browser automation found blockers requiring audit/review."
                    : "Browser automation passed.",
                }
              : task,
          ),
        },
      });
    },
    focusTask: (taskId: string) => {
      const task = workflow.tasks.find((entry) => entry.id === taskId);
      if (!task) return;

      const targetSession = chatState.sessions.find((session) => session.id === task.linkedChatSessionId);
      if (!targetSession) return;

      dispatch({ type: "set_active_chat_type", chatType: targetSession.type });
      dispatch({
        type: "select_session",
        chatType: targetSession.type,
        sessionId: targetSession.id,
      });
    },
    launchTask: (taskId: string) => {
      const task = workflow.tasks.find((entry) => entry.id === taskId);
      if (!task) return;

      const nowIso = new Date().toISOString();
      const nextStatus = task.status === "proposed" || task.status === "assigned" || task.status === "queued" ? "in_progress" : task.status;
      dispatch({
        type: "set_workflow",
        workflow: {
          ...workflow,
          tasks: workflow.tasks.map((entry) =>
            entry.id === taskId
              ? {
                  ...entry,
                  status: nextStatus,
                  updatedAtIso: nowIso,
                }
              : entry,
          ),
          activityEvents: [
            {
              id: `activity-launch-${taskId}-${Date.now().toString(36)}`,
              type: "execution_started",
              title: "Operator launched task",
              details: task.title,
              taskId: task.id,
              chatId: task.linkedChatSessionId,
              severity: "info",
              createdAtIso: nowIso,
            },
            ...workflow.activityEvents,
          ],
        },
      });

      const targetSession = chatState.sessions.find((session) => session.id === task.linkedChatSessionId);
      if (!targetSession) return;
      dispatch({ type: "set_active_chat_type", chatType: targetSession.type });
      dispatch({
        type: "select_session",
        chatType: targetSession.type,
        sessionId: targetSession.id,
      });
    },
    triggerDeploy: async (environment: "preview" | "production") => {
      const activeCandidate = releaseControl.releaseCandidates.find((candidate) => candidate.id === releaseControl.activeCandidateId);
      const branch = activeCandidate?.linkedBranch ?? repository.branch ?? "main";
      const taskId = activeCandidate?.linkedTaskId;
      const policyDecision = evaluatePolicy({
        actionType: "deploy_action",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "release_action", id: activeCandidate?.id, label: `deploy:${environment}` },
      });
      if (policyDecision.blocked) {
        return { ok: false, message: policyDecision.rationale };
      }
      if (policyDecision.requiresApproval && environment === "production") {
        const approval = deployIntegrationService.buildDeployApproval(taskId, currentChatSessionId, environment);
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            approvals: upsertApproval(workflow.approvals, approval),
            activityEvents: [
              {
                id: `activity-${approval.id}`,
                type: "waiting_for_approval",
                title: "Production deploy awaiting approval",
                details: approval.reason,
                taskId,
                chatId: currentChatSessionId,
                severity: "warning",
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
          },
        });
        return { ok: false, message: "Approval required", approvalId: approval.id };
      }

      const result = await deployIntegrationService.triggerDeploy({
        releaseControl,
        projectId: activeProjectId,
        repository: repository.name ?? (localShell.project as any).repositoryName ?? activeProject?.name ?? "workspace",
        branch,
        taskId,
        chatId: currentChatSessionId,
        releaseCandidateId: activeCandidate?.id,
        environment,
        approvals: workflow.approvals,
        releaseState: releaseControl.finalDecision.status === "go" ? "go" : releaseControl.finalDecision.status === "blocked" || releaseControl.finalDecision.status === "no_go" ? "blocked" : "warning",
      });

      if (!result.ok || !result.deployment) {
        return result;
      }

      setReleaseControl((prev) => ({
        ...prev,
        deployments: upsertDeployment(prev.deployments, result.deployment!),
      }));
      dispatch({
        type: "set_workflow",
        workflow: {
          ...workflow,
          activityEvents: [
            {
              id: `activity-deploy-${result.deployment.id}`,
              type: "deploy_triggered",
              title: `${environment} deploy triggered`,
              details: `${result.deployment.id} (${result.deployment.status})`,
              taskId,
              chatId: currentChatSessionId,
              severity: "info",
              createdAtIso: new Date().toISOString(),
            },
            ...workflow.activityEvents,
          ],
        },
      });
      return result;
    },
    refreshDeployStatus: async (deploymentId: string) => {
      const deployment = releaseControl.deployments.find((entry) => entry.id === deploymentId);
      if (!deployment) return { ok: false, message: "Deployment not found." };
      const result = await deployIntegrationService.refreshDeploymentStatus(deployment);
      if (!result.ok || !result.deployment) return result;
      setReleaseControl((prev) => ({
        ...prev,
        deployments: upsertDeployment(prev.deployments, result.deployment!),
      }));
      return result;
    },
    refreshLocalInference,
    runGitAction: async (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull" | "prepare_pr" | "create_pr", taskId: string) => {
      const task = workflow.tasks.find((entry) => entry.id === taskId);
      if (!task?.github) return;
      const hasRepositoryConnection = repository.connected || Boolean(workflow.github.activeRepositoryId);
      if (!hasRepositoryConnection && (action === "push" || action === "prepare_pr" || action === "create_pr")) {
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            activityEvents: [
              {
                id: `activity-git-no-repo-${task.id}-${Date.now().toString(36)}`,
                type: "blocked",
                title: "GitHub workflow blocked",
                details: "No connected repository. Connect a repository before push/PR actions.",
                severity: "critical",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
          },
        });
        return;
      }
      const gitPolicyDecision = evaluatePolicy({
        actionType: action === "push" ? "git_push" : action === "commit" ? "risky_command_execution" : "safe_command_execution",
        subject: { type: "user", id: "workspace-operator" },
        target: { type: "repo", id: task.github.repositoryId, label: action },
        commandSafetyLevel: action === "push" || action === "commit" ? "caution" : "safe",
      });
      if (gitPolicyDecision.blocked) return;
      const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
        workingDirectory: localShell.project.activeProjectRoot,
        linkedTaskId: task.id,
        linkedChatSessionId: task.linkedChatSessionId,
      });
      terminalService.selectSession(activeTerminal.id);
      setRepository((prev) => ({
        ...prev,
        syncStatus: action === "push" || action === "pull" || action === "prepare_pr" || action === "create_pr" ? "syncing" : prev.syncStatus,
      }));

      const snapshotBeforeAction = await gitService.getSnapshot();
      if (snapshotBeforeAction.branch === "unknown") {
        setRepository((prev) => ({ ...prev, syncStatus: "idle" }));
        return;
      }

      const pendingPushApproval = workflow.approvals.find(
        (approval) => approval.taskId === taskId && approval.category === "push_approval" && approval.status === "pending",
      );
      const pushApproved = workflow.approvals.some(
        (approval) => approval.taskId === taskId && approval.category === "push_approval" && approval.status === "approved",
      );

      if (action === "push" && (task.github.pushWorkflow.requiresApproval || gitPolicyDecision.requiresApproval) && !pushApproved) {
        const approvalId = pendingPushApproval?.id ?? `approval-push-${task.id}`;
        const nextApprovals = pendingPushApproval
          ? workflow.approvals
          : [
              ...workflow.approvals,
              {
                id: approvalId,
                category: "push_approval" as const,
                title: `Approve push for ${task.title}`,
                reason: gitPolicyDecision.rationale,
                status: "pending" as const,
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                requestedBy: "git-service",
                requestedAtIso: new Date().toISOString(),
              },
            ];

        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            approvals: nextApprovals,
            tasks: workflow.tasks.map((entry) =>
              entry.id === task.id
                ? {
                    ...entry,
                    status: "awaiting_approval",
                    github: {
                      ...entry.github!,
                      pushWorkflow: {
                        ...entry.github!.pushWorkflow,
                        status: "approval_required",
                        linkedApprovalId: approvalId,
                        pendingError: "Push blocked until approval is granted.",
                      },
                    },
                  }
                : entry,
            ),
          },
        });
        return;
      }

      const defaultTargetBranch = workflow.github.repositories.find((repo) => repo.id === task.github?.repositoryId)?.defaultBranch ?? "main";
      const taskBranch = task.github.branch?.localBranchName ?? task.branchName;
      const canPreparePr =
        Boolean(taskBranch) &&
        task.github.pushWorkflow.status === "pushed" &&
        task.github.commitWorkflow.status === "committed";

      if (action === "prepare_pr") {
        if (!taskBranch || taskBranch === defaultTargetBranch) {
          dispatch({
            type: "set_workflow",
            workflow: {
              ...workflow,
              tasks: workflow.tasks.map((entry) =>
                entry.id === task.id && entry.github
                  ? {
                      ...entry,
                      github: {
                        ...entry.github,
                        pullRequest: {
                          ...(entry.github.pullRequest ?? {
                            id: `pr-${task.id}`,
                            title: "",
                            status: "draft_review",
                            linkedAuditorIds: entry.linkedAuditorTypes ?? [],
                            findings: [],
                            mergeReadiness: "not_ready",
                            releaseGateReadiness: "not_ready",
                            linkedTaskIds: [],
                            linkedSubtaskIds: [],
                            draftPreparationStatus: "idle",
                            creationStatus: "idle",
                          }),
                          pendingError: "Cannot prepare PR from default branch. Switch to a task branch first.",
                          draftPreparationStatus: "failed",
                        },
                      },
                    }
                  : entry,
              ),
            },
          });
          return;
        }
        if (!canPreparePr) {
          dispatch({
            type: "set_workflow",
            workflow: {
              ...workflow,
              tasks: workflow.tasks.map((entry) =>
                entry.id === task.id && entry.github
                  ? {
                      ...entry,
                      github: {
                        ...entry.github,
                        pullRequest: {
                          ...(entry.github.pullRequest ?? {
                            id: `pr-${task.id}`,
                            title: "",
                            status: "draft_review",
                            linkedAuditorIds: entry.linkedAuditorTypes ?? [],
                            findings: [],
                            mergeReadiness: "not_ready",
                            releaseGateReadiness: "not_ready",
                            linkedTaskIds: [],
                            linkedSubtaskIds: [],
                            draftPreparationStatus: "idle",
                            creationStatus: "idle",
                          }),
                          pendingError: "PR draft requires a committed and pushed task branch.",
                          draftPreparationStatus: "failed",
                        },
                      },
                    }
                  : entry,
              ),
            },
          });
          return;
        }
        const draftValidation = await githubService.validatePullRequestReadiness({
          sourceBranch: taskBranch,
          targetBranch: defaultTargetBranch,
        });
        if (!draftValidation.ok) {
          dispatch({
            type: "set_workflow",
            workflow: {
              ...workflow,
              tasks: workflow.tasks.map((entry) =>
                entry.id === task.id && entry.github
                  ? {
                      ...entry,
                      github: {
                        ...entry.github,
                        pullRequest: {
                          ...(entry.github.pullRequest ?? {
                            id: `pr-${task.id}`,
                            title: "",
                            status: "draft_review",
                            linkedAuditorIds: entry.linkedAuditorTypes ?? [],
                            findings: [],
                            mergeReadiness: "not_ready",
                            releaseGateReadiness: "not_ready",
                            linkedTaskIds: [],
                            linkedSubtaskIds: [],
                            draftPreparationStatus: "idle",
                            creationStatus: "idle",
                          }),
                          pendingError: draftValidation.details ?? "PR draft preparation failed.",
                          draftPreparationStatus: "failed",
                        },
                      },
                    }
                  : entry,
              ),
            },
          });
          setRepository((prev) => ({ ...prev, syncStatus: "up_to_date" }));
          return;
        }

        const draft = githubService.preparePullRequestDraft({
          taskId: task.id,
          taskTitle: task.title,
          sourceBranch: taskBranch,
          targetBranch: defaultTargetBranch,
          commitSummary: task.github.commitSummary,
          linkedSubtaskIds: workflow.subtasks.filter((subtask) => subtask.taskId === task.id).map((subtask) => subtask.id),
          linkedAuditId: task.linkedAuditId,
        });
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            activityEvents: [
              {
                id: `activity-pr-draft-${task.id}-${Date.now().toString(36)}`,
                type: "review_triggered",
                title: "PR draft prepared",
                details: `${draft.sourceBranch} -> ${draft.targetBranch}`,
                severity: "info",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
            tasks: workflow.tasks.map((entry) =>
              entry.id === task.id && entry.github
                ? {
                    ...entry,
                    github: {
                      ...entry.github,
                      branchLifecycle: "review_opened",
                      pullRequest: (() => {
                        const nextPullRequest = {
                          ...(entry.github.pullRequest ?? {
                          id: `pr-${task.id}`,
                          status: "draft_review",
                          reviewChatSessionId: task.linkedChatSessionId,
                          linkedAuditorIds: entry.linkedAuditorTypes ?? [],
                          findings: [],
                          mergeReadiness: "not_ready",
                          releaseGateReadiness: "not_ready",
                        }),
                        title: draft.title,
                        body: draft.body,
                        sourceBranch: draft.sourceBranch,
                        targetBranch: draft.targetBranch,
                        linkedTaskIds: draft.linkedTaskIds,
                        linkedSubtaskIds: draft.linkedSubtaskIds,
                        linkedAuditId: draft.linkedAuditId,
                        draftPreparedAtIso: new Date().toISOString(),
                        draftPreparationStatus: "ready" as const,
                        creationStatus: "ready" as const,
                        pendingError: undefined,
                        };
                        const reviewOps = evaluatePullRequestReviewOperations({
                          task: entry,
                          pullRequest: nextPullRequest,
                          workflow,
                          auditors: auditorControlState,
                          evidenceFlow: activeEvidenceFlow,
                          defaultBranch: workflow.github.repositories.find((repo) => repo.id === entry.github?.repositoryId)?.defaultBranch,
                          releaseGateBlocked: releaseControl.finalDecision.status === "blocked" || releaseControl.finalDecision.status === "no_go",
                        });
                        return {
                          ...nextPullRequest,
                          mergeReadiness: reviewOps?.mergeReadiness.state ?? "not_ready",
                          releaseGateReadiness: reviewOps?.releaseHandoff.state === "ready" ? "ready" : reviewOps?.releaseHandoff.state === "carryover_blockers" ? "blocked" : "not_ready",
                          reviewOperations: reviewOps,
                        };
                      })(),
                    },
                  }
                : entry,
            ),
          },
        });
        setRepository((prev) => ({ ...prev, syncStatus: "up_to_date" }));
        return;
      }

      if (action === "create_pr") {
        const existingDraft = task.github.pullRequest;
        if (!existingDraft || existingDraft.draftPreparationStatus !== "ready" || !existingDraft.sourceBranch || !existingDraft.targetBranch) {
          return;
        }
        const pendingPrApproval = workflow.approvals.find(
          (approval) => approval.taskId === task.id && approval.category === "pr_creation_approval" && approval.status === "pending",
        );
        const prApproved = workflow.approvals.some(
          (approval) => approval.taskId === task.id && approval.category === "pr_creation_approval" && approval.status === "approved",
        );
        const requiresPrApproval = task.phase === "release" || task.github.syncMode === "auto_push";
        if (requiresPrApproval && !prApproved) {
          const approvalId = pendingPrApproval?.id ?? `approval-pr-${task.id}`;
          dispatch({
            type: "set_workflow",
            workflow: {
              ...workflow,
              approvals: pendingPrApproval
                ? workflow.approvals
                : [
                    ...workflow.approvals,
                    {
                      id: approvalId,
                      category: "pr_creation_approval",
                      title: `Approve PR creation for ${task.title}`,
                      reason: "PR creation requires operator confirmation for release/review context linkage.",
                      status: "pending",
                      taskId: task.id,
                      chatId: task.linkedChatSessionId,
                      requestedBy: "github-service",
                      requestedAtIso: new Date().toISOString(),
                    },
                  ],
              tasks: workflow.tasks.map((entry) =>
                entry.id === task.id && entry.github && entry.github.pullRequest
                  ? {
                      ...entry,
                      github: {
                        ...entry.github,
                        pullRequest: {
                          ...entry.github.pullRequest,
                          creationStatus: "approval_required",
                          pendingError: "PR creation is waiting for approval.",
                        },
                      },
                    }
                  : entry,
              ),
            },
          });
          return;
        }

        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            tasks: workflow.tasks.map((entry) =>
              entry.id === task.id && entry.github && entry.github.pullRequest
                ? {
                    ...entry,
                    github: {
                      ...entry.github,
                      pullRequest: {
                        ...entry.github.pullRequest,
                        creationStatus: "creating",
                        pendingError: undefined,
                      },
                    },
                  }
                : entry,
            ),
          },
        });

        const prCreateResult = await githubService.createPullRequest({
          title: existingDraft.title,
          body: existingDraft.body || "",
          sourceBranch: existingDraft.sourceBranch,
          targetBranch: existingDraft.targetBranch,
          draft: true,
        });

        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            activityEvents: [
              {
                id: `activity-pr-create-${task.id}-${Date.now().toString(36)}`,
                type: prCreateResult.ok ? "review_triggered" : "failed",
                title: prCreateResult.ok ? "Pull request created" : "Pull request creation failed",
                details: prCreateResult.details,
                severity: prCreateResult.ok ? "info" : "critical",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
            tasks: workflow.tasks.map((entry) =>
              entry.id === task.id && entry.github && entry.github.pullRequest
                ? {
                    ...entry,
                    github: {
                      ...entry.github,
                      branchLifecycle: prCreateResult.ok ? "review_opened" : entry.github.branchLifecycle,
                      pullRequest: (() => {
                        const nextPullRequest = {
                          ...entry.github.pullRequest,
                          number: prCreateResult.number ?? entry.github.pullRequest.number,
                          url: prCreateResult.url ?? entry.github.pullRequest.url,
                          status: prCreateResult.ok ? "draft_review" : entry.github.pullRequest.status,
                          creationStatus: prCreateResult.ok ? "created" as const : "failed" as const,
                          pendingError: prCreateResult.ok ? undefined : prCreateResult.details,
                          reviewChatSessionId: prCreateResult.ok ? task.linkedChatSessionId : entry.github.pullRequest.reviewChatSessionId,
                        };
                        const reviewOps = evaluatePullRequestReviewOperations({
                          task: entry,
                          pullRequest: nextPullRequest,
                          workflow,
                          auditors: auditorControlState,
                          evidenceFlow: activeEvidenceFlow,
                          defaultBranch: workflow.github.repositories.find((repo) => repo.id === entry.github?.repositoryId)?.defaultBranch,
                          releaseGateBlocked: releaseControl.finalDecision.status === "blocked" || releaseControl.finalDecision.status === "no_go",
                        });
                        return {
                          ...nextPullRequest,
                          mergeReadiness: reviewOps?.mergeReadiness.state ?? "not_ready",
                          releaseGateReadiness: reviewOps?.releaseHandoff.state === "ready" ? "ready" : reviewOps?.releaseHandoff.state === "carryover_blockers" ? "blocked" : "not_ready",
                          reviewOperations: reviewOps,
                        };
                      })(),
                    },
                  }
                : entry,
            ),
          },
        });
        setRepository((prev) => ({ ...prev, syncStatus: "up_to_date" }));
        return;
      }

      if (action === "commit" && !snapshotBeforeAction.hasStagedChanges) {
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            activityEvents: [
              {
                id: `activity-git-commit-no-staged-${task.id}-${Date.now().toString(36)}`,
                type: "blocked",
                title: "Commit blocked",
                details: "No staged changes. Stage files before committing.",
                severity: "warning",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
          },
        });
        setRepository((prev) => ({ ...prev, syncStatus: "up_to_date" }));
        return;
      }

      if (action === "push" && snapshotBeforeAction.branch !== (task.github.branch?.localBranchName ?? snapshotBeforeAction.branch)) {
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            activityEvents: [
              {
                id: `activity-git-push-branch-mismatch-${task.id}-${Date.now().toString(36)}`,
                type: "blocked",
                title: "Push blocked",
                details: `Branch mismatch: active branch is ${snapshotBeforeAction.branch}, expected ${task.github.branch?.localBranchName ?? snapshotBeforeAction.branch}.`,
                severity: "critical",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
          },
        });
        setRepository((prev) => ({ ...prev, syncStatus: snapshotBeforeAction.behindBy > 0 ? "behind" : "up_to_date" }));
        return;
      }

      const commandText =
        action === "stage_all"
          ? "git add -A"
          : action === "unstage_all"
            ? "git reset HEAD -- ."
            : action === "commit"
              ? `git commit -m ${JSON.stringify(task.github.commitWorkflow.draftMessage || `chore(${task.id}): update task changes`)}`
              : action === "push"
                ? `git push ${task.github.branch?.localBranchName ? `-u origin ${task.github.branch.localBranchName}` : ""}`.trim()
                : "git pull --ff-only";

      const terminalResult = await terminalService.execute(activeTerminal.id, {
        command: commandText,
        cwd: task.github.branch?.localBranchName ? localShell.project.activeProjectRoot : undefined,
        linkedTaskId: task.id,
        linkedChatSessionId: task.linkedChatSessionId,
        approved: action === "push" ? pushApproved : false,
      });

      dispatch({
        type: "set_local_shell",
        localShell: {
          ...localShellRef.current,
          terminal: terminalService.getSessionState(),
        },
      });
      appendTerminalMessage(terminalResult.command);

      if (terminalResult.command.state === "approval_required") {
        const approvalId = `approval-terminal-${terminalResult.command.id}`;
        dispatch({
          type: "set_workflow",
          workflow: {
            ...workflow,
            approvals: [
              ...workflow.approvals,
              {
                id: approvalId,
                category: "destructive_file_operations",
                title: `Approve terminal command for ${task.title}`,
                reason: `Command requires approval: ${terminalResult.command.command}`,
                status: "pending",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                requestedBy: "terminal-service",
                requestedAtIso: new Date().toISOString(),
              },
            ],
            activityEvents: [
              {
                id: `activity-${terminalResult.command.id}`,
                type: "waiting_for_approval",
                title: "Terminal command awaiting approval",
                details: terminalResult.command.command,
                severity: "warning",
                taskId: task.id,
                chatId: task.linkedChatSessionId,
                createdAtIso: new Date().toISOString(),
              },
              ...workflow.activityEvents,
            ],
          },
        });
        return;
      }

      const result = {
        ok: terminalResult.command.state === "completed" && (terminalResult.command.exitCode ?? 1) === 0,
        message:
          terminalResult.command.state === "completed" ? "Command completed" : terminalResult.command.state === "failed" ? "Command failed" : "Command blocked",
        details: terminalResult.command.failureDetail || terminalResult.command.failureReason || undefined,
      };
      const snapshotAfterAction = await gitService.getSnapshot();
      setRepository((prev) => ({
        ...prev,
        branch: snapshotAfterAction.branch,
        clean: snapshotAfterAction.clean,
        aheadBy: snapshotAfterAction.aheadBy,
        behindBy: snapshotAfterAction.behindBy,
        syncStatus: snapshotAfterAction.behindBy > 0 ? "behind" : "up_to_date",
        lastValidatedAtIso: new Date().toISOString(),
      }));

      const nextWorkflow: WorkflowState = {
        ...workflow,
        activityEvents: [
          {
            id: `activity-${terminalResult.command.id}`,
            type: result.ok ? "execution_update" : "failed",
            title: result.ok ? "Terminal command completed" : "Terminal command failed",
            details: terminalResult.command.command,
            severity: result.ok ? "info" : "critical",
            taskId: task.id,
            chatId: task.linkedChatSessionId,
            createdAtIso: new Date().toISOString(),
          },
          ...workflow.activityEvents,
        ],
        tasks: workflow.tasks.map((entry) => {
          if (entry.id !== task.id || !entry.github) return entry;
          return {
            ...entry,
            github: {
              ...entry.github,
              commitWorkflow:
                action === "commit"
                  ? {
                      ...entry.github.commitWorkflow,
                      status: result.ok ? "committed" : "failed",
                      pendingError: result.ok ? undefined : result.details,
                    }
                  : entry.github.commitWorkflow,
              pushWorkflow:
                action === "push"
                  ? {
                      ...entry.github.pushWorkflow,
                      status: result.ok ? "pushed" : "failed",
                      pendingError: result.ok ? undefined : result.details,
                      lastPushedAtIso: result.ok ? new Date().toISOString() : entry.github.pushWorkflow.lastPushedAtIso,
                      behindRemoteByCommits: snapshotAfterAction.behindBy,
                    }
                  : entry.github.pushWorkflow,
            },
          };
        }),
      };

      dispatch({ type: "set_workflow", workflow: nextWorkflow });
    },
  };
}
