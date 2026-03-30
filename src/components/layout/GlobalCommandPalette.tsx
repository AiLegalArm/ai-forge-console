import { useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import type { LucideIcon } from "lucide-react";

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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" autoFocus />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {Array.from(groupedCommands.entries()).map(([category, items]) => (
          <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
            {items.map((command) => {
              const Icon = command.icon;
              const value = [command.label, command.id, ...(command.keywords ?? [])].join(" ");

              return (
                <CommandItem
                  key={command.id}
                  value={value}
                  onSelect={() => {
                    void command.handler();
                    onOpenChange(false);
                  }}
                >
                  {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                  <span>{command.label}</span>
                  {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
