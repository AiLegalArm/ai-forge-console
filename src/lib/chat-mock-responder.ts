import type { AgentRuntimeState } from "@/types/workspace";
import type { ChatLinkedContext, ChatMessage, ChatType, MessageRole } from "@/types/chat";

interface MockResponseContext {
  chatType: ChatType;
  prompt: string;
  currentProject: string;
  currentTask: string;
  activeProvider: string;
  activeModel: string;
  routingMode: string;
  routingProfile: string;
  deploymentMode: "local" | "cloud" | "hybrid";
  activeAgent?: AgentRuntimeState;
  linkedContext?: ChatLinkedContext;
  turnIndex: number;
}

const mainPatterns = ["plan", "status", "approval", "completion"] as const;

const resolveAgentPersona = (prompt: string, fallback?: AgentRuntimeState) => {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("planner")) return { label: "Planner Agent", lens: "planning" };
  if (lowered.includes("frontend")) return { label: "Frontend Agent", lens: "frontend" };
  if (lowered.includes("backend")) return { label: "Backend Agent", lens: "backend" };
  if (lowered.includes("review")) return { label: "Reviewer Agent", lens: "review" };
  if (lowered.includes("audit")) return { label: "Auditor Agent", lens: "audit" };
  if (fallback) {
    return {
      label: fallback.name,
      lens: fallback.role ?? "execution",
    };
  }

  return { label: "Agent Runtime", lens: "execution" };
};

const mainResponse = (context: MockResponseContext) => {
  const pattern = mainPatterns[context.turnIndex % mainPatterns.length];
  const header = `Project ${context.currentProject} • Task ${context.currentTask}`;
  const runtime = `Runtime ${context.activeProvider}/${context.activeModel} • ${context.deploymentMode} • ${context.routingProfile}`;

  if (pattern === "plan") {
    return `${header}\nOrchestrator plan:\n1) decompose scope\n2) assign agents\n3) stage implementation + verification\n4) merge review + audit evidence\n${runtime}`;
  }

  if (pattern === "status") {
    return `${header}\nStatus update: Planner and implementation agents are in-flight, with routing ${context.routingMode.replace(/_/g, " ")}.\nNext checkpoint will include risk callouts and branch status.`;
  }

  if (pattern === "approval") {
    return `${header}\nApproval checkpoint requested: proceed with implementation branch updates and audit gate checks before release packaging.\n${runtime}`;
  }

  return `${header}\nCompletion summary: implementation handoff compiled, evidence linked, and release-readiness discussion ready in Review Chat.`;
};

const buildAuditSeverity = (prompt: string) => {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("critical") || lowered.includes("blocker")) return "critical";
  if (lowered.includes("high")) return "high";
  if (lowered.includes("low")) return "low";
  return "medium";
};

const buildResponseContent = (context: MockResponseContext) => {
  switch (context.chatType) {
    case "main":
      return mainResponse(context);
    case "agent": {
      const persona = resolveAgentPersona(context.prompt, context.activeAgent);
      return `${persona.label} (${persona.lens})\nWorking on ${context.currentTask} in ${context.currentProject}.\nUsing ${context.activeProvider}/${context.activeModel} with ${context.routingProfile}.\nLatest ask captured: "${context.prompt}".`; 
    }
    case "audit": {
      const severity = buildAuditSeverity(context.prompt);
      const finding = context.linkedContext?.auditFindingId ?? "AUDIT-PENDING";
      return `Audit finding ${finding} summary:\nSeverity: ${severity}.\nBlocker analysis: scoped to ${context.currentTask}.\nRecommendation: apply least-privilege guardrails and attach validation evidence before clearance.`;
    }
    case "review":
      return `Review thread update:\nDiff focus: ${context.currentTask}.\nRelease readiness: validating blockers, tests, and audit deltas for ${context.currentProject}.\nDecision framing: hold release until unresolved issues are cleared or accepted.`;
    default:
      return `Context synced for ${context.currentTask}.`;
  }
};

export const createMockAssistantMessage = (context: MockResponseContext): Omit<ChatMessage, "id" | "sessionId" | "createdAtIso" | "status"> & { status?: ChatMessage["status"] } => {
  const role: MessageRole =
    context.chatType === "main"
      ? "orchestrator"
      : context.chatType === "agent"
        ? "agent"
        : context.chatType === "audit"
          ? "auditor"
          : "reviewer";

  const authorLabel =
    role === "orchestrator"
      ? "Orchestrator"
      : role === "agent"
        ? resolveAgentPersona(context.prompt, context.activeAgent).label
        : role === "auditor"
          ? "Audit Agent"
          : "Review Agent";

  return {
    role,
    authorLabel,
    content: buildResponseContent(context),
    linked: {
      ...context.linkedContext,
      taskTitle: context.currentTask,
      agentName: context.activeAgent?.name ?? context.linkedContext?.agentName,
    },
    providerMeta: {
      provider: context.activeProvider,
      model: context.activeModel,
      backend: context.deploymentMode === "hybrid" ? "hybrid" : context.deploymentMode,
      routingKey: context.routingProfile,
    },
  };
};
