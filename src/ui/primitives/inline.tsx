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

export interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: "start" | "center" | "end";
  justify?: "start" | "between" | "end";
}

export function Inline({ gap = "sm", align = "center", justify = "start", className, ...props }: InlineProps) {
  return (
    <div
      className={cn(
        "flex",
        gapMap[gap],
        align === "center" && "items-center",
        align === "start" && "items-start",
        align === "end" && "items-end",
        justify === "between" && "justify-between",
        justify === "end" && "justify-end",
        className,
      )}
      {...props}
    />
  );
}
