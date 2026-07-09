Confirmed first-hand: all four Baloo weights (500/600/700/800) reference byte-identical URLs per subset (arabic = `9e5423b7…` in every weight), and no 900 file exists. The weight ladder is a fiction. Writing the deliverable now.

---

# Typography (Persian/RTL) — critique & plan · Emdad Oxygen Shop

## 1 · Verdict

The app's type layer is its weakest premium lever: **18 ad-hoc font-sizes (9.5–26px, half-pixel values everywhere), a fake heading-weight ladder, and two families that don't even agree on the brand mark** — the wordmark renders in Vazirmatn while the headings render in Baloo. The single highest-return move is to **collapse to one family (Vazirmatn), used expressively across a real 8-step token scale with a genuine 400→800 weight ladder**, which fixes the weight-dedup, the size chaos, and the family-split cohesion defect in one stroke. Numerals are already handled well conceptually (`Intl.NumberFormat('fa-IR')`); the remaining numeric work is a systematic *tabular-figure + digit-policy* rule, plus retiring the SF-Mono code-editor look on phone/OTP.

## 2 · The problems in this lens (with evidence)

**A. The heading weight ladder is illusory — verified two ways.**
- Markup requests `font-weight:900` on the hero H1 (line 60), the Products/Cart page titles (112, 253), and the detail title (187) — 23 uses of `900` total. But `style_1.css` (Baloo) ships only weights **500/600/700/800, no 900** → every `900` heading is *unsatisfiable* and renders at the 800 file, identical to the 72 `800` elements. Hierarchy collapses before dedup even enters.
- Dedup then confirmed first-hand: across Baloo's 500/600/700/800 declarations, each unicode subset points to **one physical file** (the Persian/arabic subset is `9e5423b7-…` in *all four* weights). So Baloo weights 500–800 are one weight. The "900 hero / 900 title / 800 section / 700 link" ladder in the markup is four labels for **one rendered weight**.

**B. Two families that disagree on the brand.** `style_3` scopes Baloo to `h1,h2` only. The logo lockup "امداد اکسیژن" (line 39) is a `<div>` → it inherits **Vazirmatn**. So the wordmark and the page headings are in *different typefaces* right now — a live cohesion bug, not a subtle one. Baloo Bhaijaan 2 is also a rounded, playful display face that fights the clinical/medical-supply positioning (Apple/Stripe/Linear-tier medical commerce reads neutral-geometric, not bubbly), and it's the one Google-origin dependency (the `fonts.gstatic.com` preconnect on line 17) in an otherwise offline PWA.

**C. Size system is entropy.** 18 distinct sizes, dominated by fractional values that only exist because each card was tuned by hand: `13.5px` (24×), `12.5px` (25×), `11.5px` (22×), `10.5px`, `14.5px`. Half-pixel sizes rasterize inconsistently across the 6 repeated product cards. There is no scale — just a cloud of near-values (13 vs 13.5 vs 14 vs 14.5 carry no semantic difference).

**D. Heading rhythm is fighting itself.** `style_3` sets `h1,h2{ letter-spacing:-.4px; line-height:1.28 }`. Two defects: (1) **negative tracking on connected Persian script is an anti-pattern** — Arabic-script letterforms join, and `letter-spacing` inserts/removes space between *every* glyph including intra-word joins, degrading the connection; Persian wants `normal`. (2) `line-height:1.28` is too tight for Persian's descenders/loops, which is why the markup keeps *ad-hoc-correcting* it inline (`line-height:1.5` on the hero, `1.6` on the detail title). Those inline overrides are patches for a wrong base.

**E. Weight is overused as the only emphasis tool.** `800` appears 72× and `700` 53× — nearly every label, card title, CTA, price, and section head is bold. When everything is 700–900, nothing reads as ranked; the eye gets no hierarchy from weight because there's no `400/500/600` mid-ground in use (only 10 uses of `400` total, all for the tiny "تومان" unit).

