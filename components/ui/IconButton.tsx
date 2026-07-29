import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // required — doubles as aria-label and title tooltip
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, active, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--ink-muted))] transition-colors hover:bg-[hsl(var(--ink)/0.06)] hover:text-[hsl(var(--ink))] disabled:pointer-events-none disabled:opacity-30",
        active && "bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]",
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
