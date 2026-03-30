import { cn } from "@/lib/utils";

export function Divider({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div className={cn(vertical ? "w-px self-stretch bg-border-subtle" : "h-px w-full bg-border-subtle", className)} />;
}
