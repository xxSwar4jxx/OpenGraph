import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic, readable id generator for expressions (no uuid dependency). */
export function genId(prefix = "expr"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The rotating palette assigned to new expressions, in Desmos-adjacent
 *  but distinct hues tuned to sit well on both light and dark surfaces. */
export const EXPRESSION_PALETTE = [
  "#3557F0", // plot-ink indigo (accent)
  "#E0574C", // signal red
  "#1F9E6D", // signal green
  "#D98A1F", // amber
  "#8A5CF6", // violet
  "#12A5B0", // teal
  "#E0559A", // magenta
  "#5B7083", // slate
];
