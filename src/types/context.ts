import type { ChatType } from "@/types/chat";
import type { AuditorType, AuditorVerdict } from "@/types/audits";
import type { GoNoGoStatus } from "@/types/release";
import type { TaskStatus } from "@/types/workflow";

export type ContextTarget =
  | "main_chat"
  | "agent_chat"
  | "audit_chat"
  | "review_chat"
  | "worker_agent"
  | "auditor"
  | "release_flow";

export interface ContextSnippet {
  label: string;
  value: string;
  priority: "high" | "medium" | "low";
}

export interface ContextInjectionPacket {
  id: string;
  target: ContextTarget;
  chatType?: ChatType;
  taskId?: string;
  agentId?: string;
  auditorType?: AuditorType;
  assembledAtIso: string;
  summary: string;
  snippets: ContextSnippet[];
  blockers: string[];
  releaseStatus?: GoNoGoStatus;
  taskStatus?: TaskStatus;
  auditVerdict?: AuditorVerdict;
}
