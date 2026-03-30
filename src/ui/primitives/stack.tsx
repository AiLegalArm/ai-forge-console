import * as React from "react";
import { cn } from "@/lib/utils";

type Gap = "none" | "xs" | "sm" | "md" | "lg";

const gapMap: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
}

export function Stack({ gap = "sm", className, ...props }: StackProps) {
  return <div className={cn("flex flex-col", gapMap[gap], className)} {...props} />;
}
