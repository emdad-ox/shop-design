# Design Refactor — Execution Brief

> Source: verbal design review from the Head of Product Design (Persian). Transcribed,
> de-duplicated, translated into precise design rules, and grounded in the actual code so
> this can be picked up **cold** — no further context needed — and executed item by item.
>
> Scope stance set by the reviewer: **"apply everywhere, in case I missed a spot."** Treat
> every rule below as global. Where the reviewer named one screen, it is an *example* of the
> violation, not the only place to fix.

---

## 0. How to execute (the one rule)

Never hand-edit the two HTML files. All work goes into the three build inputs, then rebuild:

- `build/script_2.work.js` — app logic; `renderVals()` emits most inline styles (chips, price, badges).
- `build/style_3.work.css` — the token system (`--fs-*`, `--w-*`, `--r-*`, `--h-*`) + global hooks.
- `build/markup_edits.json` — exact find/replace edits against the compiled template markup.

```bash
python3 build/build.py     # regenerate the Enhanced.html
python3 -m http.server     # verify in a browser (localStorage is unreliable on file://)
```

Verify **light mode** first (reviewer's primary lens — see §1F), watch the console for
`.sc-logic-error`, and exercise the flow. A wrong `find`-string / count is a hard `BUILD ERROR`,
not silent corruption.

### The core reframe — the system exists; the sweep was never finished

**Do not re-design the token system. It is already in place and largely correct.** The 8 design
critiques in `docs/reviews/` (typography, color-light, elevation, spacing, …) were acted on: the
current `style_3.work.css` already carries the de-tinted canvas, the deepened `--tx2:#3d5c57`,
`--sur` raised to `.72`, glass `saturate` dropped to `1.08`, the `--e0…--e4` elevation ramp, the
bottom-bar up-shadow + `z-index:30` scrim, `h1,h2` on Vazirmatn with `letter-spacing:normal`, and
the `--fs-*`/`--w-*`/`--r-*`/`--h-*` scales in `:root`.

**What was never completed is the propagation of the hundreds of inline literals onto those
tokens.** That gap is exactly what the reviewer is perceiving. The measured live state of the
built `Emdad Oxygen Shop - Enhanced.html`:

| Live pattern | Count | Meaning |
|---|---|---|
| `font-weight:800` | 91 | over-bolded (WI-02) |
| `font-weight:700` | 83 | over-bolded |
| `font-weight:900` | 29 | unsatisfiable ladder — renders same as 800 |
| `font-weight:500/600` | **2 total** | the mid-ground that should carry hierarchy is unused |
| distinct `font-size` values | **18** (6 half-pixel: 12.5×49, 13.5×32, 11.5×27, 14.5, 10.5, 9.5) | size entropy, no scale (WI-01) |
| distinct `border-radius` values | **12** (999,24,20,18,16,14,12,10,9,8,6,2) | radius entropy (WI-04) |

Because the same literal values repeat, retuning is cheap: edit the **single-source style
constants in `script_2.work.js`** (`chipBase` L1079, `navBase` L1172, `dotStyle` L1100/1109/1152,
`chipStyle` L470) — one edit propagates everywhere — plus **replace-all markup edits (`count:-1`)**
or a `[style*="font-weight:800"]`-style CSS normalization layer for the template literals. Prefer
scoped edits for the ~5 spots that must stay heavy (§1B).

> **Read these first — they are the detailed spec for the systemic items, with hard evidence and
> the exact token mappings:** `docs/reviews/critique_typography-persian.md` (WI-01/02),
> `critique_color-light-palette.md` (WI-03/07), `critique_elevation-depth-materials.md` (WI-05/07),
> `critique_spacing-rhythm-system.md` (WI-04/08). Reconcile against the *current* files before
> editing — several of their recommendations are already applied.

---

## 1. Global conventions to encode (the rules behind the items)

### 1A. Persian type scale — controls read one step larger
Persian glyphs need more optical size than Latin at the same px. Button and control labels are
currently too small. **Raise the control/label floor:** interactive text (buttons, chips, tab
labels, form labels) must be **≥ 15px**; body ≥ 14px; the smallest caption allowed is 12px (11px
and 10.5px are banned for anything a user reads). Update the tokens as the single source of truth:
`--fs-body`, `--fs-sm`, `--fs-caption`, and control tokens, then sweep the inline literals to match.

### 1B. Weight policy — hierarchy by **size**, not weight
This is the biggest systemic issue (155 heavy-weight instances). We build hierarchy with size and
color, **not** by stacking `700/800/900`. Collapse the ramp to:

- **400** body, **500** default UI label, **600** emphasis/CTA labels.
- **700** reserved — at most the single most important element in a view (price big-number, primary
  CTA). **800/900 removed** except one deliberate display use (hero number), if any.

Encode via `--w-body:400 / --w-med:500 / --w-strong:600 / --w-title:700` and stop authoring raw
`800`/`900`. When you drop a weight, compensate hierarchy with **size** so nothing loses prominence.

### 1C. Contrast policy — text vs. its button/surface
Reviewer flagged label-on-button contrast. Every text-on-fill pair must meet **WCAG: 4.5:1** for
normal text, **3:1** for ≥19px/bold. The risk spots are tinted/soft fills (`--p-soft`, `--acc-soft`,
`--ok-soft`, `--warn-soft`, glass `--sur`) carrying `--tx2` or `--p`-colored text. Audit each
fill+ink pair; darken ink or the fill until it passes. Primary CTA (`--p` fill / `--onp` ink) is the
baseline — bring the rest up to it.

### 1D. Radius logic — consistent nesting
Radii must follow one rule, not ad-hoc literals (there are raw `border-radius:14px` and `:2px`
alongside the `--r-*` tiers). Rule: **outer container radius > inner element radius**, one tier apart,
concentric. Assign by role and use **only tokens**: `--r-xl`(24) sheets/hero, `--r-lg`(20) cards,
`--r-md`(16) inner panels/inputs, `--r-sm`(12) small controls, `--r-pill` chips/steppers. Kill the
stray `14px`/`2px` literals.

### 1E. Affordance policy — sticky/floating must *look* sticky/floating
If an element is pinned (sticky bar) or floated (FAB), the user must see it detach from content:
a **scrim/blur seam, an elevation shadow, or a top hairline** on scroll. A CTA that looks flush with
the page fails this. (The CSS already ships this pattern for `[data-appbar]` and the `z-index:30`
scrim — the job is to make sure **every** sticky/float CTA opts into it, especially checkout — WI-05.)

### 1F. Mode focus — **light first**
The reviewer audited **light mode** (matches the product persona; reviewer's own read). Do the work
and verify in light mode first; then check dark for regressions. Do not let a light fix break dark.

---

## 2. Work items

Each item: **Problem** (faithful translation) · **Rule** (§ ref) · **Where** · **Change** ·
**Accept** (done-when) · **Scope**.

### WI-01 — Control text too small for Persian **+ size entropy**
- **Problem:** button/control text is below the Persian standard *and* there is no scale — 18 distinct sizes, 6 of them half-pixel (12.5px ×49, 13.5px ×32, 11.5px ×27), so the same object renders at 13/13.5/14/14.5 with no semantic difference (see `critique_typography-persian.md` §C, `critique_spacing-rhythm-system.md`).
- **Rule:** §1A.
- **Where:** `--fs-*` tokens already exist in `style_3.work.css`; the work is the *sweep* — inline literals in template (18 distinct sizes) + JS strings: `chipBase` [script_2.work.js:1079](../../build/script_2.work.js#L1079) (`--fs-caption`=12px), `chipStyle` [script_2.work.js:470](../../build/script_2.work.js#L470) (`10.5px`).
- **Change:** map all 18 sizes onto the 8 `--fs-*` tokens and **delete every half-pixel value**; raise the readable floor (no user-read text < 12px; button/chip/tab/label ≥15px). Use the mapping table already written in `critique_typography-persian.md` §3.1.
- **Accept:** ≤8 distinct font sizes app-wide, zero fractional; no readable text <12px; all control labels ≥15px; still fits a 360px phone.
- **Scope:** global — buttons, chips, tabs, form labels, badges.

### WI-02 — Over-use of heavy font weight (no mid-weight ground)
- **Problem:** weight is over-used as hierarchy — **203 heavy instances live (800×91, 700×83, 900×29)** while `500`+`600` total **2**. With no 400/500/600 mid-ground, weight can rank nothing. (The `900`s are also unsatisfiable and render identical to `800` — `critique_typography-persian.md` §A.) We vary **size**, not weight, unless something is genuinely important.
- **Rule:** §1B.
- **Where:** inline heavy-weight literals in template (replace-all candidates); JS: `chipBase` L1079 (`--w-title`=700), `navBase` active state [script_2.work.js:1191](../../build/script_2.work.js#L1191) (`font-weight:800`), `chipStyle` L470 (`700`).
- **Change:** collapse to 400/500/600 + a reserved 700; remove 800/900; re-establish lost hierarchy with **size**/color per §1B. Introduce the missing 500/600 mid-ground.
- **Accept:** ≤1 element per view uses 700; zero 800/900 (except one sanctioned hero display, if kept); 500/600 actively used; hierarchy still legible.
- **Scope:** global. Judgment call — before a blanket replace-all, list the ~5 spots that must stay heavy (price big-number, primary CTA) and scope those.

### WI-03 — Contrast: label vs. button/fill
- **Problem:** text/background contrast on buttons not respected in places.
- **Rule:** §1C.
- **Partly done:** the token-level fix from `critique_color-light-palette.md` §E is **already applied** — `--tx2` deepened to `#3d5c57`, `--sur` raised to `.72` (buys back contrast lost over the aurora). Light `--tx2` was 4.99:1 on solid but dipped below AA over the moving aurora; dark was 9.36:1 (not at parity).
- **Where:** soft-fill buttons/pills (`--p-soft`, `--acc-soft`, `--ok-soft`, `--warn-soft`), glass `--sur` surfaces carrying `--tx2`/`--p` text.
- **Change:** **verify the applied token fix, then** audit every remaining fill+ink pair to WCAG 4.5:1 (3:1 large); darken ink or fill. Note the color critique flags the primary CTA itself failing AA light — check it.
- **Accept:** every text-on-fill pair passes a contrast check in light **and** dark; the two themes are at parity.
- **Scope:** global.

### WI-04 — Radius rules not followed on cards/sections
- **Problem:** radius logic isn't respected — **12 distinct radius values live** (999,24,20,18,16,14,12,10,9,8,6,2); the `--r-*` tokens exist but off-scale literals (14,10,9,8,6,2,18) coexist. See `critique_spacing-rhythm-system.md` (10 radii, half-pixel).
- **Rule:** §1D.
- **Where:** raw literals in template; JS single-source constants already tokenized (`chipBase`, `navBase` use `--r-pill`/`--r-sm`) but `seg`/dot styles still raw (`border-radius:2px` [script_2.work.js:466](../../build/script_2.work.js#L466)); `navPillStyle` `14px` [script_2.work.js:1188](../../build/script_2.work.js#L1188).
- **Change:** map all 12 values onto role-assigned `--r-*` tokens; enforce concentric outer>inner nesting; collapse "card" to one radius.
- **Accept:** no raw radius literals for cards/sections/controls; ≤5 radius values app-wide; nested elements concentric.
- **Scope:** global — product cards, related rail, sheets, panels, chips.

### WI-05 — Checkout (`ثبت سفارش`) sticky CTA has no sticky affordance
- **Problem:** on the order screen the sticky/float button doesn't read as sticky/floating — the affordance rule is violated here.
- **Rule:** §1E.
- **Partly done:** the global patterns exist — bottom-bar **up-shadow** on `[style*="z-index:40"]` and the `z-index:30` **scrim** (`padding-top:34px` + gradient) are in `style_3.work.css`. The task is to confirm the **checkout** CTA actually opts into them.
- **Where:** `ثبت سفارش` CTAs — [script_2.work.js:450](../../build/script_2.work.js#L450), `:1247`, `:1328`; FAB `fabStyle` `z-index:40` [script_2.work.js:1214](../../build/script_2.work.js#L1214); fixed `z-index:30` bars in template.
- **Change:** ensure the checkout CTA sits in a `z-index:30`+`pointer-events:none` scrim wrapper (or `[data-appbar]`) so content passes under a shadowed seam; make detachment visible.
- **Accept:** scrolling content visibly passes **under** a shadowed/scrimmed bar on the order screen; bar clearly floats.
- **Scope:** every sticky/float CTA and FAB, not just checkout.

### WI-06 — Product intro is decorative, not functional
- **Problem:** the first/product-intro state became very decorative/pretty; it should be more **functional** — surface the primary actions (quick order / quick refill «شارژ سریع» etc.) so the product's main action is prominent, not ornamental.
- **Rule:** frontend-design — "the hero is a thesis," function over decoration.
- **Where:** product detail hero / intro section (product view-model in `script_2.work.js`; hero markup in template).
- **Change:** promote the primary action(s) into the hero — a prominent quick-order / quick-refill affordance — and quiet the decorative treatment around it. One signature moment, the rest disciplined.
- **Accept:** the main action is the most prominent element in the intro; decoration no longer competes with it.
- **Scope:** product intro / detail hero.

### WI-07 — Product-card price is too glassy in light mode
- **Problem:** on the product card, where the user reads the **price**, reduce the glassy effect — make it **matte/opaque** so the price is easy to read.
- **Rule:** §1C + §1F (light-first).
- **Partly done:** the *global* glass over-saturation is already toned down (`saturate(1.3)→1.08` on the `[style*="var(--sur)"]` hook). Remaining is the **price-specific** matte opt-out the reviewer asked for.
- **Where:** price rendering in `script_2.work.js` (`تومان`/`قیمت`); glass hook `[style*="var(--sur)"]{backdrop-filter…}` [style_3.work.css:60](../../build/style_3.work.css#L60).
- **Change:** give the price its own solid/opaque backing (opt the price chip out of blur/saturate, e.g. a non-`--sur` solid surface); ensure crisp legibility on the card in light mode.
- **Accept:** price reads instantly on a product card in light mode with no glass blur behind the number.
- **Scope:** every place a price appears on a card/list.

### WI-08 — Filter chips smaller than the standard tap/eye size
- **Problem:** filter chips are below the standard visual size — thin and small even on a phone.
- **Rule:** §1A + tap-target ≥ 44px.
- **Where:** **single source** — `chipBase` [script_2.work.js:1079](../../build/script_2.work.js#L1079) = `height:34px … font-size:var(--fs-caption)[12px] … font-weight:var(--w-title)[700]`. Editing this one constant fixes every filter/sort/category chip at once.
- **Change:** raise chip visual height (34→~40px) with padding giving a **≥44px tap target**, bump label to ≥15px, drop weight to 500/600 per §1B; keep `--r-pill`. Note `critique_spacing-rhythm-system.md` proposes `--h-sm:36`; reconcile — 36–40px *visual* with a 44px *tap* area via vertical padding.
- **Accept:** chips hit a ≥44px tap target, label ≥15px, comfortably sized on a 360px-wide phone.
- **Scope:** all chips (filter, sort, category) via `chipBase`.

### WI-09 — Wishlist / icon-only actions need a label when a product is new
- **Problem:** UX — for the wishlist button and similar icon-only actions, when a product is **new** it's better to also show a text label next to the icon.
- **Rule:** frontend-design writing — "a label labels"; reduce ambiguity for first-time items.
- **Where:** wishlist rendering (`wish` in `script_2.work.js:74,208`; heart `:259`); product `new` flag (`:206,347,391,447,511`).
- **Change:** when `product.new` is true, render the wishlist (and peer icon actions) with an adjacent text label instead of icon-only.
- **Accept:** a product flagged `new` shows a labeled wishlist action; established products may stay icon-only.
- **Scope:** wishlist + peer icon-only actions on new products.

---

## 3. Priority & sequencing

1. **The literal sweep (tokens already exist):** WI-01, WI-02, WI-04 — map the inline `font-size`/`font-weight`/`border-radius` literals onto the existing `--fs-*`/`--w-*`/`--r-*` tokens (starting at the single-source JS constants, then template replace-alls). Highest surface area; do together and rebuild once.
2. **Correctness:** WI-03 (contrast), WI-07 (price legibility) — direct usability.
3. **Affordance:** WI-05 (checkout sticky), WI-08 (chip size).
4. **UX polish:** WI-06 (functional hero), WI-09 (new-item labels).

Rebuild + verify in **light mode** after each group; check console; then spot-check dark.

---

## 4. Adjacent findings already documented (NOT in this review — decide scope)

The repo critiques surface related issues the reviewer did **not** raise. Listed so they aren't
silently dropped; include only if desired:

- **Numerals / SF-Mono:** phone, OTP, and discount code render in a monospace family (code-editor
  texture on a medical storefront); no tabular figures. — `critique_typography-persian.md` §F.
- **Accent = primary hue:** `--p` and `--acc` are 0.8° apart in light — two tokens doing one job, so
  "accent" can't read as intentional. — `critique_color-light-palette.md` §2A. (May be partly
  addressed — verify current tokens.)
- **Imagery / icon identity** and **detail-craft** lenses — `critique_imagery-icon-identity.md`,
  `critique_detail-craft.md`.

## 5. Open questions for the Head of Product Design

- **WI-02 keep-heavy list:** confirm which elements may keep `700` (proposed: price big-number, primary CTA only).
- **WI-06:** which actions count as the "main action" per product — quick order, quick refill («شارژ سریع»), both? Priority order?
- **WI-01/08 exact sizes:** confirm the target button/chip label size (proposed 15px) and chip tap height (proposed 44px).
- **Dark mode:** in scope for parity now, or light-only this pass?
