import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary/90 text-primary-foreground hover:bg-primary active:bg-primary/85 shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.2)]",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-surface",
  subtle: "border border-border-subtle bg-surface text-foreground hover:bg-surface-hover active:bg-surface-hover/80",
  danger: "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/20 active:bg-destructive/25",
};

export interface UIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  selected?: boolean;
}

export function Button({ variant = "ghost", loading, selected, disabled, className, children, ...props }: UIButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "h-8 px-2.5 text-[11px] font-medium rounded-sm ui-transition ui-focus ui-press inline-flex items-center gap-1.5 shrink-0",
        "disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
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
