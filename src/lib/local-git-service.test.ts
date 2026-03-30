import { afterEach, describe, expect, it } from "vitest";

import { LocalGitService } from "@/lib/local-git-service";

describe("LocalGitService safeguards", () => {
  afterEach(() => {
    (globalThis as { __AIFORGE_GIT_EXEC__?: unknown }).__AIFORGE_GIT_EXEC__ = undefined;
  });

  it("blocks commit when there are no staged changes", async () => {
    (globalThis as { __AIFORGE_GIT_EXEC__?: { run: (args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }> } }).__AIFORGE_GIT_EXEC__ = {
      run: async (args: string[]) => {
        if (args[0] === "rev-parse") return { stdout: "feature/task\n", stderr: "", exitCode: 0 };
        if (args[0] === "status") return { stdout: "## feature/task...origin/feature/task\n M src/app.ts\n", stderr: "", exitCode: 0 };
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    };

    const service = new LocalGitService("/tmp/repo");
    const result = await service.commit("chore: test");

    expect(result.ok).toBe(false);
    expect(result.details).toContain("No staged changes");
  });

  it("blocks push when task branch mismatches current branch", async () => {
    (globalThis as { __AIFORGE_GIT_EXEC__?: { run: (args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }> } }).__AIFORGE_GIT_EXEC__ = {
      run: async (args: string[]) => {
        if (args[0] === "rev-parse") return { stdout: "feature/current\n", stderr: "", exitCode: 0 };
        if (args[0] === "status") return { stdout: "## feature/current...origin/feature/current [ahead 1]\n", stderr: "", exitCode: 0 };
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    };

    const service = new LocalGitService("/tmp/repo");
    const result = await service.push("feature/expected");

    expect(result.ok).toBe(false);
    expect(result.details).toContain("Branch mismatch");
  });
});
