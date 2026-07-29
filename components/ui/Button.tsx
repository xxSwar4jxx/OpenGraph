import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:brightness-110",
        ghost: "bg-transparent text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)/0.06)]",
        outline:
          "border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)/0.04)]",
        subtle: "bg-[hsl(var(--ink)/0.05)] text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink)/0.09)]",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3.5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
