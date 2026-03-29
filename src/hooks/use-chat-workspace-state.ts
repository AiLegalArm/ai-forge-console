import { useEffect, useMemo, useReducer, useRef } from "react";
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
import type { ChatState, ChatType } from "@/types/chat";
import type { LocalInferenceRuntimeState } from "@/types/local-inference";
import type { LocalShellWorkspaceState, TerminalCommand } from "@/types/local-shell";
import type { WorkflowState } from "@/types/workflow";
import type { ChatContextMap, WorkspaceRuntimeState } from "@/types/workspace";

type Action =
  | { type: "set_active_chat_type"; chatType: ChatType }
  | { type: "select_session"; chatType: ChatType; sessionId: string }
  | { type: "update_draft"; sessionId: string; value: string }
  | { type: "clear_approval"; sessionId: string }
  | { type: "approve_workflow_approval"; approvalId: string }
  | { type: "set_local_inference"; localInference: LocalInferenceRuntimeState }
  | { type: "set_local_shell"; localShell: LocalShellWorkspaceState }
  | { type: "set_chat"; chat: ChatState }
  | { type: "set_workflow"; workflow: WorkflowState };

interface WorkspaceReducerState {
  chat: ChatState;
  workflow: WorkflowState;
  localInference: LocalInferenceRuntimeState;
  localShell: LocalShellWorkspaceState;
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
  });

  const chatState = state.chat;
  const workflow = state.workflow;
  const localInference = state.localInference;
  const localShell = state.localShell;
  const localInferenceRef = useRef(localInference);
  localInferenceRef.current = localInference;
  const localShellRef = useRef(localShell);
  localShellRef.current = localShell;
  const gitService = useMemo(() => createLocalGitService(localShellState.project.activeProjectRoot), []);
  const terminalService = useMemo(
    () => createLocalTerminalExecutionService(localShellState.project.activeProjectRoot),
    [],
  );

  const currentChatType = chatState.activeChatType;
  const currentChatSessionId = chatState.selectedSessionIdByType[currentChatType];
  const currentSession = chatState.sessions.find((session) => session.id === currentChatSessionId);

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
    const snapshot = await ollamaRuntimeService.getRuntimeSnapshot(currentLocalInference.ollama.selectedModelId);

    const nextRoutingMode = snapshot.connection.runtimeAvailable
      ? currentLocalInference.routing.activeMode
      : currentLocalInference.routing.activeMode === "local_only" || currentLocalInference.routing.activeMode === "sensitive_local_only"
        ? "hybrid"
        : currentLocalInference.routing.activeMode;

    const nextAgentAssignments = currentLocalInference.routing.agentAssignments.map((assignment) => {
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

    dispatch({
      type: "set_local_inference",
      localInference: {
        ...currentLocalInference,
        ollama: snapshot.connection,
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

  const workspaceState: WorkspaceRuntimeState = {
    currentProject: localShell.project.workspaceName,
    currentBranch:
      activeWorkflowTask?.github?.branch?.localBranchName ??
      localShell.project.gitBranch ??
      activeWorkflowTask?.branchName ??
      activeRepository?.defaultBranch ??
      "main",
    currentTask: activeWorkflowTask?.title ?? currentSession?.linked.taskTitle ?? "Build user management module",
    activeProvider: currentSession?.providerMeta.provider ?? "Anthropic",
    activeBackend: currentSession?.providerMeta.backend ?? "hybrid",
    privacyMode: "private",
    syncStatus: activeRepository?.state ?? "disconnected",
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
    browserSession,
    evidenceFlow: evidenceFlowState,
    releaseControl: releaseControlState,
    localInference,
    localShell,
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
                category: "push_approval",
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
