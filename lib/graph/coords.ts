import type { Viewport } from "@/types";

/** World → pixel. Y is flipped because canvas Y grows downward. */
export function worldToPixel(wx: number, wy: number, vp: Viewport, w: number, h: number) {
  return {
    x: w / 2 + (wx - vp.centerX) / vp.scale,
    y: h / 2 - (wy - vp.centerY) / vp.scale,
  };
}

export function pixelToWorld(px: number, py: number, vp: Viewport, w: number, h: number) {
  return {
    x: vp.centerX + (px - w / 2) * vp.scale,
    y: vp.centerY - (py - h / 2) * vp.scale,
  };
}

/** Picks a "nice" grid step (1, 2, or 5 × 10^n) closest to a target pixel spacing. */
export function niceStep(scale: number, targetPixelSpacing = 80): number {
  const rawWorldStep = targetPixelSpacing * scale;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawWorldStep)));
  const residual = rawWorldStep / magnitude;
  let niceResidual: number;
  if (residual < 1.5) niceResidual = 1;
  else if (residual < 3.5) niceResidual = 2;
  else if (residual < 7.5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

export function formatAxisLabel(value: number, step: number): string {
  if (Math.abs(value) < step / 1000) return "0";
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  if (Math.abs(value) >= 100000 || (Math.abs(value) < 0.0001 && value !== 0)) {
    return value.toExponential(1);
  }
  const fixed = value.toFixed(Math.min(decimals, 6));
  return String(parseFloat(fixed));
}
