export interface KeyToken {
  /** What's shown on the key. */
  label: string;
  /** Text inserted at the cursor. */
  insert: string;
  /** How many characters back from the end of `insert` to place the cursor
   *  (e.g. "sqrt()" with cursorBack=1 lands the cursor between the parens). */
  cursorBack?: number;
  /** Optional aria-label when `label` isn't screen-reader friendly. */
  ariaLabel?: string;
  wide?: boolean;
}

export type KeyRow = KeyToken[];
export type KeyLayout = KeyRow[];

export const NUMBERS_LAYOUT: KeyLayout = [
  [
    { label: "7", insert: "7" }, { label: "8", insert: "8" }, { label: "9", insert: "9" },
    { label: "÷", insert: "/" },
  ],
  [
    { label: "4", insert: "4" }, { label: "5", insert: "5" }, { label: "6", insert: "6" },
    { label: "×", insert: "*" },
  ],
  [
    { label: "1", insert: "1" }, { label: "2", insert: "2" }, { label: "3", insert: "3" },
    { label: "−", insert: "-" },
  ],
  [
    { label: "0", insert: "0" }, { label: ".", insert: "." }, { label: "x", insert: "x" },
    { label: "+", insert: "+" },
  ],
];

export const FUNCTIONS_LAYOUT: KeyLayout = [
  [
    { label: "x²", insert: "^2" },
    { label: "xⁿ", insert: "^", ariaLabel: "power" },
    { label: "√", insert: "sqrt()", cursorBack: 1 },
    { label: "ⁿ√", insert: "root(,)", cursorBack: 2, ariaLabel: "nth root: root(n, x)" },
  ],
  [
    { label: "a/b", insert: "()/()", cursorBack: 4, ariaLabel: "fraction" },
    { label: "|x|", insert: "||", cursorBack: 1, ariaLabel: "absolute value" },
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
  ],
  [
    { label: "sin", insert: "sin()", cursorBack: 1 },
    { label: "cos", insert: "cos()", cursorBack: 1 },
    { label: "tan", insert: "tan()", cursorBack: 1 },
    { label: "π", insert: "pi" },
  ],
  [
    { label: "sin⁻¹", insert: "asin()", cursorBack: 1 },
    { label: "cos⁻¹", insert: "acos()", cursorBack: 1 },
    { label: "tan⁻¹", insert: "atan()", cursorBack: 1 },
    { label: "e", insert: "e" },
  ],
  [
    { label: "ln", insert: "ln()", cursorBack: 1 },
    { label: "log", insert: "log()", cursorBack: 1 },
    { label: "eˣ", insert: "exp()", cursorBack: 1 },
    { label: "θ", insert: "theta" },
  ],
];

export const CALCULUS_LAYOUT: KeyLayout = [
  [
    { label: "∑", insert: "sum(,,,)", cursorBack: 4, ariaLabel: "summation: sum(body, index, from, to)", wide: true },
    { label: "∏", insert: "prod(,,,)", cursorBack: 4, ariaLabel: "product: prod(body, index, from, to)", wide: true },
  ],
  [
    { label: "lim", insert: "lim(,,)", cursorBack: 3, ariaLabel: "limit: lim(body, variable, target)", wide: true },
    { label: "d/dx", insert: "derivative()", cursorBack: 1, ariaLabel: "derivative: derivative(body)", wide: true },
  ],
  [
    { label: "∫", insert: "integral(,,)", cursorBack: 3, ariaLabel: "integral: integral(body, a, b)", wide: true },
    { label: "∞", insert: "infinity", ariaLabel: "infinity", wide: true },
  ],
];

export const COMPARISON_LAYOUT: KeyLayout = [
  [
    { label: "=", insert: "=" }, { label: "≠", insert: "!=" },
    { label: "<", insert: "<" }, { label: ">", insert: ">" },
    { label: "≤", insert: "<=" }, { label: "≥", insert: ">=" },
  ],
  [
    { label: "τ", insert: "tau" }, { label: ",", insert: "," },
    { label: "α", insert: "alpha" }, { label: "β", insert: "beta" },
    { label: "λ", insert: "lambda" }, { label: "μ", insert: "mu" },
  ],
];
