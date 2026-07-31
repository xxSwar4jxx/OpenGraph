"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Sigma } from "lucide-react";
import { ExpressionList } from "@/components/expressions/ExpressionList";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { GraphControls } from "@/components/graph/GraphControls";
import { ScientificKeyboard } from "@/components/keyboard/ScientificKeyboard";
import {
  CalculatorLauncher,
  CalculatorOverlay,
} from "@/components/calculator/CalculatorOverlay";
import { IconButton } from "@/components/ui/IconButton";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="flex h-dvh w-dvw flex-col overflow-hidden bg-[hsl(var(--surface))] text-[hsl(var(--ink))]">
    {/* Top Bar */}
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-3">
    {/* Left */}
    <div className="flex items-center gap-2">
    <IconButton
    label={sidebarOpen ? "Hide expression list" : "Show expression list"}
    onClick={() => setSidebarOpen((v) => !v)}
    >
    {sidebarOpen ? (
      <PanelLeftClose size={17} />
    ) : (
      <PanelLeftOpen size={17} />
    )}
    </IconButton>

    <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
    <Sigma size={16} className="text-[hsl(var(--accent))]" />
    <span>OpenGraph</span>
    </div>
    </div>

    {/* Partnership */}
    <a
    href="https://nispax.in"
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/5"
    >
    <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
    Built in partnership with
    </span>

    <span
    className="
    text-sm
    font-bold
    tracking-wide
    bg-gradient-to-r
    from-orange-400
    via-white
    to-blue-400
    bg-clip-text
    text-transparent
    "
    >
    NISPAX
    </span>

    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--ink))] transition-colors">
    Infotech
    </span>
    </a>
    </header>

    {/* Body */}
    <div className="relative flex min-h-0 flex-1">
    <aside
    className={
      sidebarOpen
      ? "w-full max-w-[380px] shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] sm:w-[340px]"
      : "w-0 shrink-0 overflow-hidden border-r border-transparent"
    }
    >
    <ExpressionList />
    </aside>

    <section
    className={`relative min-w-0 flex-1 ${
      sidebarOpen ? "hidden sm:block" : "block"
    }`}
    >
    <GraphCanvas />
    <GraphControls />
    <ScientificKeyboard />
    <CalculatorLauncher />
    <CalculatorOverlay />
    </section>
    </div>
    </main>
  );
}
