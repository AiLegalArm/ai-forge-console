import { describe, expect, it } from "vitest";
import { auditorControlState } from "@/data/mock-audits";
import { initialChatState } from "@/data/mock-chat";
import { releaseControlState } from "@/data/mock-release-control";
import { workflowState } from "@/data/mock-workflow";
import { buildWorkspaceMemorySnapshot, mergeWorkspaceMemory, retrieveMemoryContext } from "@/lib/workspace-memory-service";
import type { ProjectCommandRegistry } from "@/types/project-commands";

const commandRegistry: ProjectCommandRegistry = {
  projectRoot: "/tmp/project",
  generatedAtIso: "2026-03-30T00:00:00.000Z",
  commands: [],
  primaryCommandIds: [],
  diagnostics: {
    agentsFileFound: true,
    agentsCommandsExtracted: 2,
    packageJsonFound: true,
    packageScriptsExtracted: 4,
    makefileFound: false,
    makeTargetsExtracted: 0,
    warnings: [],
  },
};

describe("workspace-memory-service", () => {
  it("builds typed memory snapshot with indexes", () => {
    const snapshot = buildWorkspaceMemorySnapshot({
      projectId: "project-local-1",
      projectName: "Console",
      projectPath: "/workspace/ai-forge-console",
      repositorySummary: "ai-forge-console @ main (up_to_date)",
      discoveredInstructions: ["AGENTS.md"],
      commandRegistry,
      providerSource: "ollama",
      activeModel: "qwen3-coder:14b",
      deploymentMode: "hybrid",
      localCloudPreference: "hybrid",
      knownConventions: ["AGENTS.md instructions present"],
      workflow: workflowState,
      auditors: auditorControlState,
      releaseControl: releaseControlState,
      chatState: initialChatState,
      currentChatType: "main",
      currentChatSessionId: initialChatState.selectedSessionIdByType.main,
    });

    expect(snapshot.project.activeProjectId).toBe("project-local-1");
    expect(snapshot.tasks.length).toBeGreaterThan(0);
    expect(snapshot.decisions.length).toBeGreaterThan(0);
    expect(snapshot.indexes.tasksById[snapshot.tasks[0].taskId]).toBe(0);
  });

  it("merges durable memory while preserving bounded history", () => {
    const next = buildWorkspaceMemorySnapshot({
      projectId: "project-local-1",
      projectName: "Console",
      projectPath: "/workspace/ai-forge-console",
      repositorySummary: "repo",
      discoveredInstructions: ["AGENTS.md"],
      commandRegistry,
      providerSource: "openrouter",
      activeModel: "openai/gpt-4.1",
      deploymentMode: "cloud",
      localCloudPreference: "cloud",
      knownConventions: ["package.json scripts workflow"],
      workflow: workflowState,
      auditors: auditorControlState,
      releaseControl: releaseControlState,
      chatState: initialChatState,
      currentChatType: "agent",
      currentChatSessionId: initialChatState.selectedSessionIdByType.agent,
    });

    const merged = mergeWorkspaceMemory(next, next);
    expect(merged.tasks.length).toBeLessThanOrEqual(20);
    expect(merged.decisions.length).toBeLessThanOrEqual(30);
    expect(Object.keys(merged.indexes.tasksById).length).toBeGreaterThan(0);
  });

  it("retrieves shaped context for release and agent audiences", () => {
    const snapshot = buildWorkspaceMemorySnapshot({
      projectId: "project-local-1",
      projectName: "Console",
      projectPath: "/workspace/ai-forge-console",
      repositorySummary: "repo",
      discoveredInstructions: ["AGENTS.md"],
      commandRegistry,
      providerSource: "ollama",
      activeModel: "qwen3-coder:14b",
      deploymentMode: "hybrid",
      localCloudPreference: "hybrid",
      knownConventions: ["AGENTS.md instructions present"],
      workflow: workflowState,
      auditors: auditorControlState,
      releaseControl: releaseControlState,
      chatState: initialChatState,
      currentChatType: "review",
      currentChatSessionId: initialChatState.selectedSessionIdByType.review,
    });

    const releaseContext = retrieveMemoryContext(snapshot, {
      projectId: "project-local-1",
      releaseCandidateId: releaseControlState.activeCandidateId,
      audience: "release",
    });
    const agentContext = retrieveMemoryContext(snapshot, {
      projectId: "project-local-1",
      taskId: workflowState.tasks[0]?.id,
      audience: "agent",
    });

    expect(releaseContext.decisions.every((decision) => ["release", "audit_resolution"].includes(decision.decisionType))).toBe(true);
    expect(agentContext.project.projectName).toBe("Console");
    expect(agentContext.provider.activeProviderContext.model.length).toBeGreaterThan(0);
  });
});
