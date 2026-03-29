import { auditGateDecisions, auditFindings } from "@/data/mock-audits";

export interface ReleaseGate {
  id: string;
  name: string;
  status: "passed" | "failed" | "pending" | "blocked";
  details: string;
}

const gateToReleaseGate: Record<string, ReleaseGate["name"]> = {
  push_readiness: "Push Readiness",
  review_readiness: "Review Readiness",
  merge_readiness: "Merge Readiness",
  release_readiness: "Release Readiness",
  deploy_readiness: "Deploy Readiness",
};

export const releaseGates: ReleaseGate[] = auditGateDecisions.map((gate) => {
  const blockers = gate.blockingFindingIds.length;
  return {
    id: `rg-${gate.stage}`,
    name: gateToReleaseGate[gate.stage],
    status: gate.verdict === "go" ? "passed" : gate.verdict === "not_ready" ? "pending" : "failed",
    details: blockers > 0 ? `${blockers} blocking findings` : "No blocking findings",
  };
});

const highAndCritical = auditFindings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
const noGoCount = auditGateDecisions.filter((gate) => gate.verdict === "no_go").length;

export const releaseVerdict = {
  status: noGoCount > 0 ? ("blocked" as const) : ("passed" as const),
  blockers: auditFindings.filter((finding) => finding.blocking && finding.status !== "resolved").length,
  highIssues: highAndCritical,
  passedGates: releaseGates.filter((gate) => gate.status === "passed").length,
  totalGates: releaseGates.length,
  rollbackReady: true,
};
