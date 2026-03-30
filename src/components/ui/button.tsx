import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 border",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-border-default bg-transparent text-foreground hover:bg-surface-hover",
        secondary: "border-border-subtle bg-secondary text-secondary-foreground hover:bg-surface-hover",
        ghost: "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover",
        subtle: "border-border-subtle bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        danger: "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-7 px-2.5 text-xs rounded",
        sm: "h-6 px-2 text-[11px] rounded",
        lg: "h-8 px-3 text-sm rounded",
        icon: "h-7 w-7 rounded [&_svg]:size-4",
        "icon-sm": "h-6 w-6 rounded [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
