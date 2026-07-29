"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator as CalculatorIcon, Minus, X, Copy, ClipboardPaste, Delete } from "lucide-react";
import { useCalculatorStore } from "@/store/useCalculatorStore";
import { evaluateCalculatorInput, formatResult } from "@/lib/calculator/evaluate";
import { BASIC_KEYS, SCIENTIFIC_KEYS, type CalcKey } from "@/lib/calculator/layout";
import { cn } from "@/lib/utils";

/** The floating trigger button — always rendered so the calculator can be
 *  reopened after closing. Never intercepts pointer events over the graph. */
export function CalculatorLauncher() {
  const isOpen = useCalculatorStore((s) => s.isOpen);
  const open = useCalculatorStore((s) => s.open);
  if (isOpen) return null;
  return (
    <button
      onClick={open}
      aria-label="Open calculator"
      className="pointer-events-auto absolute bottom-4 left-16 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink-muted))] shadow-panel hover:text-[hsl(var(--ink))]"
    >
      <CalculatorIcon size={17} />
    </button>
  );
}

function runKey(key: CalcKey) {
  const s = useCalculatorStore.getState();
  if (key.action === "clear") {
    s.clearDisplay();
    return;
  }
  if (key.action === "backspace") {
    s.backspace();
    return;
  }
  if (key.action === "toggle-sign") {
    s.setDisplay(s.display.startsWith("-") ? s.display.slice(1) : `-${s.display}`);
    return;
  }
  if (key.action === "equals") {
    evaluate();
    return;
  }
  if (key.insert) s.append(key.insert);
}

function evaluate() {
  const s = useCalculatorStore.getState();
  const result = evaluateCalculatorInput(s.display, s.ans);
  if (result.ok && result.value !== undefined && result.formatted) {
    s.commit(result.formatted, result.value);
  }
  // on error, leave the display as-is so the person can fix the typo —
  // errors surface via the small status line under the display instead
  // of clobbering what they typed.
}

