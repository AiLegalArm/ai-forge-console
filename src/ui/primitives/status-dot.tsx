import { cn } from "@/lib/utils";

type StatusVariant = "idle" | "active" | "success" | "warning" | "error" | "info";

const variantMap: Record<StatusVariant, string> = {
  idle: "bg-muted-foreground",
  active: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
};

export interface StatusDotProps {
  variant?: StatusVariant;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusDot({ variant = "idle", pulse, size = "sm", className }: StatusDotProps) {
  const sizeClass = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        sizeClass,
        variantMap[variant],
        pulse && "live-dot",
        className,
      )}
    />
  );
}
