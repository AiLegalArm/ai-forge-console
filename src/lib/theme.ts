/**
 * Theme — maps design tokens to CSS variable keys for runtime consumption.
 * Components use semantic names; this file bridges tokens ↔ CSS.
 */

export const theme = {
  panel: {
    bg: "var(--bg-secondary)",
    border: "var(--border-subtle)",
    padding: "12px",
    gap: "8px",
  },
  sidebar: {
    bg: "var(--bg-primary)",
    border: "var(--border-subtle)",
    width: "240px",
    collapsedWidth: "48px",
  },
  topBar: {
    bg: "var(--bg-secondary)",
    border: "var(--border-subtle)",
    height: "40px",
  },
  rightPanel: {
    bg: "var(--bg-secondary)",
    border: "var(--border-subtle)",
    width: "320px",
  },
  chat: {
    messageBg: "transparent",
    roleLabelSize: "11px",
    messageTextSize: "13px",
    inputBg: "var(--bg-tertiary)",
    inputBorder: "var(--border-subtle)",
  },
  button: {
    height: { sm: "24px", md: "28px", lg: "32px" },
    radius: "4px",
  },
  badge: {
    height: "20px",
    radius: "4px",
    fontSize: "10px",
  },
  listItem: {
    height: "32px",
    padding: "0 10px",
    gap: "8px",
  },
} as const;
