"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";

interface ThemeContextValue {
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({ resolvedTheme: "light" });

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "graphing-calculator:theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settingsTheme = useGraphStore((s) => s.settings.theme);
  const setTheme = useGraphStore((s) => s.setTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // hydrate persisted preference once on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to default
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(mq.matches);
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, settingsTheme);
    } catch {
      // ignore persistence failures
    }
  }, [settingsTheme, hydrated]);

  const resolvedTheme: "light" | "dark" =
    settingsTheme === "system" ? (systemPrefersDark ? "dark" : "light") : settingsTheme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const value = useMemo(() => ({ resolvedTheme }), [resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
