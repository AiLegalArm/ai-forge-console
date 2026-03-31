import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { CommandPalette } from "@/ui";

export type CommandCategory =
  | "navigation"
  | "tasks"
  | "agents"
  | "execution"
  | "approvals"
  | "release"
  | "system";

export interface KeyboardCommand {
  id: string;
  label: string;
  category: CommandCategory;
  shortcut?: string;
  icon?: LucideIcon;
  keywords?: string[];
  handler: () => void | Promise<void>;
}

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: KeyboardCommand[];
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: "Navigation",
  tasks: "Task Actions",
  agents: "Agent Actions",
  execution: "Execution",
  approvals: "Approvals",
  release: "Release",
  system: "System",
};

export function GlobalCommandPalette({ open, onOpenChange, commands }: GlobalCommandPaletteProps) {
  const groupedCommands = useMemo(() => {
    const groups = new Map<CommandCategory, KeyboardCommand[]>();

    for (const command of commands) {
      const existing = groups.get(command.category);
      if (existing) {
        existing.push(command);
      } else {
        groups.set(command.category, [command]);
      }
    }

    return groups;
  }, [commands]);

  const groups = Array.from(groupedCommands.entries()).map(([category, items]) => [CATEGORY_LABELS[category], items] as [string, KeyboardCommand[]]);
  return <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} />;
}
