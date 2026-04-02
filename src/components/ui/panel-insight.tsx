import type { LucideIcon } from "lucide-react";
import { Badge } from "./badge";
import { Text } from "./text";

interface PanelInsightProps {
  icon?: LucideIcon;
  label: string;
  value: string;
}

export function PanelInsight({ icon: Icon, label, value }: PanelInsightProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-2 py-1">
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <Text size="2xs" className="uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <Badge variant="secondary" className="normal-case tracking-normal text-[10px]">
        {value}
      </Badge>
    </div>
  );
}
