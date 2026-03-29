import { createPendingAdapter } from "@/lib/agent-backends/adapter-base";

export const codexAdapter = createPendingAdapter({
  id: "codex",
  metadata: {
    displayName: "Codex",
    description: "CLI-native coding backend with strong local workflow integration.",
    tags: ["local", "cli", "approval"],
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
    installed: true,
    configured: true,
    status: "ready",
    health: "healthy",
    statusDetail: "Adapter contract wired; backend execution bridge pending.",
  },
  eventStreamMode: "stream",
});
