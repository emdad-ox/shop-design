# EMDAD OXYGEN — Art Direction: The Cohesion & Premium Plan

Synthesis of the 7-lens panel into one build brief. All edits target the three files in `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/` (`style_3.work.css`, `markup_current.html`, `script_2.work.js`). Where lenses conflicted, I picked one lane — those calls are marked **[RESOLVED]**.

---

## 1. NORTH STAR

**Clinical-calm precision — Apple Health × Stripe, rendered on cool glass.** This is a *medical safety* product, not a candy app: the feeling is quiet trust, machined edges, and one deliberate teal action per screen. Four governing principles, in priority order:

1. **A neutral ground so the brand can be seen.** The canvas, borders, and body text stop being teal; color is *spent*, not *bathed in*. One teal CTA can only feel premium against a near-neutral cool ground.
2. **Everything sits on a scale.** Spacing, radius, type, and elevation are tokens, never magic numbers. The same object renders identically on all 17 routes.
3. **Rank every surface.** Hero > card > well > ground is legible through elevation and material, not just position. One "premium moment" material, used 2–3 times deliberately.
4. **Show the product; earn the trust.** Real oxygen-equipment illustrations and medical-assurance cues replace grey boxes — because a commerce app that never shows its product cannot feel premium.

---

## 2. THE DESIGN SYSTEM (cohesion backbone)

Add to `:root` in `style_3.work.css` beside the shipped `--ease-*/--dur-*` block. The dynamic style strings in `script_2.work.js` (`chipBase` L441, `navBase` L519, switch/knob L591–594, `dotStyle` L462/500) are single-source-of-truth — editing those propagates instantly.

### Spacing — 4px base
```
--sp-1:4  --sp-2:8  --sp-3:12  --sp-4:16  --sp-5:20  --sp-6:24  --sp-7:32  --sp-8:40  --sp-9:48  --sp-10:64
```
Snap map: `6,7,9→8`; `10,13→12`; `14→16`; `18→16 or 20`. The 25× `gap:10` list rhythm → `--sp-3`.

### Radius — 5 tokens, assigned by TIER not instance **[RESOLVED: 12/16/20/24/pill]**
```
--r-sm:12    inputs, thumbnails, chips, inner tiles
--r-md:16    ALL content cards/rows/panels  (unify 14/16/18/20 here)
--r-lg:20    bottom sheets, detail-hero image, big service buttons
--r-xl:24    home hero ONLY (largest corner = highest rank)
--r-pill:999 buttons, chips, badges, avatars, dots, switch
```
Concentric rule as you touch screens: inner ≈ outer − padding (16px card, 16px pad → 12px inner tile).

### Type — Vazirmatn only, integer sizes, real weight ladder
```
--fs-display:26/lh1.35   --fs-title:20/lh1.40   --fs-h:17/lh1.45   --fs-sub:15/lh1.50
--fs-body:14/lh1.75      --fs-sm:13/lh1.70      --fs-caption:12/lh1.55   --fs-label:11/lh1.40
--w-display:800  --w-title:700  --w-strong:600  --w-med:500  --w-body:400
```
Map 18 ad-hoc sizes → these 8; **delete every half-pixel value.** `h1,h2{font-family:Vazirmatn; letter-spacing:normal}` (was Baloo + `-.4px`). Weight remap: `900→800` (display only), `800→700`, card-title/label `700→600`, help `→500`, body `→400`. Delete the inline `line-height:1.5/1.6` patches (markup L60,187) — they compensated for the wrong `1.28` base.

### Control heights — 4 tiers
```
--h-chip:32   --h-sm:36 (small btn)   --h-md:44 (inputs, secondary)   --h-lg:50 (primary CTA)   --h-icon:40
```

### Elevation — neutral-cool ramp via existing inline-style hooks (NO template edits) **[RESOLVED: cool-neutral ink, not teal]**
Because the canvas de-tints (below), shadows go cool-neutral ink, not saturated teal. Reserve the *colored* glow for the hero only.
```
--edge: inset 0 1px 0 rgba(255,255,255,.55)                       top specular glint
--e0:   inset 0 1px 2px rgba(8,30,30,.12)                         recessed well
--e1:   0 1px 2px -1px rgba(8,30,30,.12)                          chip / inline
--e2:   0 1px 2px -1px rgba(8,30,30,.10), 0 8px 20px -10px rgba(8,30,30,.18)   CARD
--e3:   0 2px 6px -2px rgba(8,30,30,.14), 0 20px 44px -18px rgba(8,30,30,.26)  sheet/nav/popover
--e4:   0 24px 54px -22px var(--glow), var(--edge)                hero / primary moment
```
Dark: same shape, `rgba(0,0,0,.5–.72)`. Attach via the existing substring hooks (`[style*="background:var(--sur)"]`→`--e2`+`--edge`; `--sur2`→`--e0`, de-inverting the well; `z-index:40` nav→`--e3` casting *up*; `border-radius:20px 20px 0 0` sheet→`--e3`).

