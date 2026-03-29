import type { ProviderBackend } from "@/types/local-inference";

export type RoutingPresetId =
  | "or_fast"
  | "or_balanced"
  | "or_deep"
  | "or_code_heavy"
  | "or_audit_strict"
  | "or_release_critical"
  | "ol_local_fast"
  | "ol_local_balanced"
  | "ol_local_private"
  | "ol_local_reviewer";

export type RoutingAgentId =
  | "planner"
  | "architect"
  | "frontend"
  | "backend"
  | "supabase"
  | "designer"
  | "browser"
  | "reviewer"
  | "deploy"
  | "domain"
  | "codeAuditor"
  | "securityAuditor"
  | "aiAuditor"
  | "promptAuditor"
  | "toolAuditor"
  | "gitAuditor"
  | "testAuditor"
  | "releaseAuditor";

export type AppRoutingModeProfile = "cheap_fast" | "balanced" | "quality_first" | "privacy_first" | "local_only";

export interface RoutingPresetDefinition {
  provider: "openrouter" | "ollama";
  backend: ProviderBackend;
  profile: string;
  purpose: readonly string[];
}

export interface AgentRoutePrimaryFallback {
  primary: RoutingPresetId;
  fallback: RoutingPresetId;
}

export interface AgentRoutePasses {
  firstPass: RoutingPresetId;
  finalPass: RoutingPresetId;
}

export interface AppRoutingModeDefinition {
  planner: RoutingPresetId;
  workers: readonly RoutingPresetId[];
  reviewer: RoutingPresetId;
  auditorsFirstPass: readonly RoutingPresetId[];
  auditorsFinalPass: readonly RoutingPresetId[];
  release: RoutingPresetId;
  cloudAllowed: boolean;
}

export const routingPresets = {
  cloud: {
    or_fast: {
      provider: "openrouter",
      backend: "cloud",
      profile: "cheap_fast",
      purpose: ["summary", "quick_plan", "light_audit"],
    },
    or_balanced: {
      provider: "openrouter",
      backend: "cloud",
      profile: "balanced",
      purpose: ["planner", "general_reasoning", "review"],
    },
    or_deep: {
      provider: "openrouter",
      backend: "cloud",
      profile: "deep_reasoning",
      purpose: ["architecture", "complex_review", "ai_audit"],
    },
    or_code_heavy: {
      provider: "openrouter",
      backend: "cloud",
      profile: "code_heavy",
      purpose: ["frontend", "backend", "supabase", "refactor"],
    },
    or_audit_strict: {
      provider: "openrouter",
      backend: "cloud",
      profile: "audit_strict",
      purpose: ["security_audit", "git_audit", "test_audit", "release_gate"],
    },
    or_release_critical: {
      provider: "openrouter",
      backend: "cloud",
      profile: "release_critical",
      purpose: ["release_go_no_go", "final_review"],
    },
  },

  local: {
    ol_local_fast: {
      provider: "ollama",
      backend: "ollama",
      profile: "local_fast",
      purpose: ["quick_checks", "summary", "prompt_lint", "tool_lint"],
    },
    ol_local_balanced: {
      provider: "ollama",
      backend: "ollama",
      profile: "local_balanced",
      purpose: ["planner_local", "code_audit_first_pass", "docs", "fallback"],
    },
    ol_local_private: {
      provider: "ollama",
      backend: "local",
      profile: "local_private",
      purpose: ["privacy_sensitive", "security_first_pass", "internal_only"],
    },
    ol_local_reviewer: {
      provider: "ollama",
      backend: "ollama",
      profile: "local_reviewer",
      purpose: ["diff_summary", "review_first_pass"],
    },
  },
} as const satisfies {
  cloud: Record<string, RoutingPresetDefinition>;
  local: Record<string, RoutingPresetDefinition>;
};

export const agentRoutingDefaults = {
  planner: {
    primary: "or_balanced",
    fallback: "ol_local_balanced",
  },
  architect: {
    primary: "or_deep",
    fallback: "or_balanced",
  },
  frontend: {
    primary: "or_code_heavy",
    fallback: "or_balanced",
  },
  backend: {
    primary: "or_code_heavy",
    fallback: "or_deep",
  },
  supabase: {
    primary: "or_code_heavy",
    fallback: "or_balanced",
  },
  designer: {
    primary: "or_balanced",
    fallback: "ol_local_balanced",
  },
  browser: {
    primary: "or_balanced",
    fallback: "ol_local_balanced",
  },
  reviewer: {
    primary: "or_deep",
    fallback: "or_balanced",
  },
  deploy: {
    primary: "or_balanced",
    fallback: "ol_local_fast",
  },
  domain: {
    primary: "or_balanced",
    fallback: "ol_local_fast",
  },

  codeAuditor: {
    firstPass: "ol_local_balanced",
    finalPass: "or_audit_strict",
  },
  securityAuditor: {
    firstPass: "ol_local_private",
    finalPass: "or_audit_strict",
  },
  aiAuditor: {
    firstPass: "or_balanced",
    finalPass: "or_deep",
  },
  promptAuditor: {
    firstPass: "ol_local_fast",
    finalPass: "or_balanced",
  },
  toolAuditor: {
    firstPass: "ol_local_fast",
    finalPass: "or_balanced",
  },
  gitAuditor: {
    firstPass: "ol_local_balanced",
    finalPass: "or_audit_strict",
  },
  testAuditor: {
    firstPass: "ol_local_balanced",
    finalPass: "or_audit_strict",
  },
  releaseAuditor: {
    primary: "or_release_critical",
    fallback: "or_audit_strict",
  },
} as const satisfies Record<RoutingAgentId, AgentRoutePrimaryFallback | AgentRoutePasses>;

export const appRoutingModes = {
  cheap_fast: {
    planner: "ol_local_fast",
    workers: ["or_balanced"],
    reviewer: "or_fast",
    auditorsFirstPass: ["ol_local_fast"],
    auditorsFinalPass: ["or_fast"],
    release: "or_audit_strict",
    cloudAllowed: true,
  },
  balanced: {
    planner: "or_balanced",
    workers: ["or_code_heavy", "or_balanced"],
    reviewer: "or_balanced",
    auditorsFirstPass: ["ol_local_balanced", "ol_local_fast"],
    auditorsFinalPass: ["or_balanced", "or_audit_strict"],
    release: "or_audit_strict",
    cloudAllowed: true,
  },
  quality_first: {
    planner: "or_deep",
    workers: ["or_code_heavy", "or_deep"],
    reviewer: "or_deep",
    auditorsFirstPass: ["ol_local_balanced"],
    auditorsFinalPass: ["or_audit_strict", "or_deep"],
    release: "or_release_critical",
    cloudAllowed: true,
  },
  privacy_first: {
    planner: "ol_local_balanced",
    workers: ["ol_local_private", "ol_local_balanced"],
    reviewer: "ol_local_reviewer",
    auditorsFirstPass: ["ol_local_private"],
    auditorsFinalPass: ["ol_local_private", "or_audit_strict"],
    release: "or_audit_strict",
    cloudAllowed: true,
  },
  local_only: {
    planner: "ol_local_balanced",
    workers: ["ol_local_private", "ol_local_balanced", "ol_local_fast"],
    reviewer: "ol_local_reviewer",
    auditorsFirstPass: ["ol_local_private", "ol_local_fast", "ol_local_balanced"],
    auditorsFinalPass: ["ol_local_private", "ol_local_balanced"],
    release: "ol_local_private",
    cloudAllowed: false,
  },
} as const satisfies Record<AppRoutingModeProfile, AppRoutingModeDefinition>;
