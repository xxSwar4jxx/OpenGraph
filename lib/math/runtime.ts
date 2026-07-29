/**
 * Functions available inside compiled expressions. Kept as plain functions
 * (not arrow methods on a class) so V8 can inline them aggressively when
 * this object is captured in the closure of a hot per-pixel sampling loop.
 */
export const RUNTIME = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  log: (x: number) => Math.log(x) / Math.LN10, // "log" = log10 by convention
  ln: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  min: (...xs: number[]) => Math.min(...xs),
  max: (...xs: number[]) => Math.max(...xs),
  mod: (a: number, b: number) => ((a % b) + b) % b,
  pow: Math.pow,
  root: (n: number, x: number) => Math.pow(x, 1 / n),
  factorial: (n: number) => {
    if (n < 0 || !Number.isFinite(n)) return NaN;
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) > 1e-9) return NaN; // non-integer factorial not supported (no gamma fn yet)
    let result = 1;
    for (let k = 2; k <= rounded; k++) result *= k;
    return result;
  },
};

export type RuntimeName = keyof typeof RUNTIME;
