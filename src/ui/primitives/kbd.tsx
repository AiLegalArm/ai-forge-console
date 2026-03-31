import { cn } from "@/lib/utils";

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return <kbd className={cn("kbd", className)}>{children}</kbd>;
}
