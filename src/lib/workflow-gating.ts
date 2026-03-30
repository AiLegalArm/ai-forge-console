import type { AuditBlockerCondition, AuditBlockingSeverity, AuditorControlState, AuditorFinding } from "@/types/audits";
import type { TaskStatus, WorkflowSubtask, WorkflowTask, WorkflowTaskRollup } from "@/types/workflow";

const findingSeverityToBlockingSeverity = (severity: AuditorFinding["severity"]): AuditBlockingSeverity =>
  severity === "critical" || severity === "high" ? "critical" : "warning";

const buildUnblockCondition = (finding: AuditorFinding): string =>
  `${finding.auditorType} auditor: resolve ${finding.id} (${finding.recommendation})`;

export function buildAuditBlockers(control: AuditorControlState): AuditBlockerCondition[] {
  return control.findings
    .filter((finding) => finding.blocking && finding.status !== "resolved" && finding.status !== "dismissed")
    .map((finding) => {
      const sourceAuditor = control.auditors.find((auditor) => auditor.type === finding.auditorType);
      const entityType = finding.linked.releaseCandidateId
        ? "release_candidate"
        : finding.linked.reviewId
          ? "review"
          : finding.linked.taskId && finding.scope.scopeType === "task" && finding.scope.scopeId.startsWith("subtask-")
            ? "subtask"
            : "task";

      const entityId =
        (entityType === "release_candidate" ? finding.linked.releaseCandidateId : undefined) ??
        (entityType === "review" ? finding.linked.reviewId : undefined) ??
        (entityType === "subtask" ? finding.scope.scopeId : undefined) ??
        finding.linked.taskId ??
        finding.scope.scopeId;

      return {
        id: `block-${finding.id}`,
        sourceAuditorId: sourceAuditor?.id ?? `aud-${finding.auditorType}`,
        sourceAuditorType: finding.auditorType,
        linkedFindingIds: [finding.id],
        blockingSeverity: findingSeverityToBlockingSeverity(finding.severity),
        entityType,
        entityId,
        unblockCondition: buildUnblockCondition(finding),
        rationale: finding.description,
        status: "active",
        createdAtIso: finding.createdAtIso,
        updatedAtIso: finding.createdAtIso,
      } satisfies AuditBlockerCondition;
    });
}

export function applySubtaskAuditBlocking(subtasks: WorkflowSubtask[], blockers: AuditBlockerCondition[]): WorkflowSubtask[] {
  return subtasks.map((subtask) => {
    const hasSubtaskBlocker = blockers.some((blocker) => blocker.entityType === "subtask" && blocker.entityId === subtask.id && blocker.status === "active");
    const hasTaskInheritedCritical = blockers.some(
      (blocker) => blocker.entityType === "task" && blocker.entityId === subtask.taskId && blocker.blockingSeverity === "critical" && blocker.status === "active",
    );

    if ((hasSubtaskBlocker || hasTaskInheritedCritical) && subtask.status !== "failed") {
      return { ...subtask, status: "blocked" as TaskStatus };
    }
    return subtask;
  });
}

export function buildTaskRollup(task: WorkflowTask, subtasks: WorkflowSubtask[], blockers: AuditBlockerCondition[]): WorkflowTaskRollup {
  const taskSubtasks = subtasks.filter((subtask) => subtask.taskId === task.id);
  const blockedSubtasks = taskSubtasks.filter((subtask) => subtask.status === "blocked");
  const criticalBlockedSubtasks = blockedSubtasks.filter((subtask) => subtask.criticalPath);
  const taskBlockers = blockers.filter(
    (blocker) => blocker.status === "active" && ((blocker.entityType === "task" && blocker.entityId === task.id) || (blocker.entityType === "subtask" && taskSubtasks.some((subtask) => subtask.id === blocker.entityId))),
  );

  const gateStatus = criticalBlockedSubtasks.length > 0 || taskBlockers.some((blocker) => blocker.blockingSeverity === "critical")
    ? "blocked"
    : blockedSubtasks.length > 0 || taskBlockers.length > 0
      ? "warning"
      : "ready";

  return {
    totalSubtasks: taskSubtasks.length,
    completedSubtasks: taskSubtasks.filter((subtask) => subtask.status === "completed").length,
    blockedSubtasks: blockedSubtasks.length,
    criticalBlockedSubtasks: criticalBlockedSubtasks.length,
    blockerIds: taskBlockers.map((blocker) => blocker.id),
    gateStatus,
  };
}

export function applyParentTaskBlocking(tasks: WorkflowTask[], subtasks: WorkflowSubtask[], blockers: AuditBlockerCondition[]): WorkflowTask[] {
  return tasks.map((task) => {
    const rollup = buildTaskRollup(task, subtasks, blockers);
    const hasReviewOrReleaseBlocker = blockers.some(
      (blocker) =>
        blocker.status === "active" &&
        ((blocker.entityType === "review" && blocker.entityId === task.linkedReviewId) ||
          (blocker.entityType === "release_candidate" && blocker.entityId === task.linkedReleaseCandidateId)),
    );

    const isBlockedByRollup = rollup.gateStatus === "blocked" || hasReviewOrReleaseBlocker;
    const shouldRemainIncomplete = task.status === "completed" && (rollup.blockedSubtasks > 0 || hasReviewOrReleaseBlocker);

    return {
      ...task,
      status: isBlockedByRollup ? "blocked" : shouldRemainIncomplete ? "in_progress" : task.status,
      rollup,
    };
  });
}
