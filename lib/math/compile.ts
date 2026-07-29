import type { Node } from "@/types";

/**
 * Compiles an AST into a native JS function for fast repeated evaluation
 * (a graph samples an expression thousands of times per frame, so a
 * tree-walking interpreter would show up in profiles immediately).
 *
 * Two compile targets:
 *  - `compileNumeric`   → (params) => number        for functions/parametrics
 *  - `compileComparison`→ (params) => number|boolean for implicit/inequality
 *    (returns a signed "difference" for '=' so marching squares can find
 *    the zero contour, and a boolean for <, <=, >, >=, !=)
 */

export interface CompiledFn {
  fn: (...args: number[]) => number;
  params: string[]; // ordered parameter names, matches call signature
  source: string; // generated JS, useful for debugging
}

export interface CompiledPredicate {
  fn: (...args: number[]) => number; // signed difference, 0 at the boundary
  isInequality: boolean;
  flipped: boolean; // true if the original inequality was ">" style
  params: string[];
  source: string;
}

let uidCounter = 0;

function safeName(original: string): string {
  uidCounter++;
  return `v${uidCounter}_${original.replace(/[^a-zA-Z0-9]/g, "")}`;
}

class Emitter {
  varMap = new Map<string, string>();

  nameFor(original: string): string {
    let mapped = this.varMap.get(original);
    if (!mapped) {
      mapped = safeName(original);
      this.varMap.set(original, mapped);
    }
    return mapped;
  }

  emit(node: Node): string {
    switch (node.type) {
      case "num":
        return Number.isFinite(node.value) ? `(${node.value})` : `(NaN)`;
      case "var":
        return this.nameFor(node.name);
      case "unary":
        return node.op === "-" ? `(-(${this.emit(node.value)}))` : `(+(${this.emit(node.value)}))`;
      case "binary": {
        const l = this.emit(node.left);
        const r = this.emit(node.right);
        switch (node.op) {
          case "+":
            return `(${l} + ${r})`;
          case "-":
            return `(${l} - ${r})`;
          case "*":
            return `(${l} * ${r})`;
          case "/":
            return `(${l} / ${r})`;
          case "%":
            return `__fn.mod(${l}, ${r})`;
          case "^":
            return `Math.pow(${l}, ${r})`;
        }
        break;
      }
      case "call": {
        if (node.name === "sum" || node.name === "prod") {
          return this.emitReduction(node.name, node.args);
        }
        if (node.name === "derivative") {
          return this.emitDerivative(node.args);
        }
        if (node.name === "integral") {
          return this.emitIntegral(node.args);
        }
        if (node.name === "lim") {
          return this.emitLimit(node.args);
        }
        const args = node.args.map((a) => this.emit(a)).join(", ");
        if (node.name in RUNTIME_KEYS) {
          return `__fn.${node.name}(${args})`;
        }
        // Named user-defined functions (f(x) = ... referenced from another
        // expression) aren't inlined yet — flag clearly instead of emitting
        // a ReferenceError at evaluation time. Tracked as a roadmap item.
        throw new Error(`Unknown function '${node.name}(...)' — function references aren't supported yet`);
      }
      case "compare":
        throw new Error("compare node must be handled by compileComparison, not emit()");
    }
  }

