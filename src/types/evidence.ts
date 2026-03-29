import type { FindingSeverity } from "@/types/audits";

export type EvidenceSource = "designer_agent" | "browser_agent" | "auditor" | "review_workflow";

export type EvidenceKind =
  | "screenshot"
  | "console_finding"
  | "network_finding"
  | "ux_observation"
  | "design_note"
  | "component_handoff"
  | "scenario_trace"
  | "chat_reference";

export interface EvidenceLinkRef {
  chatSessionId?: string;
  taskId?: string;
  branchName?: string;
  reviewId?: string;
  releaseCandidateId?: string;
  findingId?: string;
}

export interface EvidenceAsset {
  id: string;
  label: string;
  kind: "screenshot" | "log" | "trace" | "note";
  uri: string;
  mimeType?: string;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  summary: string;
  source: EvidenceSource;
  kind: EvidenceKind;
  severity: FindingSeverity;
  blocking: boolean;
  createdAtIso: string;
  tags: string[];
  assets: EvidenceAsset[];
  links: EvidenceLinkRef;
}

export interface EvidenceFlowState {
  records: EvidenceRecord[];
  linkedByChatSessionId: Record<string, string[]>;
  linkedByTaskId: Record<string, string[]>;
  linkedByReviewId: Record<string, string[]>;
  releaseReadinessBlockers: string[];
}
