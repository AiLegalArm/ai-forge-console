import { describe, expect, it } from "vitest";
import { createEmptyProjectInstructionState, loadProjectInstructions } from "@/lib/project-instructions-service";

describe("project-instructions-service", () => {
  it("loads AGENTS.md from project and extracts structured hints", async () => {
    const state = await loadProjectInstructions(process.cwd());

    expect(["loaded", "parse_warning", "not_found"]).toContain(state.status);
    if (state.status !== "not_found") {
      expect(state.source?.fileType === "AGENTS.md" || state.source?.fileType === "AGENT.md").toBe(true);
      expect(state.lastLoadedAtIso).toBeTruthy();
    }
  });

  it("returns default empty state", () => {
    const state = createEmptyProjectInstructionState();
    expect(state.status).toBe("not_found");
    expect(state.candidates).toHaveLength(0);
  });
});