### Color refinements
- **`--p` → `#087a6a`** (light). Fixes the verified AA failure: white-on-`#0b8a78` = 4.27:1 (below 4.5). New value clears ≥4.6:1. **P0 correctness.**
- **De-tint the ground off the brand hue** (sat ~52% → <8%): `--bg #e6f7f2→#eef2f1`, `--bg2 #dbeeff→#e7edec`, `--tx2 #48706a→#3d5c57`, `--sur .62→.72` opacity, `--sur2` faint mint `rgba(214,236,231,.5)`.
- **`--line` [RESOLVED]:** repoint from `rgba(255,255,255,.85)` → **contained ink hairline** `rgba(8,48,43,.10)` light / `rgba(255,255,255,.10)` dark. This fixes 130+ borders in one edit; the white top-glint moves to the `--edge` inset we're already adding. Dashed dividers (markup L212,297,588) → `1px solid var(--line)`, inset to text column.
- **Aurora `--aur2`:** drop the 220°/100% cornflower blob → deep-teal sibling `rgba(16,120,120,.4)`; opacities `.8/.7→.5/.38`, blur `30→44px`, glass hook `saturate(1.3)→1.08`. This is the single biggest "kills gamey" edit.
- **`--ok`** push yellower (~145°, `#1c9e56`) so in-stock green ≠ brand teal at a glance (medical clarity).
- **`--glow: color-mix(in oklab, var(--p) 55%, transparent)`** so it tracks re-skin/theme.
- **Accent law:** `--acc` allowed ONLY as focus ring, active-nav indicator, in-stock dot, selected-chip outline, inline links — always a 2px ring/dot/underline, **never a fill**. Forbidden on card borders, headers, prices, generic icons.

---

## 3. TOP 5 HIGHEST-LEVERAGE MOVES (ranked)

**1 — Install the token backbone; snap cards + screen-frame to it.** *(cohesion substrate)*
**Why:** cards and the screen frame are the repeating substrate under every screen; snapping just those erases the 14/16/18/20 card jitter, 10/12/16/24 spacing jitter, and 16-vs-20 top-padding jitter in one pass — and makes all later work land on a real grid instead of a wobbly one. **Effort: M.** **First step:** add the `:root` scales; give every card `--r-md:16` + one of two paddings (compact row `--sp-3`, standard panel `--sp-4`); lock frame to gutter `--sp-4` / top `--sp-5` / section `--sp-6`.

**2 — Materials & ground: de-tint + hairline + elevation + aurora, all via CSS/hooks.** *(premium surface leap, ~zero template churn)*
**Why:** today 58 cards are coplanar with a glowing white rim over a fully teal-bathed ground — the two facts that most make it read "themed template" not "product." De-tinting the ground, repointing `--line`, and attaching the `--e*` ramp to the existing inline-style hooks flips this across all 17 routes in ~20 lines with **no markup edits.** **Effort: S.** **First step:** repoint `--line` + darken `--p` + add `--e0–e4`; wire the four substring hooks.

**3 — Kill Baloo → Vazirmatn everywhere + type scale + real weight ladder.**
**Why:** the heading ladder is fiction (Baloo 500–800 are byte-identical files; every `900` renders at 800), the wordmark and headings are in *different* families right now, and 18 ad-hoc sizes are pure entropy. One move fixes the fake ladder, the family split, the size chaos, *and* removes the app's only external font dependency (offline PWA). **Effort: S/M.** **First step:** swap `h1,h2` font-family to Vazirmatn + `letter-spacing:normal`; add the 8 size + 5 weight tokens; remap.

**4 — One App Bar for all 17 routes.**
**Why:** there is no app bar — there are three, and titles render in *three sizes across two typefaces*; the back button is nine scroll-away inline copies. A single `grid:40px/1fr/40px; height:56px; background:var(--sur)` bar with a real `<h1>` (17px/700) unifies the top edge of every route, inherits the glass hook for free, and deletes 9 duplicated back buttons. **Effort: M.** **First step:** build the bar component in-flow (unnamed — do **not** give it a `view-transition-name`); map tab / drill-in / detail onto the three slots.

**5 — Product illustration system + logomark + trust strip.** *(the biggest premium perception jump)*
**Why:** a commerce app that never shows its product can't feel premium — every product surface is the same empty gradient box (and the related-thumb still shows the *old* crosshatch). One duotone inline-SVG `PRODUCT_ART` set of 4 archetypes (cylinder/manometer/mask/appliance) covers all 8 products, mounts into the existing `--sur2` glass stages, is fully offline/CSP-safe, and upgrades home/catalog/detail/cart/wishlist at once. **Effort: M/L.** **First step:** build the 4 archetype SVGs on `viewBox 0 0 96 96`, stroke-4, using the `currentColor` + inline-`style` duotone contract (`var()` does NOT resolve in SVG presentation attributes); add the `PRODUCT_ART` id map.

---

