import * as React from "react";
import { cn } from "@/lib/utils";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
type IconColor = "muted" | "active" | "primary" | "danger" | "success" | "warning" | "inherit";

const sizeMap: Record<IconSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-6 w-6",
};

const colorMap: Record<IconColor, string> = {
  muted: "text-muted-foreground",
  active: "text-foreground",
  primary: "text-primary",
  danger: "text-destructive",
  success: "text-success",
  warning: "text-warning",
  inherit: "",
};

export interface IconWrapperProps {
  icon: React.ElementType;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}

export function IconWrapper({ icon: Icon, size = "sm", color = "muted", className }: IconWrapperProps) {
  return <Icon className={cn(sizeMap[size], colorMap[color], "shrink-0", className)} />;
}
