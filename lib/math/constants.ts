export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  τ: Math.PI * 2,
  infinity: Infinity,
  inf: Infinity,
};

/**
 * Every name here is treated as an atomic identifier during tokenization —
 * i.e. "sin" is never split into s*i*n via implicit multiplication.
 * Anything NOT in this list is assumed to be a single-character variable
 * (or a user-defined slider) and multi-letter runs like "xy" are expanded
 * to implicit multiplication: x*y.
 */
export const FUNCTIONS = new Set([
  "sin", "cos", "tan",
  "asin", "acos", "atan", "atan2",
  "sinh", "cosh", "tanh",
  "asinh", "acosh", "atanh",
  "sqrt", "cbrt", "root",
  "log", "ln", "log2", "log10",
  "exp",
  "abs", "sign",
  "floor", "ceil", "round",
  "min", "max",
  "mod",
  // calculus / reduction — handled specially by the compiler (lib/math/compile.ts),
  // not simple RUNTIME lookups, since they need loops or bound variables.
  "sum", "prod", "derivative", "integral", "lim",
  "factorial",
]);

export const GREEK_NAMES = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "rho", "sigma",
  "tau", "upsilon", "phi", "chi", "psi", "omega",
]);
