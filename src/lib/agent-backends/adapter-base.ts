import type {
  AgentBackendAvailability,
  AgentBackendCapabilities,
  AgentBackendContract,
  AgentBackendId,
  AgentBackendMetadata,
  AgentBackendSession,
  LinkedExecutionRef,
} from "@/types/agent-backends";

interface CreateMockAdapterOptions {
  id: AgentBackendId;
  metadata: AgentBackendMetadata;
  capabilities: AgentBackendCapabilities;
  availability: AgentBackendAvailability;
  eventStreamMode: AgentBackendContract["eventStreamMode"];
}

export function createPendingAdapter(options: CreateMockAdapterOptions): AgentBackendContract {
  return {
    id: options.id,
    metadata: options.metadata,
    capabilities: options.capabilities,
    eventStreamMode: options.eventStreamMode,
    async getAvailability() {
      return options.availability;
    },
    async createSession(linked?: LinkedExecutionRef): Promise<AgentBackendSession> {
      return {
        id: `${options.id}-session-placeholder`,
        backendId: options.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "created",
        linked,
        metadata: { mode: "adapter-scaffold" },
      };
    },
    async closeSession() {
      return;
    },
    async submitTask() {
      throw new Error(`${options.metadata.displayName} adapter task submission is not implemented yet.`);
    },
    async getRun() {
      return null;
    },
    async getRunResult() {
      return null;
    },
    async listEvents() {
      return { events: [] };
    },
    async cancelRun(runId: string, reason?: string) {
      return {
        runId,
        reason,
        cancelledAt: new Date().toISOString(),
      };
    },
    async respondToApproval() {
      return;
    },
  };
}
