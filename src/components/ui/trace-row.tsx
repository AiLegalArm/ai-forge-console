import { useState } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { ListRow } from "./list-row";

export function TraceRow({
  label,
  timestamp,
  status,
  details,
}: {
  label: string;
  timestamp: string;
  status: "ok" | "warn" | "error";
  details?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const variant = status === "ok" ? "success" : status === "warn" ? "warning" : "destructive";
  const isLive = status === "warn";

  return (
    <div>
      <ListRow
        left={label}
        center={timestamp}
        right={(
          <>
            <Badge variant={variant}>
              {isLive ? (
                <span className="inline-flex items-center gap-1">
                  <span className="live-dot" />
                  live
                </span>
              ) : (
                status
              )}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Hide" : "Show"}
            </Button>
          </>
        )}
      />
      {expanded && details ? (
        <div className="px-3 py-2 text-[10px] font-mono text-muted-foreground border-b border-border-subtle bg-surface/20">
          {details}
        </div>
      ) : null}
    </div>
  );
}