  /** sum(body, index, from, to) / prod(body, index, from, to) — real loops,
   *  not symbolic summation, so `to - from` stays reasonably small in practice. */
  private emitReduction(name: "sum" | "prod", args: Node[]): string {
    if (args.length !== 4) {
      throw new Error(`${name}(...) needs 4 arguments: body, index variable, from, to`);
    }
    const [bodyNode, varNode, fromNode, toNode] = args as [Node, Node, Node, Node];
    if (varNode.type !== "var") {
      throw new Error(`${name}(...)'s second argument must be a plain index variable, e.g. n`);
    }
    const loopVar = `__i${++uidCounter}`;
    const bodyExpr = this.withShadow(varNode.name, loopVar, () => this.emit(bodyNode));
    const fromExpr = this.emit(fromNode);
    const toExpr = this.emit(toNode);
    const init = name === "sum" ? "0" : "1";
    const op = name === "sum" ? "+=" : "*=";
    const acc = `__acc${uidCounter}`;
    const from = `__from${uidCounter}`;
    const to = `__to${uidCounter}`;
    return (
      `(function(){let ${acc}=${init}; const ${from}=Math.round(${fromExpr}); const ${to}=Math.round(${toExpr}); ` +
      `for(let ${loopVar}=${from}; ${loopVar}<=${to}; ${loopVar}++){ ${acc} ${op} (${bodyExpr}); } return ${acc};})()`
    );
  }

  /** derivative(body[, var]) via central-difference numerical differentiation. */
  private emitDerivative(args: Node[]): string {
    if (args.length < 1 || args.length > 2) throw new Error("derivative(...) needs 1 or 2 arguments");
    const bodyNode = args[0] as Node;
    const varName = args[1] && args[1].type === "var" ? args[1].name : "x";
    const param = `__p${++uidCounter}`;
    const bodyExpr = this.withShadow(varName, param, () => this.emit(bodyNode));
    const baseSafe = this.nameFor(varName);
    const fnName = `__f${uidCounter}`;
    const h = `__h${uidCounter}`;
    return (
      `(function(){const ${fnName}=function(${param}){ return (${bodyExpr}); }; const ${h}=1e-6; ` +
      `return (${fnName}(${baseSafe}+${h}) - ${fnName}(${baseSafe}-${h})) / (2*${h}); })()`
    );
  }

  /** integral(body, a, b[, var]) via composite Simpson's rule, 200 subintervals. */
  private emitIntegral(args: Node[]): string {
    if (args.length < 3 || args.length > 4) throw new Error("integral(...) needs body, lower bound, upper bound");
    const bodyNode = args[0] as Node;
    const aNode = args[1] as Node;
    const bNode = args[2] as Node;
    const varName = args[3] && args[3].type === "var" ? args[3].name : "x";
    const param = `__p${++uidCounter}`;
    const bodyExpr = this.withShadow(varName, param, () => this.emit(bodyNode));
    const aExpr = this.emit(aNode);
    const bExpr = this.emit(bNode);
    const fnName = `__f${uidCounter}`;
    const a = `__a${uidCounter}`, b = `__b${uidCounter}`, n = `__n${uidCounter}`;
    const hh = `__hh${uidCounter}`, s = `__s${uidCounter}`, i = `__ii${uidCounter}`, xx = `__xx${uidCounter}`;
    return (
      `(function(){const ${fnName}=function(${param}){ return (${bodyExpr}); }; ` +
      `const ${a}=(${aExpr}); const ${b}=(${bExpr}); const ${n}=200; const ${hh}=(${b}-${a})/${n}; ` +
      `let ${s}=${fnName}(${a})+${fnName}(${b}); ` +
      `for(let ${i}=1; ${i}<${n}; ${i}++){ const ${xx}=${a}+${i}*${hh}; ${s} += (${i}%2===0?2:4)*${fnName}(${xx}); } ` +
      `return ${s}*${hh}/3; })()`
    );
  }

  /** lim(body, var, target) — approximated by averaging the two-sided
   *  approach at a tiny epsilon (handles removable discontinuities; does
   *  not detect true divergence, which is a known limitation). */
  private emitLimit(args: Node[]): string {
    if (args.length !== 3) throw new Error("lim(...) needs 3 arguments: body, variable, target");
    const bodyNode = args[0] as Node;
    const varNode = args[1] as Node;
    const targetNode = args[2] as Node;
    if (varNode.type !== "var") throw new Error("lim(...)'s second argument must be a plain variable, e.g. x");
    const param = `__p${++uidCounter}`;
    const bodyExpr = this.withShadow(varNode.name, param, () => this.emit(bodyNode));
    const targetExpr = this.emit(targetNode);
    const fnName = `__f${uidCounter}`;
    const t = `__t${uidCounter}`, h = `__h${uidCounter}`;
    return (
      `(function(){const ${fnName}=function(${param}){ return (${bodyExpr}); }; const ${t}=(${targetExpr}); const ${h}=1e-6; ` +
      `return (${fnName}(${t}+${h}) + ${fnName}(${t}-${h})) / 2; })()`
    );
  }

