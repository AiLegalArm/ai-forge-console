import type { ReactNode } from "react";
import { Badge } from "@/ui/components/badge";
import { ListRow } from "@/ui/components/list-row";

export function ChatRow({ role, content, meta, actions }: { role: string; content: string; meta?: string; actions?: ReactNode }) {
  return (
    <ListRow
      className="h-auto min-h-8 items-start py-1"
      left={<Badge variant="neutral">{role}</Badge>}
      center={<span className="text-xs text-foreground whitespace-pre-wrap break-words">{content}</span>}
      right={<div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">{meta}{actions}</div>}
    />
  );
}
