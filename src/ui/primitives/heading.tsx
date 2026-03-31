import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

const levelMap: Record<HeadingLevel, string> = {
  h1: "text-lg font-semibold tracking-tight",
  h2: "text-sm font-semibold tracking-tight",
  h3: "text-xs font-semibold",
  h4: "text-[11px] font-medium uppercase tracking-wider",
};

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: HeadingLevel;
}

export function Heading({ level = "h2", as, className, ...props }: HeadingProps) {
  const Tag = as ?? level;
  return <Tag className={cn(levelMap[level], "text-foreground", className)} {...props} />;
}
