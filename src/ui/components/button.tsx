import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary/90 text-primary-foreground hover:bg-primary active:bg-primary/85 shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.12)]",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-surface-active",
  subtle: "border border-border-subtle bg-surface text-foreground hover:bg-surface-hover active:bg-surface-active",
  danger: "bg-destructive/12 text-destructive border border-destructive/25 hover:bg-destructive/18 active:bg-destructive/22",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-6 px-2 text-[10px] gap-1 rounded-sm",
  md: "h-7 px-2.5 text-[11px] gap-1.5 rounded-sm",
  lg: "h-8 px-3 text-xs gap-1.5 rounded-sm",
  "icon-sm": "h-6 w-6 rounded-sm [&_svg]:h-3 [&_svg]:w-3",
  icon: "h-7 w-7 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5",
};

export interface UIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  selected?: boolean;
}

export function Button({
  variant = "ghost",
  size = "md",
  loading,
  selected,
  disabled,
  className,
  children,
  ...props
}: UIButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "font-medium ui-transition ui-focus ui-press inline-flex items-center justify-center shrink-0",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        selected && "bg-primary/12 text-primary border border-primary/35",
        loading && "opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
