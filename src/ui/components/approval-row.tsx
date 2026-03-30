import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { ListRow } from "@/ui/components/list-row";

export function ApprovalRow({ action, reason, risk, onApprove, onReject }: { action: string; reason: string; risk: "low" | "medium" | "high"; onApprove: () => void; onReject: () => void }) {
  const riskVariant = risk === "high" ? "error" : risk === "medium" ? "warning" : "info";
  return (
    <ListRow
      left={action}
      center={reason}
      right={(
        <>
          <Badge variant={riskVariant}>{risk}</Badge>
          <Button variant="subtle" onClick={onApprove}>Approve</Button>
          <Button variant="danger" onClick={onReject}>Reject</Button>
        </>
      )}
    />
  );
}