**F. Numerals: policy is 80% right, execution is off.** Persian digits via `Intl.NumberFormat('fa-IR')` (line 159, → "۲٬۵۰۰٬۰۰۰" with the correct ٬ separator) is the right call and should stay. But: (1) **no tabular figures anywhere** — no `font-variant-numeric`/`font-feature-settings` in any file; (2) phone + OTP + the discount code are rendered in `ui-monospace,SFMono-Regular,monospace` (lines 330, 341, 383, 453, 504) — SF Mono on a Persian medical storefront reads like a terminal, an out-of-family texture on the most-scrutinized fields (the login flow); (3) no bidi isolation on the `dir="ltr"` Latin runs embedded in RTL text (line 337).

**G. Readability on glass has no floor.** Secondary text `--tx2` (`#48706a` light) at **11px** sits on `--sur2` (42% white) *over the moving aurora*. Small muted Persian on a translucent, animated ground is the app's contrast-risk hotspot, and 11px is below a comfortable Persian floor.

## 3 · Concrete recommendations

### 3.1 Consolidate to Vazirmatn + install a type-scale token set

Drop Baloo entirely (kills the fake ladder, unifies wordmark+headings, removes the `gstatic` preconnect). Point `h1,h2` at Vazirmatn and add real tokens to `:root`. Vazirmatn ships 9 genuine, distinct weight files (100–900) — so the ladder becomes real.

```css
:root{
  /* type scale — px chosen for Persian legibility; NO fractional sizes */
  --fs-display: 26px;  --lh-display: 1.35;   /* hero H1 only */
  --fs-title:   20px;  --lh-title:   1.40;   /* page H1: محصولات / سبد خرید */
  --fs-h:       17px;  --lh-h:       1.45;   /* detail title, sheet header */
  --fs-sub:     15px;  --lh-sub:     1.50;   /* section heads: محصولات ویژه, CTAs */
  --fs-body:    14px;  --lh-body:    1.75;   /* base + card titles */
  --fs-sm:      13px;  --lh-sm:      1.70;   /* inputs, spec rows, secondary body */
  --fs-caption: 12px;  --lh-caption: 1.55;   /* meta/help (FLOOR — raise all 11/11.5) */
  --fs-label:   11px;  --lh-label:   1.40;   /* unit تومان, badges, overlines — only 11 survivor */
  /* weight ladder — real Vazirmatn files */
  --w-display:800; --w-title:700; --w-strong:600; --w-med:500; --w-body:400;
}
h1,h2{ font-family:Vazirmatn,system-ui,sans-serif; letter-spacing:normal; }  /* was Baloo + -.4px */
h1{ font-size:var(--fs-title); line-height:var(--lh-title); font-weight:var(--w-title); }
```

**Mapping the 18 sizes → 8 tokens** (delete every half-pixel): 24→`display`; 20/19/18→`title`; 17/16→`h`; 15/14.5→`sub`; 14/13.5→`body`; 13/12.5→`sm`; 12/11.5/11→`caption`; 10.5/10/9.5→`label`. **Weight remap** (collapse the bold-soup into a ladder): `900→800` (display only), most `800→700`, card-title/label `700→600`, help text `→500`, body `→400`. Concretely: the hero drops from `900` (rendered flat) to real Vazirmatn **800**; page titles `900→700`; card titles `700→600`; the fixed CTAs `800→700` (still confident, no longer flattening everything beneath them).

### 3.2 Numerals — one explicit policy + tabular figures

