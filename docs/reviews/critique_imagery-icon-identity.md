Orientation complete. Returning the critique now — dense markdown, no files. (Baking in the load-bearing fix the advisor flagged: `var()` does not resolve in SVG *presentation attributes*, so every sample uses `fill="currentColor"` + a `color:` container, with soft/accent tones routed through inline `style=""`.)

---

# Imagery, Iconography & Brand Identity — Emdad Oxygen

## 1. Verdict

A commerce app that never shows its product cannot feel premium — and right now every product surface (home featured, catalog, detail hero, cart, wishlist, upload tiles) is the **same empty frosted-gradient box**, drawn with *three different formulas* that don't even agree with each other. The "brand" is the text string **"O₂"** rendered two inconsistent ways, there is no product imagery, no trust signal on a *medical-oxygen* shop, and no PWA app icon. The single highest-leverage move is to build **one duotone inline-SVG system** — product illustrations keyed by product id, plus a real O₂ logomark and a medical-trust layer — all token-colored, offline, and dropped into the glass panels you already have. That one asset set is the difference between "a template with grey boxes" and "a shop."

## 2. The problems, with evidence (my lens)

**a) Product imagery is a placeholder, and an *incoherent* one.** The gradient panel appears on home featured (`markup:90`), catalog (`:133`), detail hero (`:178`, plus a literal `تصویر محصول` mono label), cart (`:268`), wishlist (`:819`), and the two upload tiles (`:400`, `:483`) — all using `radial-gradient(circle at 30% 22%,var(--sur2),transparent 62%),linear-gradient(140deg,var(--sur),var(--bg))`. But the detail-page **related-products thumb at `markup:226` still uses the OLD crosshatch** `repeating-linear-gradient(45deg,var(--sur2) 0 7px,transparent 7px 14px)` — a *different* placeholder than every other surface. The brief says crosshatch was "replaced"; it wasn't, everywhere. That's proof of incoherence, not just an assertion.

**b) No real logo — a text "O₂" in two treatments.** Home header (`:37`): 42px, `border-radius:14px`, `linear-gradient(140deg,#0b8a78,#16c9a6)`, weight 800. Auth (`:323`): 64px, `border-radius:20px`, **flat `var(--p)`**, weight 800. Different radius scale, different fill, no symbol, no metaphor. Nothing a user could recognize at 1cm on a home screen.

**c) Icon set is *nearly* cohesive but drifts, and one hero glyph is the wrong object.** Stroke widths in use: **1.8** (cart-empty `:257`), **1.9** (bottom nav `:916`), **2** (most), **2.2** (add-to-cart plus `:149`, addr-add `:757`), **2.4** (success check `:529`). More importantly, the app's flagship service — "درخواست شارژ کپسول" — uses `M9 3h6M12 3v4M8 7h8v13a1 1 0 0 1-1 1…` (`:69`, `:363`), which is a **flat-topped beaker/bottle, not a gas cylinder**. Your single most-promoted action is illustrated with the wrong object.

**d) Zero visual trust cues on a medical-oxygen shop.** The product data is *full* of trust material — `تست هیدرواستاتیک معتبر`, `غلظت اکسیژن تا ۹۳٪`, `گارانتی ۱۸ ماه`, `اتصال استاندارد CGA-540` (`script:32–54`) — but **none of it is ever shown as a badge**. For oxygen (a safety product) this is the biggest premium miss after the empty images.

**e) Empty states + category/gas chips are un-branded.** Empty states (`:157`, `:256`, `:624`) are generic circled line-icons. Category chips (`:124`) and gas chips (`:416`) are **text-only** — no iconography, no color coding — so an RTL medical catalog is scanned by reading, not recognizing.

**f) No PWA identity.** `theme-color` is set (`markup:13`) but there's no maskable app icon / splash mark — brand identity literally stops at the browser chrome.

---

## 3. Recommendations — three systematic moves

### The mechanic all of this depends on (do this or the SVGs render black)

`var()` **does not resolve inside SVG presentation attributes** (`fill="var(--p)"` → renders default/black in every browser). So every illustration uses exactly this duotone contract:

