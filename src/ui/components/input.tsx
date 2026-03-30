import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-8 w-full border border-border-subtle bg-input px-2 text-xs text-foreground placeholder:text-muted-foreground ui-transition ui-focus focus:border-primary/50 hover:border-border-default", props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-20 w-full border border-border-subtle bg-input px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground ui-transition ui-focus focus:border-primary/50 hover:border-border-default", props.className)} />;
}

export function ChatInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-16 max-h-40 w-full resize-y border border-border-subtle bg-background px-2 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground ui-transition ui-focus focus:border-primary/60 hover:border-border-default", props.className)} />;
}
