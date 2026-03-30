import * as React from "react";
import { cn } from "@/lib/utils";

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export function ListRow({ left, center, right, selected, disabled, loading, className, ...props }: ListRowProps) {
  return (
    <div
      className={cn(
        "h-8 px-2.5 border-b border-border-subtle flex items-center gap-2 text-xs rounded-sm ui-transition",
        "hover:bg-surface-hover/90 hover:border-border-default",
        selected && "bg-primary/12 border-primary/30",
        (disabled || loading) && "opacity-50 pointer-events-none",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 shrink-0 text-foreground font-medium truncate">{left}</div>
      <div className="min-w-0 flex-1 text-muted-foreground font-mono text-[10px] truncate">{center}</div>
      <div className="shrink-0 flex items-center gap-1">{right}</div>
    </div>
  );
}