- **Line layer** → `fill="currentColor"` / `stroke="currentColor"`, and set `color:var(--p)` on the `<svg>` (or the card). `currentColor` *does* resolve, and it lets a card recolor the whole glyph by changing one property.
- **Soft-fill tone** → routed through style: `style="fill:var(--p-soft)"` (never the attribute).
- **Accent detail** → `style="stroke:var(--acc)"`. On **dark** frosted glass, `--p` (#0e9a8b) is the weakest pairing against `--sur2`; the bright-aqua `--acc` accent is what carries the read in dark, so every glyph must have at least one accent stroke.

---

### MOVE 1 — One duotone illustration + icon system (the core)

**Grid & floor.** Draw everything on a **`viewBox="0 0 96 96"`**, 8px grid, **stroke-width 4** (line) / **3.5** (accent), round joins. Because stroke scales with the viewBox, a 96-grid drawing renders crisp at the **48px legibility floor** (the related-thumb `:226`) and the 56px cart thumb — but *spec for that floor*: chunky primary silhouette, **no detail smaller than ~8 grid units** (a valve knob = a bar, not a wheel).

**Product art, keyed by id.** Add one map and mount it wherever a product renders:

```js
PRODUCT_ART = { oxy40:'cyl-tall', oxy10:'cyl-mid', oxy5:'cyl-portable',
                co2:'cyl-industrial', conc:'concentrator', nebu:'nebulizer',
                mano:'manometer', mask:'mask' };
```

Four archetypes carry all eight (10L = tall minus height; 5L = portable + strap; CO₂ = industrial recolor). Concrete, copy-ready:

**Cylinder (oxy40 / oxy10 / oxy5 / co2):**
```html
<svg viewBox="0 0 96 96" fill="none" style="color:var(--p)" aria-hidden="true">
  <path style="fill:var(--p-soft)" d="M33 40c0-8.3 6.7-15 15-15s15 6.7 15 15v29a9 9 0 0 1-9 9H42a9 9 0 0 1-9-9z"/>
  <path stroke="currentColor" stroke-width="4" stroke-linejoin="round"
        d="M33 40c0-8.3 6.7-15 15-15s15 6.7 15 15v29a9 9 0 0 1-9 9H42a9 9 0 0 1-9-9z"/>
  <path stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M42 25v-6h12v6"/>  <!-- valve neck -->
  <path stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M39 19h18"/>       <!-- handwheel bar -->
  <circle cx="48" cy="55" r="9" style="stroke:var(--acc)" stroke-width="3.5"/>               <!-- "O" ring, carries dark read -->
</svg>
```
Deltas: **oxy10** raise body top to y≈32 (shorter). **oxy5 (portable)** shorter body + carry strap `<path style="stroke:var(--acc)" stroke-width="3.5" stroke-linecap="round" d="M38 26q10-11 20 0"/>`. **co2 (industrial)** identical silhouette, swap the accent ring for the **CO₂ gas color** (see chip map below) and replace the O-ring with a hazard chevron — same shape family, *reads as "not medical."*

**Manometer (mano):**
```html
<svg viewBox="0 0 96 96" fill="none" style="color:var(--p)" aria-hidden="true">
  <circle cx="48" cy="42" r="20" style="fill:var(--p-soft)"/>
  <circle cx="48" cy="42" r="20" stroke="currentColor" stroke-width="4"/>
  <path style="stroke:var(--acc)" stroke-width="4" stroke-linecap="round" d="M48 42 56 30"/> <!-- needle -->
  <circle cx="48" cy="42" r="3" fill="currentColor"/>
  <path stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M48 62v9M41 71h14"/> <!-- stem + foot -->
</svg>
```

**Mask (mask):**
```html
<svg viewBox="0 0 96 96" fill="none" style="color:var(--p)" aria-hidden="true">
  <path style="fill:var(--p-soft)" d="M34 30h28a6 6 0 0 1 6 6v13c0 12-9 21-20 21S28 61 28 49V36a6 6 0 0 1 6-6z"/>
  <path stroke="currentColor" stroke-width="4" stroke-linejoin="round"
        d="M34 30h28a6 6 0 0 1 6 6v13c0 12-9 21-20 21S28 61 28 49V36a6 6 0 0 1 6-6z"/>
  <path stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M24 40h-5M77 40h-5"/>   <!-- strap tabs -->
  <path style="stroke:var(--acc)" stroke-width="3.5" stroke-linecap="round" d="M48 70v6a8 8 0 0 0 8 8h9"/> <!-- O2 tube -->
</svg>
```

**Concentrator (conc) / Nebulizer (nebu):** rounded appliance `rect x=26 y=24 w=44 h=52 rx=10` with `style="fill:var(--p-soft)"` + `currentColor` outline; conc adds an output dial (`circle r=8`) + two accent vents; nebu adds three accent "mist" dots rising from a mask stub. (Same 4/3.5 stroke spec.)

**Wiring — reuse the glass stage, don't remove it.** Keep the frosted panel (`background:var(--sur2)` still fires the frost hook `style_3:46`) as the *stage*; center the art at ~64%:
```html
<div style="flex:none;width:72px;height:72px;border-radius:14px;border:1px solid var(--line);
            background:var(--sur2);display:grid;place-items:center">
  {{ item.art }}   <!-- svg at ~46px -->
</div>
```
Detail hero (`:178`): same stage at 220px, art ~150px, **delete the `تصویر محصول` mono label**. **Fix `:226`** — swap the crosshatch for this same `--sur2` stage so the app finally has one placeholder language.

**Icon normalization (governed by the same grid).** Pick **one** UI stroke: **1.9** for the 16–24px inline set (matches the nav already; slightly lighter reads more Linear/premium), reserve **2.2** for large hero glyphs (success check, empty-state). Replace the beaker "cylinder" at `:69`/`:363` with a true rounded-shoulder cylinder (24-grid reduction of the illustration): `M10 3.5h4M12 3.5V6M9 9c0-1.7 1.3-3 3-3s3 1.3 3 3v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z`. Reskin the three empty states (`:157/:256/:624`) with the *same illustration language* (e.g. wishlist-empty = the mask glyph with a dashed accent heart) instead of generic circled line-icons.

### MOVE 2 — A real identity mark (one component, two sizes, + PWA icon)

Design an actual **O₂ molecule mark**: two bonded rings = dioxygen (also reads as "link / reliable"). White foreground on the gradient token, so no theming needed here:
```html
<span style="width:42px;height:42px;border-radius:14px;background:linear-gradient(140deg,var(--p),var(--acc));
             display:grid;place-items:center;box-shadow:0 8px 18px -6px var(--glow)">
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="#fff" stroke-width="2.6">
    <circle cx="12.5" cy="14" r="6.5"/><circle cx="20.5" cy="18.5" r="6.5"/>
  </svg>
</span>
```
Ship it as **one logo component at two sizes** — header 42/`radius:14`, auth 64/`radius:20` — both on the **same `--p→--acc` gradient** (fixes the flat-`var(--p)` auth mismatch at `:323`) with radius scaling proportionally (14→20 already ≈ correct ratio). Same mark, on an 80%-safe-zone gradient square, becomes the **maskable PWA/app icon and splash** — closing the identity gap that today stops at `theme-color`.

### MOVE 3 — The medical-trust layer + chip coding

**Assurance strip** — one reusable scrollable pill row built from the data already in `PRODUCTS`. Place it under the price on detail (after `:202`) and as a home band that *fills the dead space below the fold*:
```html
<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:12px">
  <span style="display:inline-flex;align-items:center;gap:6px;flex:none;background:var(--ok-soft);
               color:var(--ok);font-size:11px;font-weight:700;padding:6px 12px;border-radius:999px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="color:var(--ok)">
      <path stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
            d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6z"/>
      <path stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/>
    </svg>
    تست هیدرواستاتیک معتبر
  </span>
  <!-- + خلوص اکسیژن ۹۹٫۵٪ (droplet-%)  · ارسال شبانه‌روزی (clock-24)  · ۱۸ ماه گارانتی (shield) -->
</div>
```
Icons needed (same 24-grid, 1.9 stroke): **shield-check** (above), **purity droplet** with a small `٪`, **clock-24**, **warranty-shield**. This turns latent spec text into the safety cue an oxygen buyer needs.

**Gas color-coding system** — give each gas a fixed hue and prefix every gas chip (`:416`) with an 8px dot; reuse the *same* hue as the CO₂ cylinder's accent so the system is consistent across surfaces:

| Gas | Token / hue |
|---|---|
| اکسیژن طبی | `--acc` (teal) |
| اکسیژن صنعتی | `--p` |
| دی‌اکسید کربن (CO₂) | slate `#64748b` |
| آرگون | violet `#8b5cf6` |
| ازت (N₂) | blue `#5aa0ff` |

Prefix category chips (`:124`) with their 16px archetype glyph (cyl→cylinder, dev→concentrator, acc→manometer). A text list becomes a recognizable, scannable RTL catalog.

---

## 4. The one highest-leverage change

**Ship the duotone inline-SVG product-illustration system (Move 1) — the `PRODUCT_ART` map mounted in your existing `--sur2` glass stages.** It is the exact gap the lens names as the biggest premium miss, it's fully offline/CSP-safe (inline SVG, token-colored, no external assets), it reuses the frosted panels you already have, and **one asset set of four archetypes simultaneously upgrades every high-traffic surface** — home featured, catalog, detail hero, cart, and wishlist. The logomark (Move 2) and trust layer (Move 3) are the supporting cast; the product art is what converts the app from "grey boxes" to "a real oxygen shop."

Files read: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_current.html`, `style_3.work.css`, `script_2.work.js`, `brief_design-system-mapper.md`.