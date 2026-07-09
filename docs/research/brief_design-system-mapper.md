I have read all four files completely. Here is the briefing.

---

# DESIGN SYSTEM / CSS BRIEFING — "Emdad Oxygen Shop"

## 0. File roles (critical framing)

| File | Size | Content | Relevance |
|---|---|---|---|
| `style_0.css` | 1.6KB | 9 `@font-face` for **Vazirmatn** (weights 100–900), bundled woff2 | The UI/body font |
| `style_1.css` | 8KB | 16 `@font-face` for **'Baloo Bhaijaan 2'** (weights 500/600/700/800 × 4 subsets), Google woff2 | The heading/logo/display font |
| `style_2.css` | 14KB | **Leaflet 1.9.4** stock stylesheet (map). No app tokens. | Map screen only |
| `style_3.css` | 4KB | **The entire app design system** — all tokens, theming, aurora, glass, base typography, animations | THE meat |

**Most important structural fact:** these four files contain **no component classes** (no `.card`, `.chip`, `.btn`, `.bottom-nav`, `.sheet`, `.switch`). All component styling is done via **inline `style=""` attributes in the template HTML**, referencing the CSS custom properties defined in `style_3.css`. `style_3.css` only provides (a) the token vocabulary, (b) two *inline-style-hook* selectors that "upgrade" any element whose inline style matches a pattern, (c) base element rules, and (d) keyframes. To fully map components you must read the template HTML; this CSS defines the *language* those inline styles speak.

---

## 1. Design tokens — LIGHT vs DARK

All tokens live on `body` (light, the default/fallback) and are overridden on `body[data-theme="dark"]`. There is **no `data-theme="light"` selector** — light is the bare `body{}` block.

### Core palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#e6f7f2` (mint) | `#06171b` (near-black teal) | Base background start |
| `--bg2` | `#dbeeff` (pale blue) | `#071f2b` (deep blue-teal) | Base background end (gradient stop) |
| `--sur` | `rgba(255,255,255,.62)` | `rgba(20,52,56,.5)` | Primary glass surface (cards, sheets) |
| `--sur2` | `rgba(255,255,255,.42)` | `rgba(30,66,70,.44)` | Secondary/lighter glass surface |
| `--tx` | `#08302b` (dark teal) | `#eafcf7` (near-white) | Primary text |
| `--tx2` | `#48706a` (muted teal) | `#9fc0ba` (muted gray-teal) | Secondary/muted text, placeholders |
| `--line` | `rgba(255,255,255,.85)` | `rgba(255,255,255,.13)` | Borders/dividers (note: **light border is near-opaque white**, dark is faint white) |

### Brand / primary / accent

| Token | Light | Dark | Role |
|---|---|---|---|
| `--p` | `#0b8a78` (teal-green) | `#0e9a8b` | Primary brand color |
| `--p-deep` | `#086b5d` | `#0c7f92` | Darker primary (gradients, pressed) |
| `--onp` | `#ffffff` | `#04201c` (dark) | Text/icon color *on* primary fill |
| `--p-soft` | `color-mix(in oklab, var(--p) 12%, #ffffff)` | `color-mix(in oklab, var(--p) 22%, #08262a)` | Soft primary tint (chip/badge bg) |
| `--acc` | `#12b39a` (bright teal) | `#4df0d0` (bright aqua) | Accent / highlight |
| `--acc-soft` | `color-mix(in oklab, var(--acc) 16%, #ffffff)` | `color-mix(in oklab, var(--acc) 20%, #0a2a2c)` | Soft accent tint |
| `--acc-ink` | `color-mix(in oklab, var(--acc) 66%, var(--tx))` | `color-mix(in oklab, var(--acc) 74%, #eafcf7)` | Readable accent text color |
| `--glow` | `rgba(18,179,154,.45)` | `rgba(77,240,208,.5)` | Primary-button glow shadow color |

Note: `--acc-soft`, `--acc-ink`, `--p-soft` are **computed via `color-mix(in oklab,...)`** — modern-browser-only (Safari 16.2+/Chrome 111+). If an older engine renders this, those tokens fall back to invalid/initial and could break tinted chips/badges.

### Semantic status colors

