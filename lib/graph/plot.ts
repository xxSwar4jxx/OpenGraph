import type { Expression, Viewport } from "@/types";
import { classifyExpression } from "@/lib/math/classify";
import { compileNumeric, compileComparison } from "@/lib/math/compile";
import { worldToPixel, pixelToWorld } from "./coords";
import { traceImplicit, rasterizeInequality } from "./implicit";

export type Drawable =
  | { kind: "polyline"; points: Array<[number, number]> }
  | { kind: "segments"; segments: Array<[number, number, number, number]> }
  | { kind: "fill-cells"; cells: Array<[number, number]>; cellSize: number }
  | { kind: "point"; x: number; y: number };

export interface PlotOutcome {
  drawable: Drawable | null;
  error: string | null;
  resolvedKind: Expression["kind"];
}

/** Gathers current slider values from every slider expression, e.g. {a: 3, k: 1.5}. */
export function collectSliderValues(all: Expression[]): Record<string, number> {
  const values: Record<string, number> = {};
  for (const e of all) {
    if (e.kind === "slider" && e.slider) {
      const cls = classifyExpression(e.input);
      if (cls.kind === "slider" && cls.sliderName) values[cls.sliderName] = e.slider.value;
    }
  }
  return values;
}

const SAMPLE_PADDING_PX = 40;

export function plotExpression(
  expr: Expression,
  sliderValues: Record<string, number>,
  vp: Viewport,
  w: number,
  h: number
): PlotOutcome {
  const cls = classifyExpression(expr.input);
  if (cls.error) return { drawable: null, error: cls.error, resolvedKind: cls.kind };
  if (!cls.node && !cls.components) return { drawable: null, error: null, resolvedKind: cls.kind };

  try {
    switch (cls.kind) {
      case "slider":
        return { drawable: null, error: null, resolvedKind: "slider" };

      case "point": {
        const [ax, ay] = cls.components as [any, any];
        const fx = compileNumeric(ax, []).fn();
        const fy = compileNumeric(ay, []).fn();
        return { drawable: { kind: "point", x: fx, y: fy }, error: null, resolvedKind: "point" };
      }

      case "function": {
        const params = [...cls.variables].filter((v) => v !== "x");
        const compiled = compileNumeric(cls.node!, ["x", ...params]);
        const points: Array<[number, number]> = [];
        for (let px = -SAMPLE_PADDING_PX; px <= w + SAMPLE_PADDING_PX; px += 1) {
          const world = pixelToWorld(px, 0, vp, w, h);
          const args = [world.x, ...params.map((p) => sliderValues[p] ?? 0)];
          const y = compiled.fn(...args);
          const py = worldToPixel(world.x, y, vp, w, h).y;
          points.push([px, Number.isFinite(y) ? py : NaN]);
        }
        return { drawable: { kind: "polyline", points }, error: null, resolvedKind: "function" };
      }

      case "parametric": {
        const [xNode, yNode] = cls.components as [any, any];
        const fx = compileNumeric(xNode, ["t"]);
        const fy = compileNumeric(yNode, ["t"]);
        const range = expr.slider ? [expr.slider.min, expr.slider.max] : [0, Math.PI * 2];
        const steps = 1500;
        const points: Array<[number, number]> = [];
        for (let i = 0; i <= steps; i++) {
          const t = (range[0] as number) + ((range[1] as number) - (range[0] as number)) * (i / steps);
          const wx = fx.fn(t);
          const wy = fy.fn(t);
          const p = worldToPixel(wx, wy, vp, w, h);
          points.push([p.x, Number.isFinite(wx) && Number.isFinite(wy) ? p.y : NaN]);
        }
        return { drawable: { kind: "polyline", points }, error: null, resolvedKind: "parametric" };
      }

      case "polar": {
        const params = [...cls.variables].filter((v) => v !== "theta" && v !== "θ");
        const compiled = compileNumeric(cls.node!, ["theta", ...params]);
        const steps = 2000;
        const points: Array<[number, number]> = [];
        for (let i = 0; i <= steps; i++) {
          const theta = (Math.PI * 4 * i) / steps; // two full turns covers most rose/limaçon curves
          const args = [theta, ...params.map((p) => sliderValues[p] ?? 0)];
          const r = compiled.fn(...args);
          const wx = r * Math.cos(theta);
          const wy = r * Math.sin(theta);
          const p = worldToPixel(wx, wy, vp, w, h);
          points.push([p.x, Number.isFinite(r) ? p.y : NaN]);
        }
        return { drawable: { kind: "polyline", points }, error: null, resolvedKind: "polar" };
      }

      case "implicit": {
        const params = [...cls.variables].filter((v) => v !== "x" && v !== "y");
        const compiled = compileComparison(cls.node!, ["x", "y", ...params]);
        const f = (x: number, y: number) => compiled.fn(x, y, ...params.map((p) => sliderValues[p] ?? 0));
        const segments = traceImplicit(f, vp, w, h);
        return { drawable: { kind: "segments", segments }, error: null, resolvedKind: "implicit" };
      }

      case "inequality": {
        const params = [...cls.variables].filter((v) => v !== "x" && v !== "y");
        const compiled = compileComparison(cls.node!, ["x", "y", ...params]);
        const exact = (x: number, y: number) => {
          const diff = compiled.fn(x, y, ...params.map((p) => sliderValues[p] ?? 0));
          return compiled.flipped ? diff >= 0 : diff <= 0;
        };
        const cells = rasterizeInequality(exact, vp, w, h);
        return { drawable: { kind: "fill-cells", cells, cellSize: 5 }, error: null, resolvedKind: "inequality" };
      }

      default:
        return { drawable: null, error: null, resolvedKind: "unknown" };
    }
  } catch (err) {
    return {
      drawable: null,
      error: err instanceof Error ? err.message : "Could not evaluate expression",
      resolvedKind: cls.kind,
    };
  }
}
