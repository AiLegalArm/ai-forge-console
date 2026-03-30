/**
 * Atomic Design Tokens
 * Single source of truth for all visual primitives.
 * All UI must consume tokens — no inline colors, spacing, or radii.
 */

export const tokens = {
  color: {
    bg: {
      primary: "#0B0B0C",
      secondary: "#111113",
      tertiary: "#161618",
    },
    border: {
      subtle: "#1F1F23",
      default: "#2A2A2E",
    },
    text: {
      primary: "#EDEDED",
      secondary: "#A1A1AA",
      muted: "#6B7280",
    },
    functional: {
      success: "#22C55E",
      error: "#EF4444",
      warning: "#F59E0B",
      accent: "#3B82F6",
    },
  },

  typography: {
    fontFamily: {
      sans: "Inter, system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: "11px",
      sm: "12px",
      md: "13px",
      base: "14px",
      lg: "16px",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.4",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
  },

  spacing: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
  },

  radius: {
    sm: "4px",
    md: "6px",
  },

  layout: {
    sidebar: { width: "240px", collapsedWidth: "48px" },
    rightPanel: { width: "320px" },
    panel: { padding: "12px", gap: "8px" },
    topBar: { height: "40px" },
  },

  state: {
    active: { bg: "var(--accent)", text: "#EDEDED" },
    hover: { bg: "#1F1F23" },
    selected: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
    disabled: { opacity: 0.4 },
    loading: { opacity: 0.6 },
    error: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  },

  icon: {
    size: { sm: 14, md: 16, lg: 20 },
    colors: {
      muted: "#6B7280",
      active: "#EDEDED",
      danger: "#EF4444",
    },
  },

  transition: {
    fast: "100ms ease",
    normal: "150ms ease",
  },
} as const;
