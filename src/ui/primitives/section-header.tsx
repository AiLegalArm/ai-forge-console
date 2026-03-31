import * as React from "react";
import { cn } from "@/lib/utils";
import { Inline } from "@/ui/primitives/inline";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}

export function SectionHeader({ title, subtitle, actions, compact, className, ...props }: SectionHeaderProps) {
  return (
    <Inline justify="between" className={cn(compact ? "px-2.5 py-1.5" : "px-3 py-2", className)} {...props}>
      <div className="min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{title}</span>
        {subtitle && <span className="ml-2 text-[10px] text-muted-foreground/60">{subtitle}</span>}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </Inline>
  );
}
