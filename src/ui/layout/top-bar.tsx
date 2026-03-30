import { Inline } from "@/ui/primitives/inline";
import { Badge } from "@/ui/components/badge";

export function TopBarMeta({ project, provider, model, routing, state }: { project: string; provider: string; model: string; routing: string; state: string }) {
  return (
    <Inline gap="sm" className="text-[10px] font-mono text-muted-foreground min-w-0">
      <span className="truncate">{project}</span>
      <Badge variant="info">{provider}</Badge>
      <span>{model}</span>
      <span>{routing}</span>
      <Badge variant={state === "ok" ? "success" : "warning"}>{state}</Badge>
    </Inline>
  );
}
