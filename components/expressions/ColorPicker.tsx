"use client";

import { useEffect, useRef, useState } from "react";
import { EXPRESSION_PALETTE } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Change color, currently ${color}`}
        onClick={() => setOpen((v) => !v)}
        className="h-5 w-5 shrink-0 rounded-full ring-1 ring-[hsl(var(--border))] transition-transform hover:scale-110"
        style={{ backgroundColor: color }}
      />
      {open && (
        <div className="absolute left-0 top-7 z-30 grid grid-cols-4 gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] p-2.5 shadow-floating">
          {EXPRESSION_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "h-6 w-6 rounded-full ring-1 ring-[hsl(var(--border))] transition-transform hover:scale-110",
                c === color && "ring-2 ring-[hsl(var(--ink))]"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
