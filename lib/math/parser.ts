import { tokenize, Token, SyntaxErrorAt } from "./tokenizer";
import { CONSTANTS, FUNCTIONS, GREEK_NAMES } from "./constants";
import type { Node, ParseResult, CompareOp } from "@/types";

/**
 * Grammar (precedence low → high):
 *   expr       := compare
 *   compare    := additive ( ('<'|'<='|'>'|'>='|'='|'!=') additive )?
 *   additive   := term ( ('+'|'-') term )*
 *   term       := unary ( ('*'|'/'|'%') unary | implicit-mul )*
 *   unary      := ('-'|'+') unary | power
 *   power      := postfix ( '^' unary )?         // right-assoc
 *   postfix    := atom
 *   atom       := number | ident | ident '(' args ')' | '(' expr ')' | '|' expr '|'
 *
 * Implicit multiplication is handled inside `term`: after parsing a unary,
 * if the next token can start a new unary (ident, number, lparen, pipe)
 * without an explicit operator between them, we insert a '*' node.
 * This is what makes "2x", "2(x+1)", "(x+1)(x-1)", and "xy" all parse.
 */

class Parser {
  private tokens: Token[];
  private pos = 0;
  readonly variables = new Set<string>();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    const t = this.tokens[this.pos + offset];
    if (!t) throw new SyntaxErrorAt("Unexpected end of expression", this.tokens.length);
    return t;
  }

  private advance(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private expect(type: Token["type"], msg: string): Token {
    const t = this.peek();
    if (t.type !== type) throw new SyntaxErrorAt(msg, t.pos);
    return this.advance();
  }

  parseProgram(): Node {
    const node = this.parseCompare();
    const t = this.peek();
    if (t.type !== "eof") {
      throw new SyntaxErrorAt(`Unexpected '${t.value}'`, t.pos);
    }
    return node;
  }

  private parseCompare(): Node {
    let left = this.parseAdditive();
    const t = this.peek();
    if (t.type === "compare") {
      this.advance();
      const right = this.parseAdditive();
      left = { type: "compare", op: t.value as CompareOp, left, right };
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t.type === "op" && (t.value === "+" || t.value === "-")) {
        this.advance();
        const right = this.parseTerm();
        left = { type: "binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private startsAtom(t: Token): boolean {
    // NOTE: "pipe" is deliberately excluded. '|' opens AND closes an
    // absolute-value expression, so treating it as an implicit-multiplication
    // trigger makes a closing '|' look like the start of a new abs-value
    // (e.g. "|x - 3|" would misparse the closing pipe as "3 * |...|").
    // Multiplying into/out of an abs value needs an explicit '*'.
    return t.type === "num" || t.type === "ident" || t.type === "lparen";
  }

  private parseTerm(): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t.type === "op" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        this.advance();
        const right = this.parseUnary();
        left = { type: "binary", op: t.value, left, right };
        continue;
      }
      // implicit multiplication: adjacent atom with no operator
      if (this.startsAtom(t)) {
        const right = this.parseUnary();
        left = { type: "binary", op: "*", left, right };
        continue;
      }
      break;
    }
    return left;
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (t.type === "op" && (t.value === "-" || t.value === "+")) {
      this.advance();
      const value = this.parseUnary();
      return { type: "unary", op: t.value, value };
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const base = this.parsePostfix();
    const t = this.peek();
    if (t.type === "op" && t.value === "^") {
      this.advance();
      // right-associative, and binds tighter than unary minus on the RHS
      // is intentionally NOT special-cased: x^-1 should parse as x^(-1)
      const exponent = this.parseUnary();
      return { type: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private parsePostfix(): Node {
    let node = this.parseAtom();
    while (this.peek().type === "bang") {
      this.advance();
      node = { type: "call", name: "factorial", args: [node] };
    }
    return node;
  }

  private parseArgs(): Node[] {
    const args: Node[] = [];
    if (this.peek().type === "rparen") return args;
    args.push(this.parseCompare());
    while (this.peek().type === "comma") {
      this.advance();
      args.push(this.parseCompare());
    }
    return args;
  }

  private parseAtom(): Node {
    const t = this.peek();

    if (t.type === "num") {
      this.advance();
      return { type: "num", value: parseFloat(t.value) };
    }

    if (t.type === "lparen") {
      this.advance();
      const inner = this.parseCompare();
      this.expect("rparen", "Missing closing ')'");
      return inner;
    }

    if (t.type === "pipe") {
      this.advance();
      const inner = this.parseCompare();
      this.expect("pipe", "Missing closing '|' for absolute value");
      return { type: "call", name: "abs", args: [inner] };
    }

    if (t.type === "ident") {
      this.advance();
      const name = t.value;

      // function call: name immediately followed by '('
      if (this.peek().type === "lparen" && (FUNCTIONS.has(name) || name.length >= 1)) {
        // Only consume as a call if the name is a known function, OR it's a
        // single identifier acting as f(x) (user-defined function like f, g).
        const isKnownFn = FUNCTIONS.has(name);
        const looksLikeUserFn = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && name.length <= 3;
        if (isKnownFn || looksLikeUserFn) {
          this.advance(); // consume '('
          const args = this.parseArgs();
          this.expect("rparen", `Missing closing ')' for ${name}(...)`);
          if (!isKnownFn) this.variables.add(`fn:${name}`);
          return { type: "call", name, args };
        }
      }

      return this.identToNode(name);
    }

    throw new SyntaxErrorAt(
      t.type === "eof" ? "Expression ends unexpectedly" : `Unexpected '${t.value}'`,
      t.pos
    );
  }

  /** Turns a raw identifier into a constant, a single variable, or an
   *  implicit-multiplication chain of single-character variables. */
  private identToNode(name: string): Node {
    const lower = name.toLowerCase();
    if (lower in CONSTANTS) {
      return { type: "num", value: CONSTANTS[lower] as number };
    }
    if (GREEK_NAMES.has(lower) || lower === "ans" || name.length === 1 || name.includes("_")) {
      this.variables.add(name);
      return { type: "var", name };
    }
    // Multi-letter, not a known word → implicit multiplication chain, e.g. "xy" -> x*y
    const chars = Array.from(name);
    let node: Node = { type: "var", name: chars[0] as string };
    this.variables.add(chars[0] as string);
    for (let k = 1; k < chars.length; k++) {
      const ch = chars[k] as string;
      this.variables.add(ch);
      node = { type: "binary", op: "*", left: node, right: { type: "var", name: ch } };
    }
    return node;
  }
}

export function parseExpression(source: string): ParseResult {
  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const node = parser.parseProgram();
    return { ok: true, node, variables: parser.variables };
  } catch (err) {
    if (err instanceof SyntaxErrorAt) {
      return { ok: false, error: err.message, variables: new Set() };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown parse error",
      variables: new Set(),
    };
  }
}
