import * as React from "react";
import { cn } from "@/lib/utils";

type TextSize = "2xs" | "xs" | "sm" | "md" | "base" | "lg";
type TextWeight = "normal" | "medium" | "semibold";
type TextColor = "primary" | "secondary" | "muted" | "accent" | "success" | "warning" | "error" | "inherit";

const sizeMap: Record<TextSize, string> = {
  "2xs": "text-[10px] leading-tight",
  xs: "text-[11px] leading-tight",
  sm: "text-xs leading-snug",
  md: "text-sm leading-normal",
  base: "text-base leading-normal",
  lg: "text-lg leading-normal",
};

const weightMap: Record<TextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

const colorMap: Record<TextColor, string> = {
  primary: "text-foreground",
  secondary: "text-secondary-foreground",
  muted: "text-muted-foreground",
  accent: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  inherit: "",
};

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  mono?: boolean;
  truncate?: boolean;
  as?: "span" | "p" | "div" | "label";
}

export function Text({
  size = "sm",
  weight = "normal",
  color = "primary",
  mono,
  truncate,
  as: Tag = "span",
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(
        sizeMap[size],
        weightMap[weight],
        colorMap[color],
        mono && "font-mono",
        truncate && "truncate",
        className,
      )}
      {...props}
    />
  );
}