| Token | Light | Dark |
|---|---|---|
| `--ok` | `#0f9d68` | `#34d39a` |
| `--ok-soft` | `#dbf4e9` | `#103029` |
| `--err` | `#e04a56` | `#f0687a` |
| `--err-soft` | `#fce9ea` | `#3e2028` |
| `--warn` | `#bd7d0d` | `#e3a63a` |
| `--warn-soft` | `#faf0d8` | `#3a2e14` |

### Effect tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--blur` | `16px` | `18px` | Backdrop-filter blur radius for glass |
| `--shadow` | `0 22px 50px -26px rgba(12,90,100,.42), 0 4px 14px -6px rgba(12,90,100,.18)` | `0 26px 60px -26px rgba(0,0,0,.8), 0 4px 16px -6px rgba(0,0,0,.6)` | The single elevation shadow (2-layer) |
| `--aur1` | `radial-gradient(circle, rgba(18,179,154,.55), transparent 62%)` | `radial-gradient(circle, rgba(18,214,176,.5), transparent 60%)` | Aurora blob #1 fill (teal) |
| `--aur2` | `radial-gradient(circle, rgba(90,160,255,.5), transparent 62%)` | `radial-gradient(circle, rgba(59,123,255,.42), transparent 60%)` | Aurora blob #2 fill (blue) |

**There is no `--radius`, `--space`, or font-size token.** Radius/spacing/type-scale are all hard-coded inline per component in the template.

---

## 2. Theming mechanism

- **Switch:** light is the default (`body{}`); dark is applied by setting the attribute **`data-theme="dark"` on `<body>`**. The runtime toggles this attribute; there is no class-based theme, no `prefers-color-scheme` media query driving tokens (dark is manual only).
- **Accent override:** `--acc` is a normal cascading variable, so the app can override it inline on `<body style="--acc:#...">` to re-skin the accent. Because `--acc-soft` and `--acc-ink` are `color-mix` off `var(--acc)`, they follow an override automatically. **Caveat:** `--glow` is a *hard-coded* rgba (not derived from `--acc`), so an `--acc` override will **not** update the primary-button glow — glow stays the theme default.
- **Body background:** defined twice. Inside the light token block (line 23) `background:var(--bg)`, then overridden later by `body{position:relative;background:linear-gradient(160deg,var(--bg),var(--bg2))}` (line 41 wins → the actual background is a 160° gradient from `--bg` to `--bg2`).
- **Map dark mode:** `body[data-theme="dark"] .leaflet-tile{filter:brightness(.7) invert(1) contrast(.92) hue-rotate(180deg) saturate(.75)}` — inverts OSM tiles for dark theme. Leaflet zoom control is re-tokenized: `.leaflet-control-zoom a{color:var(--tx)!important;background:var(--sur)!important;border-color:var(--line)!important}` and `.leaflet-container{font-family:inherit;background:var(--sur2)}`.

### The aurora background (the signature visual)

Two fixed, blurred, animated radial blobs painted behind everything via `body::before` / `body::after`:

- Shared: `content:""; position:fixed; z-index:0; border-radius:999px; pointer-events:none; filter:blur(30px); will-change:transform`.
- `::before` (teal, `--aur1`): `width/height:60vw` capped `max 520px`; `top:-14vh`; **`inset-inline-start:-16vw`**; `opacity:.8`; `animation:auroraA 16s ease-in-out infinite`.
- `::after` (blue, `--aur2`): `width/height:56vw` capped `max 480px`; `bottom:-12vh`; **`inset-inline-end:-14vw`**; `opacity:.7`; `animation:auroraB 20s ease-in-out infinite`.
- Because they're `z-index:0` fixed, real content must sit above (positioned / higher z-index). `inset-inline-start/end` are **RTL-aware logical props**: in the app's `dir=rtl`, `::before` sits top-**right**, `::after` bottom-**left**.

### The glass ("frost") mechanism — inline-style hooks

This is how surfaces become frosted glass **without any component class**:

```css
[style*="background:var(--sur)"],[style*="background: var(--sur)"],
[style*="background:var(--sur2)"],[style*="background: var(--sur2)"]{
  -webkit-backdrop-filter:blur(var(--blur)) saturate(1.3);
  backdrop-filter:blur(var(--blur)) saturate(1.3);
}
```

