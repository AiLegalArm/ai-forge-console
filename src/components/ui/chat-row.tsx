import type { ReactNode } from "react";
import { Badge } from "./badge";
import { ListRow } from "./list-row";

export function ChatRow({ role, content, meta, actions }: { role: string; content: string; meta?: string; actions?: ReactNode }) {
  return (
    <ListRow
      className="h-auto min-h-9 items-start py-1.5"
      left={<Badge variant="neutral">{role}</Badge>}
      center={<span className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">{content}</span>}
      right={<div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 pt-0.5">{meta}{actions}</div>}
    />
  );
}
