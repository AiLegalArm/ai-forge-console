export const uiTokens = {
  spacing: {
    none: "0",
    xs: "1",
    sm: "2",
    md: "3",
    lg: "4",
  },
  panelPadding: {
    compact: "p-2",
    default: "p-3",
  },
  radius: "rounded-sm",
  state: {
    hover: "hover:bg-surface-hover",
    active: "bg-primary/12 text-primary border-primary/30",
    selected: "bg-primary/10 border-primary/40",
    disabled: "opacity-40 pointer-events-none",
    loading: "opacity-60 pointer-events-none",
  },
} as const;

export type UISpacingToken = keyof typeof uiTokens.spacing;
