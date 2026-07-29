# Plotly Calculator

An open-source graphing calculator — functions, parametric curves, polar
equations, implicit curves, inequalities, sliders, a floating scientific
keyboard, and a separate basic/scientific calculator overlay, built on
Next.js 14 (App Router) + TypeScript + Tailwind + Zustand.

This is a real, multi-file codebase meant to be developed iteratively, not
a single-file demo. Everything below reflects what's actually implemented
as of this iteration, and what's explicitly deferred.

---

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Requires Node 18.18+.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

The project was typechecked (`tsc --noEmit`) and linted (`next lint`)
clean, and the math engine was smoke-tested against ~18 known-answer
expressions (derivatives, integrals, sums, implicit circles, polar roses,
etc.) during development — see "Math engine correctness" below for what
that covered.

> **Note on `next build` in sandboxed/offline environments:** the build
> step fetches `Inter` and `JetBrains Mono` from Google Fonts at build
> time via `next/font/google`. If you're building somewhere without
> outbound access to `fonts.googleapis.com`, that step will fail — this
> is a network reachability issue, not a code bug. `npm run dev` and
> `tsc --noEmit` don't require it.

---

## Project structure

```
app/                     Next.js App Router — layout, page, global CSS
components/
  graph/                 GraphCanvas (the renderer) + GraphControls (toolbar)
  expressions/           Expression list/row/color-picker/slider UI
  keyboard/              Floating scientific keyboard widget
  calculator/            Floating basic/scientific calculator overlay
  theme/                 Light/dark/system theme provider
  ui/                    Button, IconButton primitives
lib/
  math/                  Tokenizer → Parser → AST → Compiler → Classifier
  graph/                 Coordinate transforms, marching squares, plot orchestration
  calculator/            Calculator-specific evaluation + keypad layout
  keyboard/              Scientific keyboard layout data
  inputRegistry.ts       DOM registry so the keyboard can type into the focused expression
  utils.ts               cn(), id generation, color palette
store/
  useGraphStore.ts       Expressions, viewport, settings, undo/redo (Zustand)
  useCalculatorStore.ts  Calculator display/history/memory (Zustand)
types/                   Shared domain types (Expression, Node/AST, Viewport, ...)
config/                  branding.ts, socials.ts, features.ts, navigation.ts
```

---

## The math engine (`lib/math/`)

This is a real hand-written expression language, not a wrapper around an
existing CAS library:

- **`tokenizer.ts`** — turns `"2sin(x)^2 + 1/2"` into tokens.
- **`parser.ts`** — recursive-descent parser → AST (`types/index.ts`'s
  `Node` union). Handles implicit multiplication (`2x`, `(x+1)(x-1)`,
  `xy` → `x*y`), unary minus, right-associative `^`, `|x|` for absolute
  value, and postfix `!` for factorial.
- **`compile.ts`** — compiles the AST to a native JS function via
  `new Function(...)` rather than tree-walking it on every sample. A
  graph samples an expression 1,500+ times per frame, so this matters.
  Also special-cases `sum`, `prod`, `derivative`, `integral`, and `lim`
  as real generated loops/central-difference/Simpson's-rule code, not
  symbolic math — see below.
- **`classify.ts`** — looks at an expression's shape (`y = ...`,
  `f(x) = ...`, `r = ...`, `(a, b)`, `a = 3`, etc.) and decides whether
  it's a function, parametric curve, polar curve, implicit curve,
  inequality, slider, or point.
- **`runtime.ts`** — the function table (`sin`, `sqrt`, `log`, ...)
  available inside compiled expressions.

### Supported syntax today

| Category | Examples |
|---|---|
| Functions | `y = x^2`, `f(x) = sin(x)/x`, bare `x^2` (implicitly `y=`) |
| Parametric | `(cos(t), sin(t))` |
| Polar | `r = 1 + cos(theta)` |
| Implicit | `x^2 + y^2 = 4` |
| Inequalities | `y > x^2`, `x^2 + y^2 <= 9` |
| Sliders | `a = 3` (auto-attaches a draggable/animatable slider) |
| Points | `(3, 4)` |
| Trig / inverse / hyperbolic | `sin`, `asin`, `sinh`, `asinh`, ... |
| Logs / exponentials | `ln(x)`, `log(x)` (log₁₀), `log2`, `log10`, `exp(x)` |
| Roots / powers | `sqrt(x)`, `cbrt(x)`, `root(n, x)`, `x^n` |
| Absolute value | `|x - 3|` |
| Factorial | `5!` |
| Summation / product | `sum(n^2, n, 1, 10)`, `prod(n, n, 1, 5)` |
| Derivative | `derivative(x^3)` — numerical, central difference |
| Integral | `integral(x^2, 0, 1)` — numerical, Simpson's rule (200 subintervals) |
| Limit | `lim(sin(x)/x, x, 0)` — two-sided numerical approximation |
| Constants | `pi`, `e`, `tau`, Greek letter names (`theta`, `alpha`, ...) |
| Comparisons | `<`, `<=`, `>`, `>=`, `=`, `!=` |

**Known limitations, by design (not bugs):**
- `sum`/`prod`/`derivative`/`integral`/`lim` are numerical, not symbolic —
  fine for graphing and evaluation, not for showing algebraic steps.
- Functions can't yet reference other named functions (`g(x) = f(x) + 1`
  raises a clear "not supported yet" error rather than silently breaking).
- `lim` doesn't detect true divergence — it evaluates just off the target
  point on both sides and averages, which handles removable
  discontinuities but will return a finite-looking (wrong) number for a
  genuine asymptote. Flagging this rather than hiding it.

