import { create } from "zustand";
import type { Expression, GraphSettings, Viewport } from "@/types";
import { genId, EXPRESSION_PALETTE, clamp } from "@/lib/utils";

interface HistoryEntry {
  expressions: Expression[];
}

interface GraphState {
  expressions: Expression[];
  viewport: Viewport;
  settings: GraphSettings;
  activeExpressionId: string | null;
  setActiveExpression: (id: string | null) => void;

  // history (undo/redo) — capped to keep memory bounded
  past: HistoryEntry[];
  future: HistoryEntry[];

  // -- expression CRUD --
  addExpression: (input?: string) => string;
  updateInput: (id: string, input: string) => void;
  removeExpression: (id: string) => void;
  duplicateExpression: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setColor: (id: string, color: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clearAll: () => void;

  // -- sliders --
  ensureSlider: (id: string, initialValue: number) => void;
  setSliderValue: (id: string, value: number) => void;
  setSliderRange: (id: string, min: number, max: number, step: number) => void;
  toggleSliderPlay: (id: string) => void;
  tickSliders: (dtSeconds: number) => void;

  // -- viewport --
  pan: (dxPixels: number, dyPixels: number) => void;
  zoomAt: (pixelX: number, pixelY: number, factor: number, viewportW: number, viewportH: number) => void;
  resetView: () => void;

  // -- settings --
  toggleGrid: () => void;
  toggleAxes: () => void;
  setTheme: (theme: GraphSettings["theme"]) => void;

  // -- history --
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const DEFAULT_VIEWPORT: Viewport = { centerX: 0, centerY: 0, scale: 0.01 };

const DEFAULT_SETTINGS: GraphSettings = {
  showGrid: true,
  showAxes: true,
  showLabels: true,
  theme: "system",
};

function nextColor(expressions: Expression[]): string {
  return EXPRESSION_PALETTE[expressions.length % EXPRESSION_PALETTE.length] as string;
}

function blankExpression(index: number, input = ""): Expression {
  return {
    id: genId(),
    input,
    kind: "unknown",
    visible: true,
    locked: false,
    style: { color: EXPRESSION_PALETTE[index % EXPRESSION_PALETTE.length] as string, lineWidth: 2.5, dashed: false },
    error: null,
    index,
  };
}

const HISTORY_LIMIT = 50;

export const useGraphStore = create<GraphState>((set, get) => ({
  expressions: [blankExpression(0)],
  viewport: { ...DEFAULT_VIEWPORT },
  settings: { ...DEFAULT_SETTINGS },
  activeExpressionId: null,
  setActiveExpression: (id) => set({ activeExpressionId: id }),
  past: [],
  future: [],

  pushHistory: () => {
    set((s) => ({
      past: [...s.past.slice(-HISTORY_LIMIT + 1), { expressions: s.expressions }],
      future: [],
    }));
  },

  addExpression: (input = "") => {
    get().pushHistory();
    const id = genId();
    set((s) => {
      const expr: Expression = {
        id,
        input,
        kind: "unknown",
        visible: true,
        locked: false,
        style: { color: nextColor(s.expressions), lineWidth: 2.5, dashed: false },
        error: null,
        index: s.expressions.length,
      };
      return { expressions: [...s.expressions, expr] };
    });
    return id;
  },

  updateInput: (id, input) => {
    set((s) => ({
      expressions: s.expressions.map((e) => (e.id === id ? { ...e, input } : e)),
    }));
  },

  removeExpression: (id) => {
    get().pushHistory();
    set((s) => ({
      expressions: s.expressions
        .filter((e) => e.id !== id)
        .map((e, i) => ({ ...e, index: i })),
    }));
  },

  duplicateExpression: (id) => {
    get().pushHistory();
    set((s) => {
      const src = s.expressions.find((e) => e.id === id);
      if (!src) return s;
      const copy: Expression = { ...src, id: genId(), index: s.expressions.length };
      return { expressions: [...s.expressions, copy] };
    });
  },

  toggleVisibility: (id) => {
    set((s) => ({
      expressions: s.expressions.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)),
    }));
  },

  toggleLock: (id) => {
    set((s) => ({
      expressions: s.expressions.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e)),
    }));
  },

