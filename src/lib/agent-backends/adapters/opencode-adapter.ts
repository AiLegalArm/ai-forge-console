import { createPendingAdapter } from "@/lib/agent-backends/adapter-base";

export const openCodeAdapter = createPendingAdapter({
  id: "opencode",
  metadata: {
    displayName: "OpenCode",
    description: "Local-first coding agent runtime with shell and file operations.",
    tags: ["local", "cli", "coding"],
  },
  capabilities: {
    localCliExecution: true,
    multiFileEditing: true,
    taskExecution: true,
    terminalToolUse: true,
    streamingProgress: true,
    approvalIntegration: true,
    operationModes: ["local", "hybrid"],
    promptSystemConfig: true,
  },
  availability: {
    installed: false,
    configured: false,
    status: "not_configured",
    health: "unknown",
    statusDetail: "Binary path and runtime config not set.",
  },
  eventStreamMode: "stream",
});
