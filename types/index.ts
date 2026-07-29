/**
 * Core domain types for the graphing calculator.
 *
 * Kept framework-agnostic on purpose: nothing in here imports React,
 * so `lib/math` and `types` can eventually be reused by a headless
 * export/render worker without pulling in the UI layer.
 */

export type ExpressionKind =
  | "function" // y = ... or f(x) = ...
  | "parametric" // (x(t), y(t))
  | "polar" // r(θ)
  | "implicit" // e.g. x^2 + y^2 = 4
  | "inequality" // e.g. y > x^2
  | "point" // literal coordinate, e.g. (1, 2)
  | "slider" // a = 3 (bare numeric assignment)
  | "unknown"; // not yet classified / invalid

export interface ExpressionStyle {
  color: string; // hex color, e.g. "#3557F0"
  lineWidth: number; // px at 1x zoom
  dashed: boolean;
  fillOpacity?: number; // used for inequalities (0 = no fill)
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  value: number;
  playing: boolean; // animation state
  playbackSpeed: number; // units/sec when playing
}

export interface Expression {
  id: string;
  /** Raw text as typed by the user, e.g. "y = sin(x) * a" */
  input: string;
  kind: ExpressionKind;
  visible: boolean;
  locked: boolean;
  style: ExpressionStyle;
  /** Populated once the expression is classified as a slider variable. */
  slider?: SliderConfig;
  /** Human-readable error, or null when the expression parses cleanly. */
  error: string | null;
  /** Order in the list — persisted so drag-reorder survives reloads. */
  index: number;
}

export interface Viewport {
  /** World-space center of the visible window. */
  centerX: number;
  centerY: number;
  /** World units visible per pixel — the single source of truth for zoom. */
  scale: number;
}

export interface GraphSettings {
  showGrid: boolean;
  showAxes: boolean;
  showLabels: boolean;
  theme: "light" | "dark" | "system";
}

// ---- Math AST -------------------------------------------------------

export type BinaryOp = "+" | "-" | "*" | "/" | "^" | "%";
export type CompareOp = "<" | "<=" | ">" | ">=" | "=" | "!=";

export type Node =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "binary"; op: BinaryOp; left: Node; right: Node }
  | { type: "unary"; op: "-" | "+"; value: Node }
  | { type: "call"; name: string; args: Node[] }
  | { type: "compare"; op: CompareOp; left: Node; right: Node };

export interface ParseResult {
  ok: boolean;
  node?: Node;
  error?: string;
  /** Free variables referenced, excluding known constants (pi, e, tau). */
  variables: Set<string>;
}
