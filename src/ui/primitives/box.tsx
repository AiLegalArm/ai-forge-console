import * as React from "react";
import { cn } from "@/lib/utils";

type Padding = "none" | "xs" | "sm" | "md" | "lg";
type Surface = "none" | "panel" | "surface" | "background";
type Border = "none" | "subtle" | "default";

const paddingMap: Record<Padding, string> = {
  none: "",
  xs: "p-1",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
};

const surfaceMap: Record<Surface, string> = {
  none: "",
  panel: "bg-panel",
  surface: "bg-surface",
  background: "bg-background",
};

const borderMap: Record<Border, string> = {
  none: "",
  subtle: "border border-border-subtle",
  default: "border border-border",
};

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  surface?: Surface;
  border?: Border;
}

export function Box({ padding = "none", surface = "none", border = "none", className, ...props }: BoxProps) {
  return <div className={cn(paddingMap[padding], surfaceMap[surface], borderMap[border], className)} {...props} />;
}
