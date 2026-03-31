import { Badge } from "./badge";
import { ListRow } from "./list-row";

export function AgentRow({ name, state, task, model }: { name: string; state: "idle" | "running" | "blocked" | "done"; task: string; model: string }) {
  const stateVariant = state === "done" ? "success" : state === "blocked" ? "error" : state === "running" ? "info" : "neutral";
  return <ListRow left={name} center={`${task} · ${model}`} right={<Badge variant={stateVariant}>{state}</Badge>} />;
}