Any element whose inline `style` string literally contains `background:var(--sur)` / `background:var(--sur2)` (with or without a space after the colon) automatically gets the glass blur. **Implication for reimplementation:** a surface must set its background as an inline `style` using *exactly* that `background:var(--sur…)` token spelling, or it won't frost. `background:var(--sur2)` does **not** substring-match the `--sur` selector (the trailing `2)` breaks it), which is why both are enumerated. Writing `background-color:` instead of `background:` would silently lose the frost.

### Primary-button glow hook

```css
button[style*="var(--p)"]:not([disabled]){box-shadow:0 10px 26px -12px var(--glow)}
```

Any `<button>` whose inline style contains the exact token `var(--p)` (primary) and isn't `disabled` gets the colored glow. `var(--p-deep)` / `var(--p-soft)` do **not** match (trailing chars break the `var(--p)` substring), so only true primary-filled buttons glow, and the glow disappears when `[disabled]`.

---

## 3. Typography

### Fonts

- **Body/UI font: `Vazirmatn`** (bundled, offline). `style_0.css` declares **9 weights: 100,200,300,400,500,600,700,800,900**, all `font-style:normal`, `font-display:swap`, each pointing to its own bundled woff2 resource UUID (9 distinct files). Note: **the base `body` font-family is NOT set in these CSS files** — it is applied by the runtime/template (Vazirmatn is the intended default). `input,textarea,button,select{font-family:inherit}` ensures form controls inherit it.
- **Heading/display/logo font: `'Baloo Bhaijaan 2'`** (Google origin, bundled). `style_1.css` declares weights **500, 600, 700, 800** (no 400/900), each split into **4 unicode subsets**: arabic (`U+0600-06FF…`, the Persian range), vietnamese, latin-ext, latin.
  - **Dedup finding:** across all four weights the subset files reuse the *same* resource IDs — arabic → `9e5423b7-…`, vietnamese → `39312691-…`, latin-ext → `4de9721d-…`, latin → `c4acad6a-…`. So there are only **4 physical Baloo woff2 files** (one per subset) mapped to 4 weight declarations. Practically, Baloo weights 500–800 render from identical files → little/no visible weight variation in Baloo headings; weight differentiation is real only in Vazirmatn.

### Where each font applies

```css
h1,h2{font-family:'Baloo Bhaijaan 2',Vazirmatn,system-ui,sans-serif;
       letter-spacing:-.4px; line-height:1.28}
```

- `h1,h2` → Baloo (with Vazirmatn fallback), tight tracking `-0.4px`, line-height `1.28`. Everything else → Vazirmatn (via body default). The Persian app title/logo (امداد اکسیژن) renders in Baloo's arabic subset.
- **No font-size tokens/scale** in CSS — all sizes are inline in the template.

### RTL specifics

- App root is `dir=rtl` (set in template, not CSS). The CSS's only RTL-aware code is the aurora using **`inset-inline-start` / `inset-inline-end`** (logical positioning).
- `::placeholder{color:var(--tx2);opacity:.8}` — muted placeholder in both themes.
- No `text-align`, `float`, or directional margin logic in CSS (handled inline). No bidi/`unicode-bidi` rules here.

---

## 4. Layout system & recurring component patterns

- **No phone-frame container, no `max-width`, no bottom-nav/sheet/card/chip/button/switch classes exist in these CSS files.** The mobile phone frame, safe-area insets, and every component are styled with inline styles in the template. Expect the template to reference tokens: surfaces = `background:var(--sur)/(--sur2)` (auto-frosted), text = `var(--tx)/(--tx2)`, borders = `var(--line)`, primary CTAs = `background:var(--p)` + `color:var(--onp)` (auto-glow), soft chips/badges = `var(--p-soft)/(--acc-soft)/(--ok-soft)/(--err-soft)/(--warn-soft)`, elevation = `box-shadow:var(--shadow)`.
- **Base resets present:** `html,body{margin:0;padding:0}`, `*{box-sizing:border-box}`. That is the entire layout foundation in CSS.
- **Bottom sheet** animation exists (`sheetIn`, translateY 100%→0), implying sheets slide up from bottom; the sheet's own box (radius, padding, max-height) is inline.
- **Buttons** are the one element with global CSS behavior:
  - `button{transition:transform .16s ease, box-shadow .24s ease, background .2s ease, border-color .2s ease}`
  - `button:active{transform:translateY(1px)}` (1px press-down)
  - plus the conditional glow (§2).
