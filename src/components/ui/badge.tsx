import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-arena-surface-2 text-arena-silver border border-arena-border",
      gold: "bg-arena-gold/15 text-arena-gold-soft border border-arena-gold/30",
      primary: "bg-arena-primary/15 text-arena-primary-soft border border-arena-primary/30",
      success: "bg-arena-success/15 text-arena-success border border-arena-success/30",
      danger: "bg-arena-danger/15 text-arena-danger border border-arena-danger/30",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
