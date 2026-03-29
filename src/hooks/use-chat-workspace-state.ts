import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AgentActivityEventType, ActivitySeverity } from "@/types/workflow";
import { auditorControlState } from "@/data/mock-audits";
import { activeAgents, initialChatState } from "@/data/mock-chat";
import { workflowState as initialWorkflowState } from "@/data/mock-workflow";
import { localInferenceRuntime } from "@/data/mock-local-inference";
import { browserSession, designSession } from "@/data/mock-agent-workspace";
import { evidenceFlowState } from "@/data/mock-evidence";
import { localShellState } from "@/data/mock-local-shell";
import { releaseControlState } from "@/data/mock-release-control";
import { createLocalGitService } from "@/lib/local-git-service";
import { createLocalTerminalExecutionService } from "@/lib/local-terminal-service";
import { ollamaRuntimeService } from "@/lib/ollama-runtime-service";
import { openRouterProviderService } from "@/lib/openrouter-provider-service";
import { modelRoutingEngine } from "@/lib/model-routing-engine";
import { BrowserAutomationService, RuntimeBridgeBrowserAdapter } from "@/lib/browser-automation-service";
import type { ChatState, ChatType } from "@/types/chat";
import type { BrowserSession } from "@/types/agents";
import type { EvidenceFlowState, EvidenceRecord } from "@/types/evidence";
import type { LocalInferenceRuntimeState } from "@/types/local-inference";
import type { LocalShellWorkspaceState, TerminalCommand } from "@/types/local-shell";
import type { WorkflowState } from "@/types/workflow";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";
import type { AppRoutingModeProfile, RoutingMode } from "@/types/local-inference";

type Action =
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

