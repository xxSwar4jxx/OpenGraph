import { create } from "zustand";

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
}

interface CalculatorState {
  isOpen: boolean;
  isMinimized: boolean;
  mode: "basic" | "scientific";
  display: string; // current input, as typed
  ans: number;
  memory: number;
  history: HistoryItem[];

  open: () => void;
  close: () => void;
  toggleMinimized: () => void;
  setMode: (mode: "basic" | "scientific") => void;
  setDisplay: (value: string) => void;
  append: (token: string) => void;
  backspace: () => void;
  clearDisplay: () => void;
  commit: (result: string, numericResult: number) => void;
  memoryAdd: (value: number) => void;
  memorySubtract: (value: number) => void;
  memoryRecall: () => void;
  memoryClear: () => void;
  clearHistory: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  mode: "basic",
  display: "",
  ans: 0,
  memory: 0,
  history: [],

  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set({ isOpen: false }),
  toggleMinimized: () => set((s) => ({ isMinimized: !s.isMinimized })),
  setMode: (mode) => set({ mode }),
  setDisplay: (display) => set({ display }),
  append: (token) => set((s) => ({ display: s.display + token })),
  backspace: () => set((s) => ({ display: s.display.slice(0, -1) })),
  clearDisplay: () => set({ display: "" }),

  commit: (result, numericResult) => {
    const entry: HistoryItem = {
      id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      expression: get().display,
      result,
    };
    set((s) => ({
      history: [entry, ...s.history].slice(0, 100),
      ans: numericResult,
      display: result,
    }));
  },

  memoryAdd: (value) => set((s) => ({ memory: s.memory + value })),
  memorySubtract: (value) => set((s) => ({ memory: s.memory - value })),
  memoryRecall: () => set((s) => ({ display: s.display + String(s.memory) })),
  memoryClear: () => set({ memory: 0 }),
  clearHistory: () => set({ history: [] }),
}));
