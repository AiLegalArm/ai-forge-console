import * as React from "react";
import { cn } from "@/lib/utils";
import { Divider } from "@/ui/primitives/divider";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("bg-panel border border-border-subtle rounded-sm", className)} {...props} />;
}

export function PanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex items-center justify-between", className)} {...props} />;
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2 border-t border-border-subtle", className)} {...props} />;
}

export function PanelDivider() {
  return <Divider />;
}
