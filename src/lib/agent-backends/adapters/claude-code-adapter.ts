import { createPendingAdapter } from "@/lib/agent-backends/adapter-base";

export const claudeCodeAdapter = createPendingAdapter({
  id: "claude_code",
  metadata: {
    displayName: "Claude Code",
    description: "Anthropic-backed coding assistant runtime through local tooling.",
    tags: ["cloud", "cli", "coding"],
  },
  capabilities: {
    localCliExecution: true,
    multiFileEditing: true,
    taskExecution: true,
    terminalToolUse: true,
    streamingProgress: true,
    approvalIntegration: true,
    operationModes: ["cloud", "hybrid"],
    promptSystemConfig: true,
  },
  availability: {
    installed: true,
    configured: false,
    status: "configured",
    health: "degraded",
    statusDetail: "API credential wiring incomplete for execution path.",
  },
  eventStreamMode: "stream",
});
