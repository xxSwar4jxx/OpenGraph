import { parseExpression } from "@/lib/math/parser";
import { compileNumeric } from "@/lib/math/compile";

export interface CalcEvalResult {
  ok: boolean;
  value?: number;
  formatted?: string;
  error?: string;
}

/** Formats a number for calculator display: trims float noise, switches to
 *  scientific notation for very large/small magnitudes. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return value === Infinity ? "∞" : value === -Infinity ? "-∞" : "Undefined";
  if (Object.is(value, -0)) return "0";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return value.toExponential(6).replace(/e\+?/, "e");
  // trim to 12 significant digits to avoid floating-point noise like 0.1+0.2
  const rounded = parseFloat(value.toPrecision(12));
  return String(rounded);
}

export function evaluateCalculatorInput(input: string, ans: number): CalcEvalResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, error: "Empty expression" };

  const parsed = parseExpression(trimmed);
  if (!parsed.ok || !parsed.node) {
    return { ok: false, error: parsed.error ?? "Invalid expression" };
  }

  const disallowed = [...parsed.variables].filter((v) => v.toLowerCase() !== "ans");
  if (disallowed.length > 0) {
    return { ok: false, error: `Unknown symbol: ${disallowed[0]}` };
  }

  try {
    const usesAns = parsed.variables.has("ans") || parsed.variables.has("Ans");
    const compiled = compileNumeric(parsed.node, usesAns ? ["ans"] : []);
    const value = usesAns ? compiled.fn(ans) : compiled.fn();
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Result is undefined (check for division by zero)" };
    }
    return { ok: true, value, formatted: formatResult(value) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not evaluate" };
  }
}
