"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, GripHorizontal, Keyboard } from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";
import { getInputEl } from "@/lib/inputRegistry";
import {
  NUMBERS_LAYOUT,
  FUNCTIONS_LAYOUT,
  CALCULUS_LAYOUT,
  COMPARISON_LAYOUT,
  type KeyLayout,
  type KeyToken,
} from "@/lib/keyboard/layouts";
import { cn } from "@/lib/utils";

const TABS: { id: string; label: string; layout: KeyLayout }[] = [
  { id: "basic", label: "123", layout: NUMBERS_LAYOUT },
  { id: "functions", label: "f(x)", layout: FUNCTIONS_LAYOUT },
  { id: "calculus", label: "∫∑", layout: CALCULUS_LAYOUT },
  { id: "symbols", label: "≤≠", layout: COMPARISON_LAYOUT },
];

/** Inserts `token` at the active expression's cursor, preserving/restoring
 *  focus so repeated taps feel like typing rather than a form submission. */
function insertToken(token: KeyToken) {
  const { activeExpressionId, expressions, updateInput, addExpression, setActiveExpression } =
    useGraphStore.getState();

  let id = activeExpressionId;
  if (!id || !expressions.some((e) => e.id === id)) {
    // nothing focused yet — type into the last expression, or create one
    const last = expressions[expressions.length - 1];
    id = last ? last.id : addExpression();
    setActiveExpression(id);
  }

  const expr = expressions.find((e) => e.id === id);
  const el = getInputEl(id);
  const current = expr?.input ?? "";

  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token.insert + current.slice(end);
  updateInput(id, next);

  const cursor = start + token.insert.length - (token.cursorBack ?? 0);
  requestAnimationFrame(() => {
    const freshEl = getInputEl(id);
    if (freshEl) {
      freshEl.focus();
      freshEl.setSelectionRange(cursor, cursor);
    }
  });
}

export function ScientificKeyboard() {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState("basic");

  const activeLayout = TABS.find((t) => t.id === tab)?.layout ?? NUMBERS_LAYOUT;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open math keyboard"
        className="pointer-events-auto absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink-muted))] shadow-panel hover:text-[hsl(var(--ink))]"
      >
        <Keyboard size={17} />
      </button>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{ position: "absolute", left: 16, bottom: 16 }}
      className="pointer-events-auto w-[min(420px,calc(100vw-2rem))] select-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.97)] shadow-floating backdrop-blur"
    >
      <div className="flex cursor-grab items-center gap-1 rounded-t-2xl border-b border-[hsl(var(--border))] px-2 py-1.5 active:cursor-grabbing">
        <GripHorizontal size={14} className="text-[hsl(var(--ink-faint))]" />
        <div className="flex flex-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--ink)/0.06)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand keyboard" : "Collapse keyboard"}
          className="rounded-md p-1 text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--ink)/0.06)]"
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          aria-label="Close keyboard"
          className="rounded-md px-1.5 py-1 text-[11px] text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--ink)/0.06)]"
        >
          ✕
        </button>
      </div>

      {!collapsed && (
        <div className="p-2">
          {activeLayout.map((row, ri) => (
            <div key={ri} className="mb-1.5 flex gap-1.5 last:mb-0">
              {row.map((key, ki) => (
                <button
                  key={ki}
                  type="button"
                  aria-label={key.ariaLabel ?? key.label}
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the expression input
                  onClick={() => insertToken(key)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[15px] font-medium text-[hsl(var(--ink))] transition-colors hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] active:scale-95",
                    key.wide && "flex-[2]"
                  )}
                >
                  {key.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