## 4. PRIORITIZED BACKLOG (deduped)

### P0 — do first (correctness + cohesion substrate)
- **Tokens/cohesion:** add spacing/radius/type/height `:root` scales; unify all cards → `--r-md:16` + 2 paddings; lock screen frame (gutter/top/section).
- **Color correctness:** darken `--p→#087a6a` (AA fail on primary CTA); repoint `--line` to ink hairline.
- **Materials:** attach `--e0–e4` + `--edge` to the 4 existing inline-style hooks; de-invert `--sur2` wells.
- **Detail:** unify chip/badge to one spec (`--h-chip:32; pad 0 12; radius pill; 12px/600`); **selected chip → `--p-soft`, not `--p`** (kills the CTA depth-gradient + `--glow` bleeding onto 34px filter chips); fix the dead hover rule (space-in-selector bug at CSS L147 + cover `<button>`).
- **Typography:** kill Baloo; Vazirmatn on `h1,h2`; add scale + weight tokens; delete half-pixel sizes and inline line-height patches.

### P1 — the premium leap
- **Color/ground:** de-tint `--bg/--bg2/--tx2/--sur/--sur2`; recolor aurora `--aur2` to teal sibling + drop opacity/`saturate`; `--ok` yellower; `--glow` via `color-mix`.
- **Layout/chrome:** ship the one App Bar; delete 9 inline back buttons; sticky-footer CTA dock (replace `fixed;bottom:80` + magic `padding-bottom:170`); center confirmation & empty-state screens; Services hotline docks via `margin-top:auto`.
- **Imagery/identity:** `PRODUCT_ART` illustration system in `--sur2` stages; fix the related-thumb crosshatch (markup L226) → same stage; delete the `تصویر محصول` mono label; O₂ molecule logomark as one component at two sizes (header 42/r16, auth 64/r20) on the `--p→--acc` gradient (fixes flat-`var(--p)` auth mismatch); fix the flagship "درخواست شارژ" glyph (currently a beaker, not a cylinder, L69/L363).
- **Typography:** tabular figures + `unicode-bidi:isolate` on numeric contexts; **retire SF-Mono** on phone/OTP/discount → Vazirmatn Latin figures; keep `Intl.fa-IR` for human quantities.

### P2 — polish & rank
- **Imagery:** medical-trust pill strip built from existing spec data (fills below-fold void on home + detail); gas color-coding dots + category-chip archetype glyphs; maskable PWA/splash icon from the logomark; reskin 3 empty states in the illustration language.
- **Layout:** Featured = horizontal snap carousel (rank vs. list rows); two thumbnail sizes only (72/56, retire 48/64); reuse the `[h2 | مشاهده همه]` section-header as a named pattern.
- **Detail:** currency unit → one class (`11px/400/--tx2`), lead the minus sign (`−۵۰٬۰۰۰ تومان`); dashed dividers → solid inset hairline; switch knob → `transform:translateX` (off `inset-inline-start`); pending state on commit (`disabled` + "در حال ثبت…" using the shipped `breathe`); success checkmark stroke-draw via existing `--ease-spring`; nav cart-badge ring (`0 0 0 2px var(--sur)`); icon strokes → 1.75 (≥18px) / 2 (≤16px); empty-state parity for orders/requests; single staff noun (**کارشناسان امداد اکسیژن**); remove `dir="ltr"` from Farsi placeholder labels.

---

## 5. WHAT TO EXPLICITLY NOT DO (guardrails)

- **Do not add a second/display font** (Estedad, Morabba, etc.). Single Vazirmatn is the lane — it already clears the bar and keeps the PWA dependency-free. Revisit only after everything else ships.
- **Do not add new motion.** Motion + a11y are shipped and mature. No entrance animations on cards, no parallax, no animating the app bar into a named View-Transition element (it must stay unnamed so it slides *with* its page under the existing cover-slide). The only new micro-motion allowed: switch→transform, success-check draw, pending spinner — all reusing existing keyframes/eases.
- **Do not make `--acc` a fill.** It stays a 2px ring/dot/underline in both themes. If a screen shows two teal fills, one is a bug.
- **Do not go warm-paper.** Cool near-neutral is the correct clinical register; the only warm pixels stay `--err`/`--warn`.
- **Do not tint shadows teal.** Once the ground de-tints, teal shadows kill separation. Cool-neutral ink for `--e1–e3`; colored glow is reserved for `--e4` (hero) only.
- **Do not break the substring hooks.** `[style*="background:var(--sur)"]`, `z-index:40`, `border-radius:20px 20px 0 0` are load-bearing — they let materials attach with zero template churn. Preserve exact serialization.
- **Do not touch the working numerals** (`Intl.NumberFormat('fa-IR')` with the `٬` separator) or the `430px` centered column or the reserved `min-height:18px` error rows — these are the few things already right.
- **Do not build a 2-column product grid** or over-blur small controls. Grid waits until real imagery exists; heavy frost is for large surfaces only (chips near-zero blur).