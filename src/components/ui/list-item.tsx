/**
 * ListItem — The core list primitive for tasks, agents, approvals, runs.
 * Flat, no cards. Left: label. Center: info. Right: status/actions.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  info?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ label, info, status, actions, active, disabled, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 h-8 px-3 text-xs transition-colors cursor-default",
          "border-b border-border-subtle",
          "hover:bg-surface-hover",
          active && "bg-accent/10 text-primary",
          disabled && "opacity-40 pointer-events-none",
          className,
        )}
        {...props}
      >
        <span className={cn("flex-shrink-0 font-medium truncate", active ? "text-primary" : "text-foreground")}>
          {label}
        </span>
        {info && (
          <span className="flex-1 min-w-0 truncate text-muted-foreground text-2xs font-mono">
            {info}
          </span>
        )}
        {status && (
          <span className="flex-shrink-0">{status}</span>
        )}
        {actions && (
          <span className="flex-shrink-0 flex items-center gap-1">{actions}</span>
        )}
      </div>
    );
  },
);
ListItem.displayName = "ListItem";

export { ListItem };
