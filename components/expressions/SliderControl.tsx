"use client";

import { Play, Pause } from "lucide-react";
import type { SliderConfig } from "@/types";
import { useGraphStore } from "@/store/useGraphStore";
import { IconButton } from "@/components/ui/IconButton";

export function SliderControl({ id, name, slider }: { id: string; name: string; slider: SliderConfig }) {
  const setValue = useGraphStore((s) => s.setSliderValue);
  const toggle = useGraphStore((s) => s.toggleSliderPlay);
  const setRange = useGraphStore((s) => s.setSliderRange);

  return (
    <div className="flex items-center gap-2 pl-7 pr-1 pb-1.5 pt-0.5">
      <IconButton
        label={slider.playing ? `Pause ${name}` : `Animate ${name}`}
        active={slider.playing}
        onClick={() => toggle(id)}
        className="h-6 w-6"
      >
        {slider.playing ? <Pause size={12} /> : <Play size={12} />}
      </IconButton>

      <input
        type="number"
        aria-label={`${name} minimum`}
        value={slider.min}
        step="any"
        onChange={(e) => setRange(id, parseFloat(e.target.value) || 0, slider.max, slider.step)}
        className="w-12 rounded-md border border-[hsl(var(--border))] bg-transparent px-1 py-0.5 text-[11px] tabular-nums"
      />

      <input
        type="range"
        aria-label={`${name} value`}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={slider.value}
        onChange={(e) => setValue(id, parseFloat(e.target.value))}
        className="h-1.5 flex-1 accent-[hsl(var(--accent))]"
      />

      <input
        type="number"
        aria-label={`${name} maximum`}
        value={slider.max}
        step="any"
        onChange={(e) => setRange(id, slider.min, parseFloat(e.target.value) || 0, slider.step)}
        className="w-12 rounded-md border border-[hsl(var(--border))] bg-transparent px-1 py-0.5 text-[11px] tabular-nums"
      />

      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-[hsl(var(--ink-muted))]">
        {slider.value.toFixed(2)}
      </span>
    </div>
  );
}
