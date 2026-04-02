/**
 * Panel — flat background, subtle border, consistent padding.
 * Used for chat, operator, traces, release sections.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  noBorder?: boolean;
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ noPadding, noBorder, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card",
          !noBorder && "border border-border-subtle",
          !noPadding && "p-3",
          "rounded-md",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Panel.displayName = "Panel";

interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

function PanelHeader({ title, actions, className, children, ...props }: PanelHeaderProps) {
  if (title || actions) {
    return (
      <div className={cn("flex items-center justify-between gap-2 mb-2", className)} {...props}>
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex items-center justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2", className)} {...props} />;
}

function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2 border-t border-border-subtle", className)} {...props} />;
}

export { Panel, PanelHeader, PanelBody, PanelFooter };