  setColor: (id, color) => {
    set((s) => ({
      expressions: s.expressions.map((e) => (e.id === id ? { ...e, style: { ...e.style, color } } : e)),
    }));
  },

  reorder: (fromIndex, toIndex) => {
    get().pushHistory();
    set((s) => {
      const list = [...s.expressions];
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return s;
      list.splice(toIndex, 0, moved);
      return { expressions: list.map((e, i) => ({ ...e, index: i })) };
    });
  },

  clearAll: () => {
    get().pushHistory();
    set({ expressions: [blankExpression(0)] });
  },

  ensureSlider: (id, initialValue) => {
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id && !e.slider
          ? {
              ...e,
              slider: {
                min: Math.min(-10, initialValue - 10),
                max: Math.max(10, initialValue + 10),
                step: 0.1,
                value: initialValue,
                playing: false,
                playbackSpeed: 1,
              },
            }
          : e
      ),
    }));
  },

  setSliderValue: (id, value) => {
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id && e.slider ? { ...e, slider: { ...e.slider, value } } : e
      ),
    }));
  },

  setSliderRange: (id, min, max, step) => {
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id && e.slider
          ? { ...e, slider: { ...e.slider, min, max, step, value: clamp(e.slider.value, min, max) } }
          : e
      ),
    }));
  },

  toggleSliderPlay: (id) => {
    set((s) => ({
      expressions: s.expressions.map((e) =>
        e.id === id && e.slider ? { ...e, slider: { ...e.slider, playing: !e.slider.playing } } : e
      ),
    }));
  },

  tickSliders: (dtSeconds) => {
    set((s) => ({
      expressions: s.expressions.map((e) => {
        if (!e.slider || !e.slider.playing) return e;
        const { min, max, value, playbackSpeed } = e.slider;
        let next = value + playbackSpeed * dtSeconds;
        const span = max - min;
        if (span > 0) {
          // bounce at the edges rather than snapping back to min
          const offset = (next - min) % (span * 2);
          const wrapped = offset < 0 ? offset + span * 2 : offset;
          next = wrapped <= span ? min + wrapped : max - (wrapped - span);
        }
        return { ...e, slider: { ...e.slider, value: next } };
      }),
    }));
  },

  pan: (dxPixels, dyPixels) => {
    set((s) => ({
      viewport: {
        ...s.viewport,
        centerX: s.viewport.centerX - dxPixels * s.viewport.scale,
        centerY: s.viewport.centerY + dyPixels * s.viewport.scale,
      },
    }));
  },

  zoomAt: (pixelX, pixelY, factor, viewportW, viewportH) => {
    set((s) => {
      const { centerX, centerY, scale } = s.viewport;
      // world point currently under the cursor
      const worldX = centerX + (pixelX - viewportW / 2) * scale;
      const worldY = centerY - (pixelY - viewportH / 2) * scale;
      const newScale = clamp(scale * factor, 1e-6, 1e4);
      // keep that same world point under the cursor after zooming
      const newCenterX = worldX - (pixelX - viewportW / 2) * newScale;
      const newCenterY = worldY + (pixelY - viewportH / 2) * newScale;
      return { viewport: { centerX: newCenterX, centerY: newCenterY, scale: newScale } };
    });
  },

  resetView: () => {
    set({ viewport: { ...DEFAULT_VIEWPORT } });
  },

  toggleGrid: () => set((s) => ({ settings: { ...s.settings, showGrid: !s.settings.showGrid } })),
  toggleAxes: () => set((s) => ({ settings: { ...s.settings, showAxes: !s.settings.showAxes } })),
  setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),

  undo: () => {
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        expressions: prev.expressions,
        past: s.past.slice(0, -1),
        future: [...s.future, { expressions: s.expressions }],
      };
    });
  },

  redo: () => {
    set((s) => {
      const nxt = s.future[s.future.length - 1];
      if (!nxt) return s;
      return {
        expressions: nxt.expressions,
        future: s.future.slice(0, -1),
        past: [...s.past, { expressions: s.expressions }],
      };
    });
  },
}));
