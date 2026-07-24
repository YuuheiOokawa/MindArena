import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-arena-border bg-arena-surface-2 px-4 text-base text-arena-white placeholder:text-arena-silver/50",
        "outline-none transition-colors focus:border-arena-gold/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
