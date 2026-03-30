import type { ElementType, ReactNode } from "react";
import { ListRow } from "@/ui/components/list-row";

export function SidebarNavRow({ icon: Icon, label, active, onClick, title, right }: { icon: ElementType; label: string; active?: boolean; onClick: () => void; title?: string; right?: ReactNode }) {
  return <ListRow title={title} className="h-8 border-b-0 cursor-pointer" left={<span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>} right={right} selected={active} onClick={onClick} />;
}
