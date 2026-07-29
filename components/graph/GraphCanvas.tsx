"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { niceStep, formatAxisLabel, worldToPixel } from "@/lib/graph/coords";
import { collectSliderValues, plotExpression } from "@/lib/graph/plot";
import { useTheme } from "@/components/theme/ThemeProvider";

function readCssColor(varName: string, fallbackLightness = "0%"): string {
  if (typeof window === "undefined") return `hsl(0 0% ${fallbackLightness})`;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `hsl(${v})` : `hsl(0 0% ${fallbackLightness})`;
}

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastTsRef = useRef<number>();
  const dprRef = useRef(1);

  const isDragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  const { resolvedTheme } = useTheme();

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { expressions, viewport, settings } = useGraphStore.getState();
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = dprRef.current;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const gridColor = readCssColor("--grid-line");
    const gridStrongColor = readCssColor("--grid-line-strong");
    const axisColor = readCssColor("--axis-line");
    const labelColor = readCssColor("--ink-muted");

    // -- grid --
    if (settings.showGrid) {
      const step = niceStep(viewport.scale);
      const minorStep = step / 5;

      ctx.lineWidth = 1;
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      const startXMinor = Math.floor((viewport.centerX - (w / 2) * viewport.scale) / minorStep) * minorStep;
      const endX = viewport.centerX + (w / 2) * viewport.scale;
      for (let x = startXMinor; x <= endX; x += minorStep) {
        const p = worldToPixel(x, 0, viewport, w, h);
        ctx.moveTo(Math.round(p.x) + 0.5, 0);
        ctx.lineTo(Math.round(p.x) + 0.5, h);
      }
      const startYMinor = Math.floor((viewport.centerY - (h / 2) * viewport.scale) / minorStep) * minorStep;
      const endY = viewport.centerY + (h / 2) * viewport.scale;
      for (let y = startYMinor; y <= endY; y += minorStep) {
        const p = worldToPixel(0, y, viewport, w, h);
        ctx.moveTo(0, Math.round(p.y) + 0.5);
        ctx.lineTo(w, Math.round(p.y) + 0.5);
      }
      ctx.stroke();

      // major grid lines + labels
      ctx.strokeStyle = gridStrongColor;
      ctx.fillStyle = labelColor;
      ctx.font = "11px var(--font-sans), sans-serif";
      ctx.beginPath();
      const startXMajor = Math.floor((viewport.centerX - (w / 2) * viewport.scale) / step) * step;
      for (let x = startXMajor; x <= endX; x += step) {
        const p = worldToPixel(x, 0, viewport, w, h);
        ctx.moveTo(Math.round(p.x) + 0.5, 0);
        ctx.lineTo(Math.round(p.x) + 0.5, h);
      }
      const startYMajor = Math.floor((viewport.centerY - (h / 2) * viewport.scale) / step) * step;
      for (let y = startYMajor; y <= endY; y += step) {
        const p = worldToPixel(0, y, viewport, w, h);
        ctx.moveTo(0, Math.round(p.y) + 0.5);
        ctx.lineTo(w, Math.round(p.y) + 0.5);
      }
      ctx.stroke();

      if (settings.showLabels) {
        const originPx = worldToPixel(0, 0, viewport, w, h);
        for (let x = startXMajor; x <= endX; x += step) {
          if (Math.abs(x) < step / 1000) continue;
          const p = worldToPixel(x, 0, viewport, w, h);
          const labelY = Math.min(Math.max(originPx.y + 14, 14), h - 4);
          ctx.fillText(formatAxisLabel(x, step), p.x + 3, labelY);
        }
        for (let y = startYMajor; y <= endY; y += step) {
          if (Math.abs(y) < step / 1000) continue;
          const p = worldToPixel(0, y, viewport, w, h);
          const labelX = Math.min(Math.max(originPx.x + 4, 4), w - 24);
          ctx.fillText(formatAxisLabel(y, step), labelX, p.y - 3);
        }
      }
    }

    // -- axes --
    if (settings.showAxes) {
      const origin = worldToPixel(0, 0, viewport, w, h);
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(origin.y) + 0.5);
      ctx.lineTo(w, Math.round(origin.y) + 0.5);
      ctx.moveTo(Math.round(origin.x) + 0.5, 0);
      ctx.lineTo(Math.round(origin.x) + 0.5, h);
      ctx.stroke();
    }

    // -- expressions --
    const sliderValues = collectSliderValues(expressions);
    for (const expr of expressions) {
      if (!expr.visible || !expr.input.trim()) continue;
      const outcome = plotExpression(expr, sliderValues, viewport, w, h);
      if (!outcome.drawable) continue;

      ctx.strokeStyle = expr.style.color;
      ctx.fillStyle = expr.style.color;
      ctx.lineWidth = expr.style.lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (expr.style.dashed) ctx.setLineDash([8, 6]);
      else ctx.setLineDash([]);

      const d = outcome.drawable;
      if (d.kind === "polyline") {
        ctx.beginPath();
        let started = false;
        for (const [x, y] of d.points) {
          if (!Number.isFinite(y)) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (d.kind === "segments") {
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of d.segments) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      } else if (d.kind === "fill-cells") {
        ctx.globalAlpha = 0.25;
        for (const [x, y] of d.cells) {
          ctx.fillRect(x, y, d.cellSize, d.cellSize);
        }
        ctx.globalAlpha = 1;
      } else if (d.kind === "point") {
        const p = worldToPixel(d.x, d.y, viewport, w, h);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = resolvedTheme === "dark" ? "#0b0d10" : "#ffffff";
        ctx.stroke();
      }
    }
  }, [resolvedTheme]);

  // animation loop — also advances any playing sliders
  useEffect(() => {
    dprRef.current = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    const loop = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      lastTsRef.current = ts;

      const hasPlaying = useGraphStore.getState().expressions.some((e) => e.slider?.playing);
      if (hasPlaying) useGraphStore.getState().tickSliders(dt);

      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  // re-render on store changes even when the RAF loop's own state check
  // doesn't catch it immediately (keeps input typing feeling instant)
  useEffect(() => {
    const unsub = useGraphStore.subscribe(() => render());
    return unsub;
  }, [render]);

  useEffect(() => {
    const observer = new ResizeObserver(() => render());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [render]);

  // -- pointer interactions: pan --
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !lastPointer.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    useGraphStore.getState().pan(dx, dy);
  };
  const endDrag = () => {
    isDragging.current = false;
    lastPointer.current = null;
  };

  // -- wheel zoom --
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = Math.exp(e.deltaY * 0.0015);
    useGraphStore.getState().zoomAt(px, py, factor, rect.width, rect.height);
  };

  // -- touch pinch zoom --
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      pinchStartDist.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartScale.current = useGraphStore.getState().viewport.scale;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const factor = pinchStartDist.current / dist;
      const midX = (a.clientX + b.clientX) / 2 - rect.left;
      const midY = (a.clientY + b.clientY) / 2 - rect.top;
      const targetScale = pinchStartScale.current * factor;
      const current = useGraphStore.getState().viewport.scale;
      useGraphStore.getState().zoomAt(midX, midY, targetScale / current, rect.width, rect.height);
    }
  };
  const onTouchEnd = () => {
    pinchStartDist.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[hsl(var(--surface))]"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="img"
      aria-label="Interactive function graph. Drag to pan, scroll or pinch to zoom."
    >
      <canvas ref={canvasRef} className="block h-full w-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
