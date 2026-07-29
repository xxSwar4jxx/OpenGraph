"use client";

import { useEffect, useMemo } from "react";
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, GripVertical } from "lucide-react";
import type { Expression } from "@/types";
import { useGraphStore } from "@/store/useGraphStore";
import { classifyExpression } from "@/lib/math/classify";
import { ColorPicker } from "./ColorPicker";
import { SliderControl } from "./SliderControl";
import { IconButton } from "@/components/ui/IconButton";
import { registerInput } from "@/lib/inputRegistry";
import { cn } from "@/lib/utils";

export function ExpressionItem({
  expr,
  dragHandleProps,
}: {
  expr: Expression;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const updateInput = useGraphStore((s) => s.updateInput);
  const toggleVisibility = useGraphStore((s) => s.toggleVisibility);
  const toggleLock = useGraphStore((s) => s.toggleLock);
  const setColor = useGraphStore((s) => s.setColor);
  const removeExpression = useGraphStore((s) => s.removeExpression);
  const duplicateExpression = useGraphStore((s) => s.duplicateExpression);
  const ensureSlider = useGraphStore((s) => s.ensureSlider);
  const addExpression = useGraphStore((s) => s.addExpression);
  const setActiveExpression = useGraphStore((s) => s.setActiveExpression);

  const classification = useMemo(() => classifyExpression(expr.input), [expr.input]);

  useEffect(() => {
    if (classification.kind === "slider" && classification.sliderValue !== undefined && !expr.slider) {
      ensureSlider(expr.id, classification.sliderValue);
    }
  }, [classification, expr.id, expr.slider, ensureSlider]);

  const placeholder = "Type a function, e.g. y = x^2";
  const showError = expr.input.trim().length > 0 && classification.error;

  return (
    <div className={cn("group border-b border-[hsl(var(--border))]", expr.locked && "opacity-90")}>
      <div className="flex items-center gap-1.5 py-1.5 pl-1.5 pr-2">
        <button
          {...dragHandleProps}
          aria-label="Reorder expression"
          className="cursor-grab touch-none text-[hsl(var(--ink-faint))] opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-[hsl(var(--ink-faint))]">
          {expr.index + 1}
        </span>

        <ColorPicker color={expr.style.color} onChange={(c) => setColor(expr.id, c)} />

        <input
          ref={(el) => registerInput(expr.id, el)}
          value={expr.input}
          disabled={expr.locked}
          onFocus={() => setActiveExpression(expr.id)}
          onChange={(e) => updateInput(expr.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addExpression();
            }
          }}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-mono text-[13.5px] text-[hsl(var(--ink))] placeholder:text-[hsl(var(--ink-faint))] focus:outline-none disabled:text-[hsl(var(--ink-muted))]"
        />

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <IconButton
            label={expr.visible ? "Hide" : "Show"}
            active={false}
            onClick={() => toggleVisibility(expr.id)}
            className="h-7 w-7"
          >
            {expr.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </IconButton>
          <IconButton
            label={expr.locked ? "Unlock" : "Lock"}
            onClick={() => toggleLock(expr.id)}
            className="h-7 w-7"
          >
            {expr.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </IconButton>
          <IconButton label="Duplicate" onClick={() => duplicateExpression(expr.id)} className="h-7 w-7">
            <Copy size={14} />
          </IconButton>
          <IconButton label="Delete" onClick={() => removeExpression(expr.id)} className="h-7 w-7">
            <Trash2 size={14} />
          </IconButton>
        </div>

        {!expr.visible && (
          <span className="shrink-0 rounded-full bg-[hsl(var(--ink)/0.06)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--ink-muted))]">
            hidden
          </span>
        )}
      </div>

      {expr.slider && classification.kind === "slider" && (
        <SliderControl id={expr.id} name={classification.sliderName ?? "a"} slider={expr.slider} />
      )}

      {showError && (
        <p className="px-8 pb-2 text-[11px] leading-snug text-[#E0574C]" role="alert">
          {classification.error}
        </p>
      )}
    </div>
  );
}
