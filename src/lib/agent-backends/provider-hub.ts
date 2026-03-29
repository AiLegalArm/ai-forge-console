import { claudeCodeAdapter } from "@/lib/agent-backends/adapters/claude-code-adapter";
import { clineAdapter } from "@/lib/agent-backends/adapters/cline-adapter";
import { codexAdapter } from "@/lib/agent-backends/adapters/codex-adapter";
import { openCodeAdapter } from "@/lib/agent-backends/adapters/opencode-adapter";
import type { AgentBackendContract, AgentBackendId, AgentBackendSummary } from "@/types/agent-backends";

const backends: AgentBackendContract[] = [openCodeAdapter, codexAdapter, claudeCodeAdapter, clineAdapter];

export async function listAgentBackendSummaries(): Promise<AgentBackendSummary[]> {
  return Promise.all(
    backends.map(async (backend) => ({
      id: backend.id,
      metadata: backend.metadata,
      capabilities: backend.capabilities,
      availability: await backend.getAvailability(),
      eventStreamMode: backend.eventStreamMode,
    })),
  );
}

export function getAgentBackendById(backendId: AgentBackendId): AgentBackendContract | undefined {
  return backends.find((backend) => backend.id === backendId);
}
