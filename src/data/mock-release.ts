export interface ReleaseGate {
  id: string;
  name: string;
  status: "passed" | "failed" | "pending" | "blocked";
  details: string;
}

export const releaseGates: ReleaseGate[] = [
  { id: "rg-1", name: "Build Status", status: "passed", details: "All builds passing, 0 errors" },
  { id: "rg-2", name: "Code Audit", status: "passed", details: "No critical findings" },
  { id: "rg-3", name: "Security Audit", status: "failed", details: "2 critical vulnerabilities found" },
  { id: "rg-4", name: "Test Coverage", status: "failed", details: "37% coverage (min 80%)" },
  { id: "rg-5", name: "Performance Audit", status: "passed", details: "LCP < 2.5s, CLS < 0.1" },
  { id: "rg-6", name: "Dependency Scan", status: "passed", details: "No known CVEs" },
  { id: "rg-7", name: "Rollback Ready", status: "passed", details: "Previous version snapshot available" },
  { id: "rg-8", name: "Signoff", status: "pending", details: "Awaiting approval" },
];

export const releaseVerdict = {
  status: "blocked" as const,
  blockers: 2,
  highIssues: 3,
  passedGates: 5,
  totalGates: 8,
  rollbackReady: true,
};
