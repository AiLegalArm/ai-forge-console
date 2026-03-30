import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "error" | "warning" | "info";

const tone: Record<BadgeVariant, string> = {
  neutral: "border-border-subtle text-muted-foreground",
  success: "border-success/30 text-success",
  error: "border-destructive/30 text-destructive",
  warning: "border-warning/30 text-warning",
  info: "border-info/30 text-info",
};

export function Badge({ variant = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex items-center border px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-mono", tone[variant], className)} {...props} />;
}