- **Switches/toggles/chips/cards** have no CSS here — fully inline.
- **Safe areas:** no `env(safe-area-inset-*)` usage in any of these files → safe-area handling (if any) is inline in the template.

---

## 5. Animation, transition, shadow, radius inventory

### Keyframes (all in `style_3.css`)

| Name | Definition | Likely use |
|---|---|---|
| `toastIn` | `opacity:0→1`, `translateY(10px)→none` | Toast/snackbar entrance |
| `sheetIn` | `translateY(100%)→none` | Bottom-sheet slide-up |
| `fadeIn` | `opacity:0→1` | Route/content fade |
| `breathe` | `scale(1)/opacity .85 → scale(1.12)/opacity 1 → back` | Pulsing icon/badge/loading dot |
| `floaty` | `translateY(0) → -8px → 0` | Floating hero element (bobbing) |
| `auroraA` | `translate(0,0) scale(1) → translate(7%,5%) scale(1.12)` | Aurora blob #1, `16s` |
| `auroraB` | `translate(0,0) scale(1) → translate(-6%,-5%) scale(1.15)` | Aurora blob #2, `20s` |

Note: `toastIn/sheetIn/fadeIn/breathe/floaty` are declared but not attached to any selector in CSS → they're applied inline in the template (`animation:` on elements).

### Transitions
Only global one: the `button` transition above. Leaflet has its own (irrelevant to app UI).

### Shadows
Two only: the `--shadow` elevation token (2-layer, §1) and the button glow `0 10px 26px -12px var(--glow)`.

### Border-radius scale
**None defined as tokens.** The only radii in CSS are `999px` (aurora blobs) and `border-radius:inherit` (leaflet container, so the map inherits its parent's rounding). All card/chip/button/sheet radii are inline in the template. Leaflet's stock 4/5/12px radii apply to map controls/popups only.

### Reduced motion
```css
@media (prefers-reduced-motion:reduce){body::before,body::after{animation:none}}
```
**Only the aurora is paused.** `breathe`, `floaty`, `toastIn`, `sheetIn`, `fadeIn`, and button transitions are **not** covered — they keep animating under reduced-motion. Flag if accessibility parity matters.

---

## 6. Viewport assumptions / things that break outside a ~390px mobile frame

1. **Aurora is `position:fixed` to the viewport, not to any phone frame.** If the app is a centered phone-width column on desktop, the two blobs anchor to the *browser window* corners (top-inline-start / bottom-inline-end), not to the ~390px frame — so on desktop the decorative glow detaches from the app column. Sized in `vw`/`vh` (`60vw`/`56vw`, `top:-14vh`, `±16vw/14vw`) capped at `520/480px`; on a large screen the blobs are capped in size but flung to far corners.
2. **No responsive breakpoints anywhere** (only `@media print` in Leaflet and `prefers-reduced-motion`). Layout is assumed single-column mobile; there is no CSS fallback for wide screens.
3. **Glass depends on `backdrop-filter`.** On engines without it (older/Firefox-without-flag historically), `--sur`/`--sur2` surfaces fall back to their semi-transparent rgba fills only — legible but flat, and text may sit on a see-through panel over the moving aurora (possible contrast issues).
4. **`color-mix(in oklab,…)` tokens** (`--acc-soft`, `--acc-ink`, `--p-soft`) require a modern engine; older browsers drop those tints.
5. **`.leaflet-tile` uses `mix-blend-mode: plus-lighter`** (from stock Leaflet) — a relatively new blend mode; harmless fallback but worth noting on the map screen.
6. **`--line` in light theme is `rgba(255,255,255,.85)`** — an almost-opaque *white* border. Over the light mint/blue gradient this reads as a bright rim (glass edge highlight), not a conventional gray divider; on a white surface it's nearly invisible. Reimplementations that expect `--line` to be a subtle gray will look wrong.
7. **`will-change:transform`** on both aurora pseudo-elements plus infinite transforms = continuous compositor work; on low-end devices this is the main perf cost, and it only stops under `prefers-reduced-motion`.

---

### Key file paths
- `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.css` — **the design system** (tokens, theming, aurora, glass hooks, base type, keyframes)
- `style_0.css` — Vazirmatn @font-face (weights 100–900, body font)
- `style_1.css` — Baloo Bhaijaan 2 @font-face (weights 500–800, headings/logo; 4 physical subset files)
- `style_2.css` — stock Leaflet 1.9.4 (map screen only)