export function CalculatorOverlay() {
  const isOpen = useCalculatorStore((s) => s.isOpen);
  const isMinimized = useCalculatorStore((s) => s.isMinimized);
  const mode = useCalculatorStore((s) => s.mode);
  const display = useCalculatorStore((s) => s.display);
  const ans = useCalculatorStore((s) => s.ans);
  const memory = useCalculatorStore((s) => s.memory);
  const history = useCalculatorStore((s) => s.history);
  const close = useCalculatorStore((s) => s.close);
  const toggleMinimized = useCalculatorStore((s) => s.toggleMinimized);
  const setMode = useCalculatorStore((s) => s.setMode);
  const setDisplay = useCalculatorStore((s) => s.setDisplay);
  const memoryAdd = useCalculatorStore((s) => s.memoryAdd);
  const memorySubtract = useCalculatorStore((s) => s.memorySubtract);
  const memoryRecall = useCalculatorStore((s) => s.memoryRecall);
  const memoryClear = useCalculatorStore((s) => s.memoryClear);

  const inputRef = useRef<HTMLInputElement>(null);
  const preview = display.trim() ? evaluateCalculatorInput(display, ans) : null;

  // keyboard shortcuts while the calculator input has focus
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      evaluate();
    } else if (e.key === "Escape") {
      close();
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(display);
    } catch {
      // clipboard permission denied — silently ignore, the value is still
      // selectable/visible in the display for manual copy
    }
  };

  const pasteIntoDisplay = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDisplay(display + text);
    } catch {
      // clipboard read denied — nothing to paste programmatically
    }
  };

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          style={{ position: "absolute", top: 16, right: 16 }}
          className="pointer-events-auto w-[300px] select-none overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.98)] shadow-floating backdrop-blur"
        >
          <div className="flex cursor-grab items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2 active:cursor-grabbing">
            <div className="flex items-center gap-1.5 text-[13px] font-medium">
              <CalculatorIcon size={14} className="text-[hsl(var(--accent))]" />
              Calculator
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleMinimized}
                aria-label={isMinimized ? "Restore calculator" : "Minimize calculator"}
                className="rounded-md p-1 text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--ink)/0.06)]"
              >
                <Minus size={14} />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={close}
                aria-label="Close calculator"
                className="rounded-md p-1 text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--ink)/0.06)]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-3">
              {/* mode switch */}
              <div className="mb-2 flex gap-1 rounded-lg bg-[hsl(var(--ink)/0.05)] p-0.5">
                {(["basic", "scientific"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 rounded-md py-1 text-[12px] font-medium capitalize transition-colors",
                      mode === m ? "bg-[hsl(var(--surface-raised))] shadow-sm" : "text-[hsl(var(--ink-muted))]"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* memory row */}
              <div className="mb-2 flex items-center justify-between text-[10.5px] text-[hsl(var(--ink-muted))]">
                <span>M = {formatResult(memory)}</span>
                <div className="flex gap-1">
                  <button onClick={() => memoryAdd(preview?.value ?? 0)} className="rounded px-1.5 py-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                    M+
                  </button>
                  <button onClick={() => memorySubtract(preview?.value ?? 0)} className="rounded px-1.5 py-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                    M−
                  </button>
                  <button onClick={memoryRecall} className="rounded px-1.5 py-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                    MR
                  </button>
                  <button onClick={memoryClear} className="rounded px-1.5 py-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                    MC
                  </button>
                </div>
              </div>

              {/* display */}
              <div className="mb-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2.5">
                <input
                  ref={inputRef}
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="0"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full bg-transparent text-right font-mono text-xl text-[hsl(var(--ink))] focus:outline-none"
                />
                <div className="mt-0.5 flex items-center justify-between text-right text-[11px] text-[hsl(var(--ink-faint))]">
                  <div className="flex gap-1">
                    <button onClick={copyResult} aria-label="Copy" className="rounded p-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                      <Copy size={11} />
                    </button>
                    <button onClick={pasteIntoDisplay} aria-label="Paste" className="rounded p-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                      <ClipboardPaste size={11} />
                    </button>
                    <button onClick={() => setDisplay(display.slice(0, -1))} aria-label="Backspace" className="rounded p-0.5 hover:bg-[hsl(var(--ink)/0.06)]">
                      <Delete size={11} />
                    </button>
                  </div>
                  <span className="flex-1 truncate">
                    {preview?.ok ? `= ${preview.formatted}` : preview?.error ?? ""}
                  </span>
                </div>
              </div>

              {/* keypad */}
              <div>
                {(mode === "scientific" ? SCIENTIFIC_KEYS : []).map((row, ri) => (
                  <div key={`sci-${ri}`} className="mb-1.5 flex gap-1.5">
                    {row.map((key, ki) => (
                      <button
                        key={ki}
                        onClick={() => runKey(key)}
                        className="h-8 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[12.5px] font-medium hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] active:scale-95"
                      >
                        {key.label}
                      </button>
                    ))}
                  </div>
                ))}
                {BASIC_KEYS.map((row, ri) => (
                  <div key={ri} className="mb-1.5 flex gap-1.5 last:mb-0">
                    {row.map((key, ki) => (
                      <button
                        key={ki}
                        onClick={() => runKey(key)}
                        className={cn(
                          "h-10 flex-1 rounded-lg border text-[15px] font-medium active:scale-95",
                          key.action === "equals"
                            ? "border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:brightness-110"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]",
                          key.wide && "flex-[2]"
                        )}
                      >
                        {key.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* history */}
              {history.length > 0 && (
                <div className="scroll-thin mt-3 max-h-28 overflow-y-auto border-t border-[hsl(var(--border))] pt-2">
                  {history.slice(0, 8).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setDisplay(h.result)}
                      className="flex w-full items-baseline justify-between rounded px-1 py-0.5 text-left text-[11px] hover:bg-[hsl(var(--ink)/0.05)]"
                    >
                      <span className="truncate text-[hsl(var(--ink-faint))]">{h.expression}</span>
                      <span className="ml-2 shrink-0 tabular-nums text-[hsl(var(--ink-muted))]">= {h.result}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