  /** Temporarily maps `originalName` to `safeName` while `fn` emits, then restores
   *  whatever mapping existed before — used so bound variables (sum index,
   *  derivative variable) shadow correctly without corrupting outer scope. */
  private withShadow<T>(originalName: string, safeName: string, fn: () => T): T {
    const prev = this.varMap.get(originalName);
    this.varMap.set(originalName, safeName);
    const result = fn();
    if (prev) this.varMap.set(originalName, prev);
    else this.varMap.delete(originalName);
    return result;
  }
}

const RUNTIME_KEYS: Record<string, true> = {
  sin: true, cos: true, tan: true, asin: true, acos: true, atan: true, atan2: true,
  sinh: true, cosh: true, tanh: true, asinh: true, acosh: true, atanh: true,
  sqrt: true, cbrt: true, exp: true, abs: true, sign: true, floor: true, ceil: true,
  round: true, log: true, ln: true, log2: true, log10: true, min: true, max: true,
  mod: true, pow: true, root: true, factorial: true,
};

export function compileNumeric(node: Node, orderedParams: string[]): CompiledFn {
  const emitter = new Emitter();
  // Pre-register requested params so their generated names are stable and
  // match the call signature order, even if unused in the expression.
  const paramSafeNames = orderedParams.map((p) => emitter.nameFor(p));
  const body = node.type === "compare" ? emitDiff(emitter, node) : emitter.emit(node);
  const source = `return ${body};`;
  // eslint-disable-next-line no-new-func
  const fn = new Function("__fn", ...paramSafeNames, source) as (fnTable: typeof RUNTIME, ...a: number[]) => number;
  return {
    fn: (...args: number[]) => fn(RUNTIME, ...args),
    params: orderedParams,
    source,
  };
}

function emitDiff(emitter: Emitter, node: Extract<Node, { type: "compare" }>): string {
  const l = emitter.emit(node.left);
  const r = emitter.emit(node.right);
  return `(${l} - (${r}))`;
}

export function compileComparison(node: Node, orderedParams: string[]): CompiledPredicate {
  const emitter = new Emitter();
  const paramSafeNames = orderedParams.map((p) => emitter.nameFor(p));

  if (node.type !== "compare") {
    // Bare expression with no relation — treat as "expression = 0" isn't
    // meaningful for a 2D implicit; callers should not reach this path.
    const body = emitter.emit(node);
    const source = `return ${body};`;
    // eslint-disable-next-line no-new-func
    const fn = new Function("__fn", ...paramSafeNames, source) as (fnTable: typeof RUNTIME, ...a: number[]) => number;
    return {
      fn: (...args: number[]) => fn(RUNTIME, ...args),
      isInequality: false,
      flipped: false,
      params: orderedParams,
      source,
    };
  }

  const isInequality = node.op !== "=" && node.op !== "!=";
  const flipped = node.op === ">" || node.op === ">=";
  const l = emitter.emit(node.left);
  const r = emitter.emit(node.right);
  const diff = `(${l} - (${r}))`;
  const source = `return ${diff};`;
  // eslint-disable-next-line no-new-func
  const fn = new Function("__fn", ...paramSafeNames, source) as (fnTable: typeof RUNTIME, ...a: number[]) => number;
  return {
    fn: (...args: number[]) => fn(RUNTIME, ...args),
    isInequality,
    flipped,
    params: orderedParams,
    source,
  };
}

import { RUNTIME } from "./runtime";
