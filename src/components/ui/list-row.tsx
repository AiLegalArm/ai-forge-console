import * as React from "react";
import { cn } from "@/lib/utils";

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}

export function ListRow({
  left,
  center,
  right,
  selected,
  disabled,
  loading,
  compact,
  className,
  ...props
}: ListRowProps) {
  return (
    <div
      className={cn(
        compact ? "h-7" : "h-8",
        "px-2.5 border-b border-border-subtle flex items-center gap-2 text-xs rounded-sm",
        "ui-transition-fast state-hover",
        selected && "bg-primary/10 border-primary/30 text-primary",
        (disabled || loading) && "opacity-40 pointer-events-none",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 shrink-0 text-foreground font-medium truncate">{left}</div>
      {center && <div className="min-w-0 flex-1 text-muted-foreground font-mono text-[10px] truncate">{center}</div>}
      {right && <div className="shrink-0 flex items-center gap-1 ml-auto">{right}</div>}
    </div>
  );
}
