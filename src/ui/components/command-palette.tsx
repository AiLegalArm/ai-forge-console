import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import type { KeyboardCommand } from "@/components/layout/GlobalCommandPalette";

export function CommandPalette({ open, onOpenChange, groups }: { open: boolean; onOpenChange: (open: boolean) => void; groups: [string, KeyboardCommand[]][] }) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command..." autoFocus className="font-mono" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        {groups.map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map((command) => (
              <CommandItem key={command.id} value={[command.label, command.id, ...(command.keywords ?? [])].join(" ")} onSelect={() => {
                void command.handler();
                onOpenChange(false);
              }}>
                {command.icon ? <command.icon className="mr-2 h-4 w-4" /> : null}
                <span>{command.label}</span>
                {command.shortcut ? <CommandShortcut>{command.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
