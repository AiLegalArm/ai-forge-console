import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/40 mb-3" />}
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {description && <span className="text-[11px] text-muted-foreground/60 mt-1 max-w-[240px]">{description}</span>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
