import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "error" | "warning" | "info";

const tone: Record<BadgeVariant, string> = {
  neutral: "border-border-subtle bg-surface/40 text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
};

export function Badge({ variant = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex items-center border px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-mono leading-none", tone[variant], className)} {...props} />;
}