- **Digit policy (state it as a rule):** Persian digits for *human quantities* — money, counts, quantity steppers, dates (keep `Intl.fa-IR`). **Latin** digits only for *technical identifiers* — phone, OTP, discount codes — but rendered **in Vazirmatn's Latin figures, not a monospace family**.
- **Retire SF Mono.** Replace `font-family:ui-monospace,SFMono-Regular,monospace` on lines 330/341/343/383/453/504 with the numeric rule below. Keep the benefits that motivated mono (alignment, digit disambiguation) via tabular figures; lose the code-editor texture.
- **Tabular figures as a system standard** on numeric-alignment contexts — price rows, cart subtotal/total (292–298), qty steppers (196–199, 274–276), phone/OTP:
```css
.num, input[inputmode="numeric"]{
  font-variant-numeric: tabular-nums; font-feature-settings:"tnum" 1;
  unicode-bidi: isolate;   /* clean LTR digit runs inside RTL text (fixes line 337) */
}
```
  *Honest caveat:* `tnum` frequently targets only Latin figures and may **no-op on Persian digits** (Vazirmatn's ۰-۹ may already be fixed-width) — so treat this as a premium standard that *guarantees* alignment for the Latin phone/OTP and does no harm elsewhere; the qty stepper's alignment still comes from its `min-width;text-align:center` container, not the feature. Verify against Vazirmatn before claiming it changes the Persian price column.
- The phone `letter-spacing:1px` (line 330) can go once figures are tabular; the OTP `letter-spacing:10px` (341) is a legitimate slot-field treatment — keep it.

### 3.3 Heading rhythm & the "unit" pattern

- Base heading line-height to **1.4–1.5** (per token), and **delete the inline `line-height:1.5/1.6` overrides** (60, 187) — they were compensating for the wrong `1.28` base. `letter-spacing:normal` on all Persian headings.
- The bold-price + small-muted-"تومان" pattern (97–98, 141, 193, 298) is genuinely good (Stripe-like unit typesetting) — **systematize it** as `--fs-label` + `--w-med` + `--tx2`, applied consistently (right now the unit is `10px`/`10.5px`/`11px` in different rows).

### 3.4 Readability floor on glass

Raise the muted-text floor: no essential copy below **`--fs-caption` 12px**; `11px` (`--fs-label`) is reserved for non-essential units/badges. For the rare text that sits *directly on the aurora* rather than on a `--sur` panel, either move it onto a surface or nudge `--tx2` darker/lighter — small muted Persian over the animated blur is the one place contrast can dip.

### 3.5 Stretch (premium pairing, optional)

If you want display personality beyond single-Vazirmatn without regressing cohesion: keep **Vazirmatn for body + all numerals**, and add **one** heavy Persian display face on **hero + page titles only** — e.g. **Estedad** (ships a true Black weight and a full Arabic/Persian subset, and shares Vazirmatn's proportions so they pair without friction) or **Morabba** as a rounder alt. Cost is honest: one more bundled `woff2` and the discipline to never let the display face touch body/numerals. Verify the chosen face ships the heavy weight + Arabic subset before wiring it. Single-Vazirmatn stays the *default* recommendation — it's the "don't overengineer," zero-new-dependency path and already clears the bar.

## 4 · The ONE highest-leverage change

**Kill Baloo; make Vazirmatn the whole system, expressed through the 8-step token scale and a real 400→800 weight ladder (§3.1).** This single move simultaneously (a) fixes the fake heading ladder — `900` headings currently render at Baloo's single physical weight — by restoring genuine weight contrast from Vazirmatn's distinct files; (b) resolves the wordmark-vs-headings family split into one coherent voice; (c) replaces 18 arbitrary sizes with 8 semantic tokens; and (d) removes the app's only external font dependency. It is the rare change that advances *both* cohesion and premium feel at once, and everything else here (numerals, rhythm, glass floor) layers cleanly on top of it.

---

Source refs: type-scale/weight evidence — `markup_current.html` lines 39 (wordmark = div/Vazirmatn), 60/112/187/253 (`font-weight:900`); heading base — `style_3.work.css` line 51 (`Baloo … letter-spacing:-.4px; line-height:1.28`); numerals — `script_2.work.js` line 159 (`Intl.NumberFormat('fa-IR')`) and markup lines 330/341/383/453/504 (SF Mono); Baloo dedup confirmed first-hand in `style_1.css` (weights 500/600/700/800 all reference identical per-subset URLs; no 900 file).