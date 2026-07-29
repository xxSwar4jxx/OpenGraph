import { parseExpression } from "./parser";
import type { ExpressionKind, Node, ParseResult } from "@/types";

export interface Classification {
  kind: ExpressionKind;
  error: string | null;
  variables: Set<string>;
  /** For "function": the compare node's right side (or the bare node). */
  node?: Node;
  /** For "function"/"parametric": the bound function name, e.g. "f" in f(x)=. */
  functionName?: string;
  /** For "parametric"/"point": the two component nodes. */
  components?: [Node, Node];
  /** For "slider": the variable name and its literal value. */
  sliderName?: string;
  sliderValue?: number;
}

/** Finds a top-level comma (depth 0 w.r.t. parens) — used to detect "(a, b)". */
function splitTopLevelComma(input: string): [string, string] | null {
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 1) {
      return [input.slice(0, i), input.slice(i + 1)];
    }
  }
  return null;
}

export function classifyExpression(raw: string): Classification {
  const input = raw.trim();
  if (input.length === 0) {
    return { kind: "unknown", error: null, variables: new Set() };
  }

  // --- Ordered pair: parametric curve or a literal point -------------
  if (input.startsWith("(") && input.endsWith(")")) {
    const inner = input.slice(0, input.length); // keep parens for depth tracking
    const split = splitTopLevelComma(inner);
    if (split) {
      const [aRaw, bRaw] = [split[0].slice(1), split[1].slice(0, -1)];
      const a = parseExpression(aRaw);
      const b = parseExpression(bRaw);
      if (!a.ok || !b.ok) {
        return {
          kind: "unknown",
          error: (!a.ok ? a.error : b.error) ?? "Invalid point",
          variables: new Set(),
        };
      }
      const vars = new Set<string>([...a.variables, ...b.variables]);
      const onlyT = [...vars].every((v) => v === "t");
      if (vars.size === 0) {
        return {
          kind: "point",
          error: null,
          variables: vars,
          components: [a.node as Node, b.node as Node],
        };
      }
      if (onlyT) {
        return {
          kind: "parametric",
          error: null,
          variables: vars,
          components: [a.node as Node, b.node as Node],
        };
      }
      return {
        kind: "unknown",
        error: "Parametric curves use 't' as the parameter, e.g. (cos(t), sin(t))",
        variables: vars,
      };
    }
  }

  const result = parseExpression(input);
  if (!result.ok || !result.node) {
    return { kind: "unknown", error: result.error ?? "Could not parse expression", variables: result.variables };
  }

  const node = result.node;
  const vars = result.variables;

  if (node.type === "compare") {
    if (node.op !== "=") {
      // Inequality: y > x^2, x^2 + y^2 <= 4, etc.
      return { kind: "inequality", error: null, variables: vars, node };
    }

    // "=" — could be: slider (a = 3), function (y = ... / f(x) = ...),
    // polar (r = ...), or implicit (both x & y present).
    const left = node.left;

    // slider: single bare variable = numeric literal, nothing else free
    if (left.type === "var" && node.right.type === "num" && vars.size <= 1) {
      return {
        kind: "slider",
        error: null,
        variables: vars,
        sliderName: left.name,
        sliderValue: node.right.value,
      };
    }

    // named function: f(x) = ...
    if (left.type === "call" && left.args.length === 1 && left.args[0]?.type === "var") {
      return {
        kind: "function",
        error: null,
        variables: vars,
        node: node.right,
        functionName: left.name,
      };
    }

    // y = f(x)
    if (left.type === "var" && left.name === "y" && !containsVar(node.right, "y")) {
      return { kind: "function", error: null, variables: vars, node: node.right };
    }

    // r = f(theta)
    if (left.type === "var" && (left.name === "r" || left.name === "R")) {
      return { kind: "polar", error: null, variables: vars, node: node.right };
    }

    // x = f(y) — vertical-ish curve, treat as implicit so we can contour it
    return { kind: "implicit", error: null, variables: vars, node };
  }

  // Bare expression, no relation typed.
  if (vars.has("theta") || vars.has("θ")) {
    return { kind: "polar", error: null, variables: vars, node };
  }
  if (vars.size === 0 || vars.has("x")) {
    // "x^2" behaves like "y = x^2"
    return { kind: "function", error: null, variables: vars, node };
  }
  if (vars.size === 1 && vars.has("t")) {
    return {
      kind: "unknown",
      error: "A single 't' expression needs a pair — try (cos(t), sin(t))",
      variables: vars,
    };
  }

  return { kind: "function", error: null, variables: vars, node };
}

function containsVar(node: Node, name: string): boolean {
  switch (node.type) {
    case "var":
      return node.name === name;
    case "num":
      return false;
    case "unary":
      return containsVar(node.value, name);
    case "binary":
      return containsVar(node.left, name) || containsVar(node.right, name);
    case "compare":
      return containsVar(node.left, name) || containsVar(node.right, name);
    case "call":
      return node.args.some((a) => containsVar(a, name));
  }
}