### Implicit curves & inequalities (`lib/graph/implicit.ts`)

Implicit equations are traced with **marching squares** over a 6px grid
in pixel space (not world space, so resolution stays constant across
zoom levels). Inequalities are rasterized by testing the center of each
5px cell. Both are real algorithms, not approximations dressed up —
though the marching-squares ambiguous-saddle cases (4-2 and 6-9 in the
standard case table) are resolved with a simple average-of-corners
heuristic rather than full disambiguation, which can very occasionally
misconnect a saddle point at low resolution.

### Math engine correctness

During development this was smoke-tested against known answers,
including: `y=x²` at a point, implicit multiplication (`2x`, `xy`),
Pythagorean identity, slider parsing, named functions, parametric/polar/
point classification, implicit circle membership, inequality direction,
`sum(n², n, 1, 5) = 55`, `d/dx(x²)` at a point, `∫x²dx` from 0 to 1,
`5! = 120`, `root(3, 27) = 3`, and `|x-3|`. All 18 cases passed after
fixing one real bug found in the process (see below) — this isn't a
promise of full correctness, just a note that it's been checked past
"looks right."

**Bug fixed while testing:** the parser initially treated a *closing*
`|` in `|x - 3|` as the start of a new implicit-multiplication atom
(since `|` also opens an abs-value), causing a false "expression ends
unexpectedly" error. Fixed by excluding `pipe` tokens from the
implicit-multiplication trigger set — multiplying directly into/out of
an abs-value now needs an explicit `*` (e.g. `3*|x|`, not `3|x|`).

---

## Graph rendering (`components/graph/GraphCanvas.tsx`)

Plain `<canvas>` + 2D context, not a charting library — driven by
`requestAnimationFrame`. Per frame: draw grid → axes → each visible
expression's drawable (polyline / contour segments / filled cells /
point), in list order so later rows draw on top.

- **Pan** — pointer drag, updates `viewport.centerX/Y` in world units.
- **Zoom** — mouse wheel and touch pinch, both zoom "at a point" (the
  world coordinate under the cursor/pinch-midpoint stays fixed).
- **Sliders** — advance every frame via `tickSliders(dt)` when playing,
  bouncing at range edges rather than snapping back to the start.
- **HiDPI** — canvas backing store is scaled by `devicePixelRatio`
  (capped at 2x to keep large diagrams from spiking sample cost).

---

## State (Zustand)

- **`useGraphStore`** — the expression list (CRUD, reorder, visibility,
  lock, color, slider config), viewport, grid/axis/theme settings, and a
  capped (50-entry) undo/redo history stack.
- **`useCalculatorStore`** — fully independent: display string, answer
  history (last 100), memory register. Deliberately not shared with the
  graph store since the calculator is a standalone tool that happens to
  live in the same app shell.

---

## Feature status

Tracked explicitly in `config/features.ts` so the UI can read flags
instead of features being silently half-wired. Legend: ✅ implemented
this iteration, ⏳ planned, not yet built.

**Graphing** — ✅ functions, parametric, polar, implicit, inequalities,
sliders, points · ⏳ matrices, complex number arithmetic, vectors, domain
restrictions (`{0 <= x <= 5}` clipping), piecewise functions (`{x<0: -x, x>=0: x}`
syntax), 3D graphing

**Input** — ✅ plain-text math input with live classification/errors,
floating draggable/collapsible scientific keyboard (numbers, functions,
calculus, comparisons/Greek letters tabs) · ⏳ LaTeX input & rendering
(KaTeX), live syntax highlighting in the input itself

**Calculator overlay** — ✅ floating button, basic + scientific modes,
history (click to reuse), memory (M+/M−/MR/MC), Ans, copy/paste,
Enter/Escape shortcuts, minimize · ⏳ persistent keyboard shortcuts when
unfocused

**Graph tools** — ✅ pan, wheel zoom, pinch zoom, grid/axis toggles,
light/dark/system theme (persisted), reset view, PNG export · ⏳ SVG/PDF
export, trace mode, table of values, function statistics (roots/extrema/
intercepts), derivative-graph overlay, integral-area shading, screenshot/
presentation mode

**App-level** — ✅ undo/redo, drag-to-reorder expressions, duplicate/
lock/hide per expression, responsive layout down to mobile, `/config`
folder for branding/features/nav/socials · ⏳ autosave/session restore,
command palette (⌘K), URL share links, JSON project import/export, CSV
table export, PWA (manifest/offline/installable), SEO metadata/sitemap/
JSON-LD, deployment configs, function references (`g(x)` calling `f(x)`)

---

## Design notes

Palette is a deliberate departure from generic "AI app" defaults: a cool
"instrument paper" light mode (`#FAFAF9`-ish) and deep graphite-blue dark
mode (`#0E1116`-ish), with a single "plot-ink" indigo accent
(`hsl(228 89% 58%)`). The UI itself stays neutral on purpose — the
expression color chips are the only saturated color source, so a graph
with six curves in six colors is always the most vivid thing on screen,
not the chrome around it. Math input uses JetBrains Mono; UI text uses
Inter.

---

## Continuing this project

The next iteration (in priority order, matching the roadmap above):
1. LaTeX input + KaTeX rendering alongside the plain-text input
2. Piecewise functions and domain restrictions
3. Command palette (⌘K), autosave/session restore, URL share links
4. Table of values, trace mode, function statistics
5. PWA manifest + offline support
6. SEO metadata files (sitemap, robots.txt, JSON-LD, OpenGraph)
7. 3D graphing / regression / statistics (bonus tier from the original spec)

Each of these is scoped to land as its own set of files under the
existing structure — nothing above requires restructuring what's here.
