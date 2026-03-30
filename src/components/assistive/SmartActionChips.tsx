import { useMemo, useState } from "react";
import type { SmartActionSuggestion, SmartActionId } from "@/lib/ai-native-suggestions";

interface SmartActionChipsProps {
  title?: string;
  suggestions: SmartActionSuggestion[];
  onAction: (id: SmartActionId) => void;
  maxVisible?: number;
}

export function SmartActionChips({ title = "Next actions", suggestions, onAction, maxVisible = 3 }: SmartActionChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleSuggestions = useMemo(
    () => (expanded ? suggestions : suggestions.slice(0, maxVisible)),
    [expanded, maxVisible, suggestions],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="border border-border-subtle rounded p-2 space-y-1.5 bg-card/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">{title}</span>
        {suggestions.length > maxVisible ? (
          <button
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Less" : `More (${suggestions.length - maxVisible})`}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onAction(suggestion.id)}
            title={suggestion.reason}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              suggestion.tone === "danger"
                ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                : suggestion.tone === "warning"
                  ? "border-warning/40 text-warning hover:bg-warning/10"
                  : "border-border text-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
