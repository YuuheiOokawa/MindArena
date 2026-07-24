"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold tracking-wide transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-arena-gold text-arena-bg shadow-[0_0_24px_-8px_rgba(212,175,106,0.6)] hover:brightness-105",
        secondary: "bg-arena-surface-2 text-arena-white border border-arena-border hover:border-arena-gold/40",
        ghost: "bg-transparent text-arena-silver hover:text-arena-white",
        danger: "bg-arena-danger/90 text-arena-white hover:bg-arena-danger",
      },
      size: {
        default: "h-12 w-full",
        sm: "h-10 px-4",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
