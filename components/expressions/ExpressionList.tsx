"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useGraphStore } from "@/store/useGraphStore";
import { ExpressionItem } from "./ExpressionItem";
import { Button } from "@/components/ui/Button";

export function ExpressionList() {
  const expressions = useGraphStore((s) => s.expressions);
  const addExpression = useGraphStore((s) => s.addExpression);
  const reorder = useGraphStore((s) => s.reorder);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-thin flex-1 overflow-y-auto">
        {expressions.map((expr, i) => (
          <div
            key={expr.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={() => {
              if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
                reorder(dragIndex, overIndex);
              }
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={
              overIndex === i && dragIndex !== null && dragIndex !== i
                ? "border-t-2 border-[hsl(var(--accent))]"
                : ""
            }
          >
            <ExpressionItem expr={expr} />
          </div>
        ))}
      </div>

      <div className="border-t border-[hsl(var(--border))] p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => addExpression()}>
          <Plus size={14} /> Add expression
        </Button>
      </div>
    </div>
  );
}
