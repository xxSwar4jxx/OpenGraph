/**
 * Tokenizer for user-typed math input.
 *
 * Supports plain-text math (not raw LaTeX) — e.g. "sin(x)^2 + 1/2".
 * A LaTeX-to-plaintext preprocessor lives in `latex.ts` and runs before
 * this tokenizer so both input styles share one parser.
 */

export type TokenType =
  | "num"
  | "ident"
  | "op"
  | "lparen"
  | "rparen"
  | "pipe"
  | "comma"
  | "compare"
  | "bang"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const OPERATORS = new Set(["+", "-", "*", "/", "^", "%"]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = source;

  const push = (type: TokenType, value: string, pos: number) =>
    tokens.push({ type, value, pos });

  while (i < s.length) {
    const c = s[i];

    if (c === undefined) break;

    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }

    // Numbers: 123, 3.14, .5, 1e-10
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] ?? ""))) {
      const start = i;
      let sawDot = c === ".";
      i++;
      while (i < s.length) {
        const ch = s[i];
        if (ch === undefined) break;
        if (/[0-9]/.test(ch)) {
          i++;
        } else if (ch === "." && !sawDot) {
          sawDot = true;
          i++;
        } else if ((ch === "e" || ch === "E") && /[0-9+\-]/.test(s[i + 1] ?? "")) {
          i += 2;
          while (i < s.length && /[0-9]/.test(s[i] ?? "")) i++;
          break;
        } else {
          break;
        }
      }
      push("num", s.slice(start, i), start);
      continue;
    }

    // Identifiers: letters, greek names, subscripted names like a_1
    if (/[a-zA-Zα-ωΑ-Ω]/.test(c)) {
      const start = i;
      i++;
      while (i < s.length) {
        const ch = s[i];
        if (ch === undefined) break;
        if (/[a-zA-Z0-9α-ωΑ-Ω]/.test(ch)) {
          i++;
        } else if (ch === "_" && /[a-zA-Z0-9]/.test(s[i + 1] ?? "")) {
          i += 2;
          while (i < s.length && /[a-zA-Z0-9]/.test(s[i] ?? "")) i++;
          break;
        } else {
          break;
        }
      }
      push("ident", s.slice(start, i), start);
      continue;
    }

    if (c === "(") {
      push("lparen", c, i);
      i++;
      continue;
    }
    if (c === ")") {
      push("rparen", c, i);
      i++;
      continue;
    }
    if (c === "|") {
      push("pipe", c, i);
      i++;
      continue;
    }
    if (c === ",") {
      push("comma", c, i);
      i++;
      continue;
    }

    // Comparisons — order matters, check two-char forms first.
    if (c === "<" || c === ">" || c === "=" || c === "!") {
      const two = s.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "!=") {
        push("compare", two, i);
        i += 2;
        continue;
      }
      if (c === "!") {
        push("bang", c, i);
        i++;
        continue;
      }
      push("compare", c, i);
      i++;
      continue;
    }

    if (OPERATORS.has(c)) {
      push("op", c, i);
      i++;
      continue;
    }

    throw new SyntaxErrorAt(`Unrecognized character '${c}'`, i);
  }

  push("eof", "", i);
  return tokens;
}

export class SyntaxErrorAt extends Error {
  pos: number;
  constructor(message: string, pos: number) {
    super(message);
    this.pos = pos;
  }
}
