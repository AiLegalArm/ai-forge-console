export const uiTokens = {
  spacing: {
    none: "0",
    xs: "1",
    sm: "2",
    md: "3",
    lg: "4",
    xl: "5",
  },
  panelPadding: {
    compact: "p-2",
    default: "p-3",
    relaxed: "p-4",
  },
  radius: "rounded-sm",
  radiusMap: {
    none: "rounded-none",
    xs: "rounded-[2px]",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  },
  state: {
    hover: "hover:bg-surface-hover",
    active: "bg-primary/12 text-primary border-primary/30",
    selected: "bg-primary/10 border-primary/40",
    disabled: "opacity-40 pointer-events-none",
    loading: "opacity-60 pointer-events-none",
  },
  typography: {
    "2xs": "text-[10px] leading-tight",
    xs: "text-[11px] leading-tight",
    sm: "text-xs leading-snug",
    md: "text-sm leading-normal",
    base: "text-base leading-normal",
    lg: "text-lg leading-normal",
  },
} as const;

export type UISpacingToken = keyof typeof uiTokens.spacing;
