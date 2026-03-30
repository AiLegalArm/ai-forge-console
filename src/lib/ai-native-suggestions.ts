import type { WorkflowTask } from "@/types/workflow";
import type { WorkspaceRuntimeState } from "@/types/workspace";

export type SmartActionId =
  | "resume_last_task"
  | "plan_subtasks"
  | "retry_failed_run"
  | "run_audit"
  | "review_blockers"
  | "open_release_panel"
  | "inspect_release_blockers"
  | "approve_push"
  | "switch_to_local_mode"
  | "switch_provider_fallback"
  | "reconnect_provider"
  | "run_tests"
  | "open_terminal_output"
  | "open_review"
  | "block_release"
  | "run_dev_server"
  | "open_diff_review";

export interface SmartActionSuggestion {
  id: SmartActionId;
  label: string;
  reason: string;
  tone?: "default" | "warning" | "danger";
}

const actionLabel: Record<SmartActionId, string> = {
  resume_last_task: "Resume last task",
  plan_subtasks: "Plan subtasks",
  retry_failed_run: "Retry failed run",
  run_audit: "Run audit",
  review_blockers: "Review blockers",
  open_release_panel: "Open release panel",
  inspect_release_blockers: "Inspect release blockers",
  approve_push: "Approve push",
  switch_to_local_mode: "Switch to local mode",
  switch_provider_fallback: "Retry with fallback",
  reconnect_provider: "Reconnect provider",
  run_tests: "Run tests",
  open_terminal_output: "Open terminal output",
  open_review: "Open review",
  block_release: "Move to no-go",
  run_dev_server: "Run dev server",
  open_diff_review: "Open diff review",
};

function taskHasNoSubtasks(state: WorkspaceRuntimeState, activeTask?: WorkflowTask) {
  if (!activeTask) return false;
  return state.workflow.subtasks.every((subtask) => subtask.parentTaskId !== activeTask.id);
}

export function getSmartActionSuggestions(state: WorkspaceRuntimeState): SmartActionSuggestion[] {
  const actions: SmartActionSuggestion[] = [];
  const activeTask = state.workflow.tasks.find((task) => task.id === state.currentTask) ?? state.workflow.tasks[0];
  const failedTask = state.workflow.tasks.find((task) => task.status === "failed");
  const pendingApproval = state.pendingApprovals[0];
  const blockingEvidence = state.evidenceFlow.records.find((record) => record.blocking);
  const releaseBlocked = state.releaseControl.operationsPanel.decisionSurface.status === "no_go"
    || state.releaseControl.operationsPanel.decisionSurface.status === "blocked";
  const providerDegraded = state.providerSource === "ollama"
    ? !state.localInference.ollama.connectionHealthy
    : state.localInference.cloud.status !== "connected";
  const latestTerminalError = state.localShell.terminal.output.find((line) => line.stream === "stderr");
  const suggestedAgentCommand = state.workflow.agentCommandRequests.find((request) => request.origin === "agent_suggested_command");

  if (activeTask && taskHasNoSubtasks(state, activeTask) && activeTask.phase === "planning") {
    actions.push({ id: "plan_subtasks", label: actionLabel.plan_subtasks, reason: "Task exists without delegated subtasks." });
  }
  if (failedTask) {
    actions.push({ id: "retry_failed_run", label: actionLabel.retry_failed_run, reason: `${failedTask.id} is failed.`, tone: "warning" });
  }
  if (blockingEvidence) {
    actions.push({ id: "open_review", label: actionLabel.open_review, reason: "Evidence is linked and marked as blocking.", tone: "warning" });
    actions.push({ id: "block_release", label: actionLabel.block_release, reason: "Blocking evidence should gate release.", tone: "danger" });
  }
  if (releaseBlocked) {
    actions.push({ id: "inspect_release_blockers", label: actionLabel.inspect_release_blockers, reason: "Release decision surface is blocked.", tone: "danger" });
  }
  if (providerDegraded) {
    actions.push({ id: "reconnect_provider", label: actionLabel.reconnect_provider, reason: `${state.providerSource} is not healthy.`, tone: "warning" });
    actions.push({ id: "switch_provider_fallback", label: actionLabel.switch_provider_fallback, reason: "Fallback path is available." });
  }
  if (pendingApproval) {
    actions.push({ id: "approve_push", label: actionLabel.approve_push, reason: `${pendingApproval.title} is waiting.` });
  }
  if (state.deploymentMode !== "local") {
    actions.push({ id: "switch_to_local_mode", label: actionLabel.switch_to_local_mode, reason: "Local mode lowers external dependency risk." });
  }
  if (state.projectCommandRegistry.commands.some((command) => command.category === "test")) {
    actions.push({ id: "run_tests", label: actionLabel.run_tests, reason: "Test command is available in this workspace." });
  }
  if (latestTerminalError) {
    actions.push({ id: "open_terminal_output", label: actionLabel.open_terminal_output, reason: "Recent terminal stderr output detected.", tone: "warning" });
  }
  if (suggestedAgentCommand) {
    actions.push({ id: "run_dev_server", label: actionLabel.run_dev_server, reason: `Agent suggested: ${suggestedAgentCommand.rawCommand}` });
    actions.push({ id: "open_diff_review", label: actionLabel.open_diff_review, reason: "Reviewer flow is available in chat/review." });
  }
  if (activeTask) {
    actions.push({ id: "resume_last_task", label: actionLabel.resume_last_task, reason: `Current focus task is ${activeTask.id}.` });
  }
  actions.push({ id: "run_audit", label: actionLabel.run_audit, reason: "Keep workflow and release checks fresh." });
  actions.push({ id: "open_release_panel", label: actionLabel.open_release_panel, reason: "Review go/no-go surface before push." });
  actions.push({ id: "review_blockers", label: actionLabel.review_blockers, reason: "Maintain blocker awareness in operator flow." });

  const deduped = new Map<SmartActionId, SmartActionSuggestion>();
  actions.forEach((action) => {
    if (!deduped.has(action.id)) deduped.set(action.id, action);
  });
  return Array.from(deduped.values());
}
