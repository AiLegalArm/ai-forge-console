import { describe, expect, it } from "vitest";

import { LocalGitHubService } from "@/lib/local-github-service";

describe("LocalGitHubService", () => {
  it("fails draft validation when source and target branch are equal", async () => {
    const service = new LocalGitHubService("/tmp/repo");
    const result = await service.validatePullRequestReadiness({
      sourceBranch: "main",
      targetBranch: "main",
    });

    expect(result.ok).toBe(false);
    expect(result.details).toContain("must be different");
  });

  it("generates draft metadata with linked context", () => {
    const service = new LocalGitHubService("/tmp/repo");
    const draft = service.preparePullRequestDraft({
      taskId: "task-1",
      taskTitle: "Implement workflow",
      sourceBranch: "feature/task-1",
      targetBranch: "main",
      linkedSubtaskIds: ["sub-1"],
      linkedAuditId: "audit-1",
      commitSummary: "Implemented real push flow",
    });

    expect(draft.title).toContain("task-1");
    expect(draft.body).toContain("sub-1");
    expect(draft.body).toContain("audit-1");
  });
});