function reducer(state: WorkspaceReducerState, action: Action): WorkspaceReducerState {
  switch (action.type) {
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
  const [state, dispatch] = useReducer(reducer, {
    chat: initialChatState,
    workflow: initialWorkflowState,
    localInference: localInferenceRuntime,
    localShell: localShellState,
    browserSession,
    evidenceFlow: evidenceFlowState,
  });

  const chatState = state.chat;
  const workflow = state.workflow;
  const localInference = state.localInference;
  const localShell = state.localShell;
  const activeBrowserSession = state.browserSession;
  const activeEvidenceFlow = state.evidenceFlow;
  const localInferenceRef = useRef(localInference);
  localInferenceRef.current = localInference;
  const localShellRef = useRef(localShell);
  localShellRef.current = localShell;
  const gitService = useMemo(() => createLocalGitService(localShellState.project.activeProjectRoot), []);
  const terminalService = useMemo(
    () => createLocalTerminalExecutionService(localShellState.project.activeProjectRoot),
    [],
  );
  const browserAutomationService = useMemo(
    () => new BrowserAutomationService(new RuntimeBridgeBrowserAdapter()),
    [],
  );
  const [providerSource, setProviderSource] = useState<"openrouter" | "ollama">("ollama");
  const [deploymentMode, setDeploymentMode] = useState<"local" | "cloud" | "hybrid">("hybrid");
  const [activeModel, setActiveModel] = useState("qwen3-coder:14b");
  const [routingProfile, setRoutingProfile] = useState<AppRoutingModeProfile>("balanced");
  const [lastUsedModelByProvider, setLastUsedModelByProvider] = useState<Record<"openrouter" | "ollama", string>>({
    openrouter: "openai/gpt-4.1",
    ollama: "qwen3-coder:14b",
  });
  const [projects, setProjects] = useState([
    {
      id: "project-local-1",
      name: localShell.project.workspaceName,
      description: "Default local workspace",
      projectType: "web-app",
      source: "local" as const,
      localPath: localShell.project.activeProjectRoot,
      projectRoot: localShell.project.activeProjectRoot,
      branch: localShell.project.gitBranch || "main",
      status: "active" as const,
      repository: {
        connected: false,
        syncStatus: "idle" as const,
      },
      provider: {
        connected: true,
        source: "ollama" as const,
      },
    },
  ]);
  const [activeProjectId, setActiveProjectId] = useState("project-local-1");
  const [repository, setRepository] = useState<{
    connected: boolean;
    url?: string;
    name?: string;
    branch?: string;
    syncStatus?: "idle" | "syncing" | "up_to_date" | "behind";
    connectionState?: "connected" | "disconnected";
  }>({
    connected: false,
    syncStatus: "idle",
    connectionState: "disconnected",
  });

  const currentChatType = chatState.activeChatType;
  const currentChatSessionId = chatState.selectedSessionIdByType[currentChatType];
  const currentSession = chatState.sessions.find((session) => session.id === currentChatSessionId);
  const currentSessionRoutingMode = localInference.routing.conversationOverrides[currentChatSessionId] ?? localInference.routing.activeMode;

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
        { id: "openai/gpt-4.1", displayName: "GPT-4.1" },
        { id: "openai/o3", displayName: "OpenAI o3" },
      ];

      return cloudModels.length > 0
        ? cloudModels.map((entry) => ({ id: entry.providerModelId, displayName: entry.displayName }))
        : fallbackCloud;
    }

    const localModels = localInference.modelRegistry.map((entry) => ({
      id: entry.name,
      displayName: entry.displayName,
    }));
    return localModels.length > 0 ? localModels : [{ id: "qwen3-coder:14b", displayName: "Qwen3 Coder 14B" }];
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
        },
        resources: {
          ...currentLocalInference.resources,
          autoFallbackReady: !snapshot.connection.runtimeAvailable || currentLocalInference.resources.autoFallbackReady,
          degradedMode: snapshot.connection.serviceState === "degraded" || snapshot.connection.serviceState === "error",
        },
        scenarioLog: [
          `${new Date().toISOString()}: Ollama ${snapshot.connection.serviceState} (${snapshot.connection.offlineReason ?? "runtime healthy"}).`,
          ...currentLocalInference.scenarioLog.slice(0, 7),
        ],
      },
    });
  };

  const activeProject = projects.find((project) => project.id === activeProjectId);

  const workspaceState: WorkspaceRuntimeState = {
    currentProject: activeProject?.name ?? localShell.project.workspaceName,
    currentBranch:
      activeProject?.repository?.branch ??
      repository.branch ??
      activeWorkflowTask?.github?.branch?.localBranchName ??
      localShell.project.gitBranch ??
      activeWorkflowTask?.branchName ??
      activeRepository?.defaultBranch ??
      "main",
    currentTask: activeWorkflowTask?.title ?? currentSession?.linked.taskTitle ?? "Build user management module",
    activeProvider: providerSource === "ollama" ? "Ollama" : "OpenRouter",
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
    releaseReadinessStatus: releaseControlState.finalDecision.status,
    pendingApprovals,
    workflow,
    auditors: auditorControlState,
    designSession,
    browserSession: activeBrowserSession,
    evidenceFlow: activeEvidenceFlow,
    releaseControl: releaseControlState,
    localInference,
    localShell,
    projects,
    activeProjectId,
    repository,
  };

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

  useEffect(() => {
    let cancelled = false;

    const syncGitSnapshot = async () => {
      const snapshot = await gitService.getSnapshot();
      if (cancelled || snapshot.branch === "unknown") return;

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
    approveWorkflowApproval: (approvalId: string) => dispatch({ type: "approve_workflow_approval", approvalId }),
    setProviderSource: (nextSource: "openrouter" | "ollama") => {
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
    addLocalProject: (payload: { name: string; localPath: string; projectRoot?: string }) => {
      const id = `project-local-${Date.now()}`;
      setProjects((prev) => [
        {
          id,
          name: payload.name,
          description: "Local project connected from this machine",
          projectType: "local",
          source: "local",
          localPath: payload.localPath,
          projectRoot: payload.projectRoot || payload.localPath,
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
        },
        ...prev.map((project) => ({ ...project, status: "idle" as const })),
      ]);
      setActiveProjectId(id);
      setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
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
        },
        ...prev.map((project) => ({ ...project, status: "idle" as const })),
      ]);
      setActiveProjectId(id);
      setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
    },
    connectRepository: (payload: { name: string; url: string; branch: string }) => {
      const activeProject = projects.find((project) => project.id === activeProjectId);
      const nextRepository = {
        connected: true,
        url: payload.url,
        name: payload.name,
        branch: payload.branch || "main",
        syncStatus: "up_to_date" as const,
        connectionState: "connected" as const,
      };
      setRepository(nextRepository);
      if (activeProject) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === activeProject.id
              ? {
                  ...project,
                  source: "git",
                  branch: payload.branch || project.branch,
                  repository: nextRepository,
                }
              : project,
          ),
        );
      }
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
      setActiveProjectId(projectId);
      setProjects((prev) => prev.map((project) => ({ ...project, status: project.id === projectId ? "active" : "idle" })));
      const selectedProject = projects.find((project) => project.id === projectId);
      if (selectedProject?.repository?.connected) {
        setRepository({
          connected: true,
          name: selectedProject.repository.name,
          url: selectedProject.repository.url,
          branch: selectedProject.repository.branch,
          syncStatus: selectedProject.repository.syncStatus,
          connectionState: "connected",
        });
      } else {
        setRepository({ connected: false, syncStatus: "idle", connectionState: "disconnected" });
      }
    },
    sendMessage: (chatType: ChatType) => {
      const sessionId = chatState.selectedSessionIdByType[chatType];
      const draft = (chatState.draftInputBySessionId[sessionId] ?? "").trim();
      if (!draft) return;
      const nowIso = new Date().toISOString();
      const userMessage = {
        id: `user-${Date.now()}`,
        sessionId,
        role: "user" as const,
        content: draft,
        createdAtIso: nowIso,
        status: "completed" as const,
      };
      const responderRole = chatType === "main" ? "orchestrator" : chatType === "agent" ? "agent" : chatType === "audit" ? "auditor" : "reviewer";
      const responseMessage = {
        id: `resp-${Date.now()}`,
        sessionId,
        role: responderRole,
        authorLabel: chatType === "main" ? "Orchestrator" : chatType === "agent" ? "Agent Runtime" : chatType === "audit" ? "Audit Agent" : "Review Agent",
        content: `Received. Working in ${deploymentMode} mode via ${providerSource === "ollama" ? "Ollama" : "OpenRouter"} (${activeModel}) with ${routingProfile} routing. Context: ${workspaceState.currentProject} / ${workspaceState.currentTask}.`,
        createdAtIso: new Date(Date.now() + 1000).toISOString(),
        status: "completed" as const,
        providerMeta: {
          provider: providerSource === "ollama" ? "Ollama" : "OpenRouter",
          model: activeModel,
          backend: deploymentMode === "hybrid" ? "hybrid" : deploymentMode,
          routingKey: routingProfile,
        },
      };

      dispatch({
        type: "set_chat",
        chat: {
          ...chatState,
          messagesBySessionId: {
            ...chatState.messagesBySessionId,
            [sessionId]: [...(chatState.messagesBySessionId[sessionId] ?? []), userMessage, responseMessage],
          },
          draftInputBySessionId: {
            ...chatState.draftInputBySessionId,
            [sessionId]: "",
          },
        },
      });
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
    refreshLocalInference,
    runGitAction: async (action: "stage_all" | "unstage_all" | "commit" | "push" | "pull", taskId: string) => {
      const task = workflow.tasks.find((entry) => entry.id === taskId);
      if (!task?.github) return;
      const activeTerminal = terminalService.getSelectedSession() ?? terminalService.createSession({
        workingDirectory: localShell.project.activeProjectRoot,
        linkedTaskId: task.id,
        linkedChatSessionId: task.linkedChatSessionId,
      });
      terminalService.selectSession(activeTerminal.id);

      const pendingPushApproval = workflow.approvals.find(
        (approval) => approval.taskId === taskId && approval.category === "push_approval" && approval.status === "pending",
      );
      const pushApproved = workflow.approvals.some(
        (approval) => approval.taskId === taskId && approval.category === "push_approval" && approval.status === "approved",
      );

      if (action === "push" && task.github.pushWorkflow.requiresApproval && !pushApproved) {
        const approvalId = pendingPushApproval?.id ?? `approval-push-${task.id}`;
        const nextApprovals = pendingPushApproval
          ? workflow.approvals
          : [
              ...workflow.approvals,
              {
                id: approvalId,
                category: "push_approval" as const,
                title: `Approve push for ${task.title}`,
                reason: `Push to ${task.github.branch?.localBranchName ?? task.branchName ?? "task branch"} requires explicit approval.`,
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

      const result =
        action === "stage_all"
          ? await gitService.stageAll()
          : action === "unstage_all"
            ? await gitService.unstageAll()
            : action === "commit"
              ? await gitService.commit(task.github.commitWorkflow.draftMessage || `chore(${task.id}): update task changes`)
              : action === "push"
                ? await gitService.push(task.github.branch?.localBranchName)
                : await gitService.pull();

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
