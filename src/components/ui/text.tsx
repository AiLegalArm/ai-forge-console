import * as React from "react";
import { cn } from "@/lib/utils";

type TextSize = "2xs" | "xs" | "sm" | "md" | "base" | "lg";

const sizeMap: Record<TextSize, string> = {
  "2xs": "text-[10px] leading-tight",
  xs: "text-[11px] leading-tight",
  sm: "text-xs leading-snug",
  md: "text-sm leading-normal",
  base: "text-base leading-normal",
  lg: "text-lg leading-normal",
};

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  size?: TextSize;
  as?: "span" | "p" | "div" | "label";
}

export function Text({ size = "sm", as: Tag = "span", className, ...props }: TextProps) {
  return <Tag className={cn(sizeMap[size], className)} {...props} />;
}
