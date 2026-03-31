/**
 * Atomic Design Tokens
 * Single source of truth for all visual primitives.
 * All UI must consume tokens — no inline colors, spacing, or radii.
 */

export const tokens = {
  color: {
    bg: {
      primary: "hsl(var(--bg-primary))",
      secondary: "hsl(var(--bg-secondary))",
      tertiary: "hsl(var(--bg-tertiary))",
    },
    border: {
      subtle: "hsl(var(--border-subtle))",
      default: "hsl(var(--border-default))",
    },
    text: {
      primary: "hsl(var(--foreground))",
      secondary: "hsl(var(--secondary-foreground))",
      muted: "hsl(var(--muted-foreground))",
    },
    functional: {
      success: "hsl(var(--success))",
      error: "hsl(var(--error))",
      warning: "hsl(var(--warning))",
      accent: "hsl(var(--primary))",
    },
  },

  typography: {
    fontFamily: {
      sans: "Inter, system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      "2xs": "10px",
      xs: "11px",
      sm: "12px",
      md: "13px",
      base: "14px",
      lg: "16px",
      xl: "18px",
    },
    lineHeight: {
      tight: "1.2",
      normal: "1.4",
      relaxed: "1.6",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
  },

  spacing: {
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
  },

  radius: {
    none: "0px",
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    full: "9999px",
  },

  layout: {
    sidebar: { width: "240px", collapsedWidth: "48px" },
    rightPanel: { width: "320px" },
    panel: { padding: "12px", gap: "8px" },
    topBar: { height: "40px" },
    listItem: { height: "32px" },
    button: { sm: "24px", md: "28px", lg: "32px" },
  },

  elevation: {
    none: "none",
    sm: "0 1px 2px 0 hsl(0 0% 0% / 0.2)",
    md: "0 2px 8px -2px hsl(0 0% 0% / 0.3)",
    lg: "0 4px 16px -4px hsl(0 0% 0% / 0.4)",
    overlay: "0 8px 32px -8px hsl(0 0% 0% / 0.5)",
  },

  state: {
    active: { bg: "hsl(var(--primary) / 0.12)", text: "hsl(var(--primary))", border: "hsl(var(--primary) / 0.3)" },
    hover: { bg: "hsl(var(--surface-hover))" },
    selected: { bg: "hsl(var(--primary) / 0.1)", border: "hsl(var(--primary) / 0.4)" },
    disabled: { opacity: 0.4 },
    loading: { opacity: 0.6 },
    error: { bg: "hsl(var(--error) / 0.1)", border: "hsl(var(--error) / 0.3)" },
  },

  icon: {
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 },
    colors: {
      muted: "hsl(var(--muted-foreground))",
      active: "hsl(var(--foreground))",
      primary: "hsl(var(--primary))",
      danger: "hsl(var(--destructive))",
      success: "hsl(var(--success))",
      warning: "hsl(var(--warning))",
    },
  },

  transition: {
    fast: "var(--motion-fast) var(--ease-standard)",
    normal: "var(--motion-base) var(--ease-standard)",
  },

  zIndex: {
    base: 0,
    dropdown: 50,
    sticky: 100,
    overlay: 200,
    modal: 300,
    toast: 400,
  },
} as const;
