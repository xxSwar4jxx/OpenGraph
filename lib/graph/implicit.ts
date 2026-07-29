import type { Viewport } from "@/types";
import { pixelToWorld } from "./coords";

type SampleFn = (x: number, y: number) => number;

/**
 * Traces the zero contour of `f(x, y)` across the visible viewport using
 * marching squares on a pixel-aligned grid. Returns a list of line segments
 * in pixel space, ready to stroke directly.
 *
 * Cell size trades accuracy for speed — 6px keeps curves smooth while
 * staying well within a 16ms frame budget even with several implicit
 * curves visible at once.
 */
export function traceImplicit(
  f: SampleFn,
  vp: Viewport,
  w: number,
  h: number,
  cell = 6
): Array<[number, number, number, number]> {
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / cell) + 1;
  const values = new Float64Array(cols * rows);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const px = i * cell;
      const py = j * cell;
      const world = pixelToWorld(px, py, vp, w, h);
      const v = f(world.x, world.y);
      values[j * cols + i] = Number.isFinite(v) ? v : NaN;
    }
  }

  const segments: Array<[number, number, number, number]> = [];
  const at = (i: number, j: number) => values[j * cols + i] as number;

  const lerp = (
    ax: number, ay: number, av: number,
    bx: number, by: number, bv: number
  ): [number, number] => {
    if (!Number.isFinite(av) || !Number.isFinite(bv) || av === bv) return [(ax + bx) / 2, (ay + by) / 2];
    const t = av / (av - bv);
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const x0 = i * cell, x1 = (i + 1) * cell;
      const y0 = j * cell, y1 = (j + 1) * cell;

      const v00 = at(i, j), v10 = at(i + 1, j), v11 = at(i + 1, j + 1), v01 = at(i, j + 1);
      if ([v00, v10, v11, v01].some((v) => !Number.isFinite(v))) continue;

      const b00 = v00 >= 0 ? 1 : 0;
      const b10 = v10 >= 0 ? 1 : 0;
      const b11 = v11 >= 0 ? 1 : 0;
      const b01 = v01 >= 0 ? 1 : 0;
      const caseIndex = (b00 << 3) | (b10 << 2) | (b11 << 1) | b01;
      if (caseIndex === 0 || caseIndex === 15) continue;

      // Edge crossing points (top, right, bottom, left)
      const top = lerp(x0, y0, v00, x1, y0, v10);
      const right = lerp(x1, y0, v10, x1, y1, v11);
      const bottom = lerp(x0, y1, v01, x1, y1, v11);
      const left = lerp(x0, y0, v00, x0, y1, v01);

      const seg = (p: [number, number], q: [number, number]) =>
        segments.push([p[0], p[1], q[0], q[1]]);

      // Standard marching-squares edge table (ambiguous 5/10 cases resolved
      // using the average corner value — good enough at 6px resolution).
      switch (caseIndex) {
        case 1: case 14: seg(left, bottom); break;
        case 2: case 13: seg(bottom, right); break;
        case 3: case 12: seg(left, right); break;
        case 4: case 11: seg(top, right); break;
        case 6: case 9: seg(top, bottom); break;
        case 7: case 8: seg(left, top); break;
        case 5: {
          const avg = (v00 + v10 + v11 + v01) / 4;
          if (avg >= 0) { seg(left, top); seg(bottom, right); }
          else { seg(left, bottom); seg(top, right); }
          break;
        }
        case 10: {
          const avg = (v00 + v10 + v11 + v01) / 4;
          if (avg >= 0) { seg(left, bottom); seg(top, right); }
          else { seg(left, top); seg(bottom, right); }
          break;
        }
      }
    }
  }

  return segments;
}

/**
 * Rasterizes an inequality region (f(x,y) satisfies the comparison) as
 * filled cells. Coarser than the contour tracer since fills don't need
 * sub-pixel precision the way boundary lines do.
 */
export function rasterizeInequality(
  test: (x: number, y: number) => boolean,
  vp: Viewport,
  w: number,
  h: number,
  cell = 5
): Array<[number, number]> {
  const filled: Array<[number, number]> = [];
  for (let py = 0; py < h; py += cell) {
    for (let px = 0; px < w; px += cell) {
      const world = pixelToWorld(px + cell / 2, py + cell / 2, vp, w, h);
      if (test(world.x, world.y)) filled.push([px, py]);
    }
  }
  return filled;
}
