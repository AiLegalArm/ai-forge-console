import { createPendingAdapter } from "@/lib/agent-backends/adapter-base";

export const clineAdapter = createPendingAdapter({
  id: "cline",
  metadata: {
    displayName: "Cline",
    description: "Task-driven code agent backend with filesystem and terminal action loops.",
    tags: ["local", "extension", "tasking"],
  },
  capabilities: {
    localCliExecution: true,
    multiFileEditing: true,
    taskExecution: true,
    terminalToolUse: true,
    streamingProgress: false,
    approvalIntegration: true,
    operationModes: ["local", "cloud", "hybrid"],
    promptSystemConfig: true,
  },
  availability: {
    installed: false,
    configured: false,
    status: "not_installed",
    health: "unhealthy",
    statusDetail: "Runtime bridge is not installed on this machine.",
  },
  eventStreamMode: "poll",
});
