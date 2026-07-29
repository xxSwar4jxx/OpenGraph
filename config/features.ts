/**
 * Feature toggles. Read these from components instead of hardcoding
 * behavior, so features can be enabled per-deployment (e.g. a "lite"
 * build with the basic calculator disabled).
 *
 * NOTE: several of these correspond to features not yet implemented in
 * this iteration (see README roadmap) — the flags are wired up ahead of
 * time so the corresponding UI can read them as soon as it lands.
 */
export const features = {
  graphing: {
    functions: true,
    parametric: true,
    polar: true,
    implicit: true,
    inequalities: true,
    sliders: true,
    points: true,
    matrices: false, // roadmap
    threeD: false, // roadmap (bonus feature)
  },
  ui: {
    scientificKeyboard: true,
    basicCalculatorOverlay: true,
    commandPalette: false, // roadmap
    presentationMode: false, // roadmap
    traceMode: false, // roadmap
    tableOfValues: false, // roadmap
  },
  sharing: {
    urlShareLinks: false, // roadmap
    exportPng: true,
    exportSvg: false, // roadmap
    exportPdf: false, // roadmap
  },
  pwa: {
    enabled: false, // roadmap
  },
  analytics: {
    provider: "none" as "none" | "plausible" | "umami" | "google-analytics",
  },
} as const;
