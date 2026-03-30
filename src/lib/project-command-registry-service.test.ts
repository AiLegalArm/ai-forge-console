import { afterEach, describe, expect, it } from "vitest";
import { buildProjectCommandRegistry } from "@/lib/project-command-registry-service";

afterEach(() => {
  delete (globalThis as { __AIFORGE_LOCAL_FS__?: unknown }).__AIFORGE_LOCAL_FS__;
});

describe("project command registry service", () => {
  it("merges commands from AGENTS.md and package.json with deduplication", async () => {
    const files = new Map<string, string>([
      ["/repo/AGENTS.md", "- `npm run test` - run tests\n- `npm run lint` - lint project"],
      ["/repo/package.json", JSON.stringify({ scripts: { test: "vitest run", lint: "eslint .", dev: "vite" } })],
    ]);

    (globalThis as { __AIFORGE_LOCAL_FS__?: unknown }).__AIFORGE_LOCAL_FS__ = {
      async exists(path: string) {
        return files.has(path);
      },
      async readFile(path: string) {
        return files.get(path) ?? "";
      },
      async join(...parts: string[]) {
        return parts.join("/").replace(/\/+/g, "/");
      },
    };

    const registry = await buildProjectCommandRegistry({ projectRoot: "/repo" });

    expect(registry.commands.length).toBeGreaterThanOrEqual(3);
    expect(registry.commands.some((entry) => entry.category === "dev")).toBe(true);
    expect(registry.commands.some((entry) => entry.source === "package.json")).toBe(true);
    expect(registry.primaryCommandIds.length).toBeGreaterThan(0);
  });

  it("adds warnings when AGENTS exists but no commands are extracted", async () => {
    const files = new Map<string, string>([
      ["/repo/AGENTS.md", "# Instructions\nNo command examples here."],
      ["/repo/package.json", JSON.stringify({ name: "demo" })],
    ]);

    (globalThis as { __AIFORGE_LOCAL_FS__?: unknown }).__AIFORGE_LOCAL_FS__ = {
      async exists(path: string) {
        return files.has(path);
      },
      async readFile(path: string) {
        return files.get(path) ?? "";
      },
      async join(...parts: string[]) {
        return parts.join("/").replace(/\/+/g, "/");
      },
    };

    const registry = await buildProjectCommandRegistry({ projectRoot: "/repo" });

    expect(registry.diagnostics.agentsFileFound).toBe(true);
    expect(registry.diagnostics.agentsCommandsExtracted).toBe(0);
    expect(registry.diagnostics.warnings.some((warning) => warning.includes("AGENTS.md found"))).toBe(true);
  });
});
