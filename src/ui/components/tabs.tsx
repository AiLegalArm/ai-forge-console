import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center border-b border-border-subtle overflow-x-auto", className)} {...props} />;
}

export function TabButton({ active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "h-8 px-3 text-[10px] font-mono uppercase tracking-wide border-b-2 ui-transition ui-focus",
        active ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/70",
        className,
      )}
    />
  );
}
