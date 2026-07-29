"use client";

import { Plus, Minus, Crosshair, Grid3x3, Sun, Moon, Laptop, Download } from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";
import { IconButton } from "@/components/ui/IconButton";

function exportPng() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = "graph.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function GraphControls() {
  const settings = useGraphStore((s) => s.settings);
  const toggleGrid = useGraphStore((s) => s.toggleGrid);
  const setTheme = useGraphStore((s) => s.setTheme);
  const resetView = useGraphStore((s) => s.resetView);
  const zoomAt = useGraphStore((s) => s.zoomAt);

  const zoomBy = (factor: number) => {
    const el = document.querySelector("canvas")?.parentElement;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    zoomAt(width / 2, height / 2, factor, width, height);
  };

  const nextTheme = settings.theme === "light" ? "dark" : settings.theme === "dark" ? "system" : "light";
  const ThemeIcon = settings.theme === "light" ? Sun : settings.theme === "dark" ? Moon : Laptop;

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.9)] p-1 shadow-panel backdrop-blur">
      <IconButton label="Zoom in" onClick={() => zoomBy(1 / 1.4)}>
        <Plus size={16} />
      </IconButton>
      <IconButton label="Zoom out" onClick={() => zoomBy(1.4)}>
        <Minus size={16} />
      </IconButton>
      <div className="mx-1 h-px bg-[hsl(var(--border))]" />
      <IconButton label="Center on origin" onClick={resetView}>
        <Crosshair size={16} />
      </IconButton>
      <IconButton label={settings.showGrid ? "Hide grid" : "Show grid"} active={settings.showGrid} onClick={toggleGrid}>
        <Grid3x3 size={16} />
      </IconButton>
      <div className="mx-1 h-px bg-[hsl(var(--border))]" />
      <IconButton label={`Theme: ${settings.theme} (click to change)`} onClick={() => setTheme(nextTheme)}>
        <ThemeIcon size={16} />
      </IconButton>
      <IconButton label="Export graph as PNG" onClick={exportPng}>
        <Download size={16} />
      </IconButton>
    </div>
  );
}
