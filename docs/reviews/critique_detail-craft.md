The advisor is rate-limited, but I have complete evidence from reading all four sources directly. Here is my review.

---

# Micro-Detail Craft & Content Polish — Emdad Oxygen

## 1. Verdict

The bones are more careful than most templates (reserved `min-height:18px` error rows prevent layout shift, disciplined `dir="ltr"` on latin/numeric runs, correct `Intl.NumberFormat('fa-IR')` with the real Persian thousands separator ٬). But the 1% layer is unmanaged: chips, badges, hairlines, currency units and icon strokes are each drawn with 3–5 slightly different ad-hoc values, and two substring-hook side effects make **selected filter chips glow like the hero CTA** while the intended **hover-accent border never fires at all**. Tighten the smallest repeated primitives — chip/badge, hairline, currency unit — into single specs and the whole app jumps from "nice template" to "crafted product."

## 2. Specific problems (with evidence)

**Interactive-state bleed (the worst tell).** The CTA hooks match on substring `background:var(--p)`. Selected category/gas chips set exactly that (`script_2.work.js:446, 453` → `background:var(--p)` on a `<button>` at `markup:124, 416`). So a 34px filter chip inherits the hero button's depth-gradient (`style_3.work.css:127`) **and** the `--glow` shadow (`css:49`). A filter pill should never carry hero-CTA elevation.

**The hover-accent border is dead code.** `css:147` targets `[role="button"][style*="background: var(--sur)"]:hover` (space after colon), but every product card serializes `background:var(--sur)` with **no space** (`markup:89, 132, 818`) and filter chips are `<button>`, not `role=button`. The intended premium hover never happens on any surface.

**Hairlines are dashed and near-invisible.** Spec rows, cart totals and checkout use `1px dashed var(--line)` (`markup:212, 297, 588`). Dashed reads receipt-grade, not medical-premium — and `--line` in light is `rgba(255,255,255,.85)`, a glass-rim highlight, so a dashed white divider on a white-ish `--sur` panel is barely there. One token (`--line`) is overloaded as *both* glass edge and content divider.

**Currency `−` sign is trailing and glued.** Discount renders `{{ discLabel }}− تومان` (`markup:294, 586`) → "۵۰٬۰۰۰− تومان". The minus must lead the number: "−۵۰٬۰۰۰ تومان".

**Currency unit ("تومان") has no spec.** It appears at `font-size` 10px (`markup:271`), 10.5px (`98, 141, 193`), 11px (`298, 589, 823`) and unstyled inline (`292, 584`). Five treatments for one unit.

**Chip/badge scale is ad-hoc.** Status pills vary: `2px 10px`/10px ("پیش‌فرض" `767`), `3px 10px`/10.5px ("ناموجود" `138`), `4px 12px`/10.5px (stock `438`), `5px 10px`/11px (featured inquiry `101`), `6px 12px`/11.5px (`144`). No unified height/padding/label size.

**Nav cart-badge has no ring.** `markup:918` overlaps the icon with no `box-shadow:0 0 0 2px var(--sur)`, so the badge merges into the icon stroke instead of punching out.

**Icon stroke-widths drift.** 1.8 (cart-empty `257`), 1.9 (nav `916`), 2 (most), 2.2 (add-to-cart `149, 828`), 2.4 (success check `529, 603`). At the same optical size this reads inconsistent.

**Empty-state anatomy is inconsistent.** Cart/wishlist/no-results/profile-guest get an icon-in-circle (`255, 810, 157, 624`); **orders and requests get plain text** (`694, 726`). Same component, two anatomies.

**Switch knobs animate a layout property.** Both toggles slide via `transition:inset-inline-start .2s` (`script:592, 594`) — non-compositor, so the knob can jank. Should be `transform:translateX`.

**No pending state on commit.** `submitRefill`/`placeOrder`/`saveAddr` rely on a silent 900ms `commitGuard` (`script:246, 344, 399`) — the button gives zero "processing" feedback.

**Success is static.** The check sits in an `--ok-soft` circle with only a container `fadeIn` (`markup:526, 601`); the checkmark itself never draws. `--ease-spring` and `breathe`/`floaty` keyframes already exist and go unused here.

**Microcopy — staff noun drifts.** The team is called کارشناسان (`script:282`), همکاران ما (`markup:611`), and اپراتور/تکنسین (`script:693`). Pick one voice.

**RTL nit — Farsi text forced LTR.** Placeholder tiles set `dir="ltr"` on Farsi words ("تصویر محصول" `markup:179`, "عکس" `401, 484`). `dir="ltr"` should be reserved for latin/numeric (codes, phones, coords), not Persian labels.

## 3. Concrete recommendations (exact values)

**A. Two new hairline tokens (split the overloaded `--line`).** Add to `css:11 / :28`:
```
light: --hair: rgba(8,48,43,.10);
dark:  --hair: rgba(255,255,255,.09);
```
Convert every divider to **solid + inset to the text column**, not dashed edge-to-edge: spec rows, cart/checkout totals (`markup:212,297,588`) → `1px solid var(--hair)`; profile menu separators (`markup:655`) → `border-bottom:1px solid var(--hair)` with `margin-inline-start:60px` so it starts after the icon (iOS inset). Keep `--line` only for glass rims/inputs.

**B. One chip + two badge specs.** Replace the scattered values with:
```
Chip (filter/category/gas):   height:32px; padding:0 12px; radius:999px; font:12px/700; gap:6px
  selected:  background:var(--p-soft); color:var(--p); border:1px solid transparent   ← NOT var(--p)
  idle:      background:var(--sur); color:var(--tx2); border:1px solid var(--line)
Status badge:                 padding:3px 9px; radius:999px; font:11px/700   (ok/err/warn/p soft pairs)
Count badge (nav):            min-width:18px; height:18px; font:10px/800; + box-shadow:0 0 0 2px var(--sur)
```
Selected chips using `--p-soft` (not `--p`) removes the accidental CTA gradient+glow entirely and keeps the hero button unique.

**C. Fix the hover rule** — drop the space requirement and cover both element types:
```
@media (hover:hover){
  [role="button"][style*="background:var(--sur)"]:hover,
  button[style*="background:var(--sur)"]:not([style*="var(--p)"]):hover{
    border-color: var(--acc);
  }
}
```

**D. Currency treatment.** One helper class rendered around every unit: `font-size:11px; font-weight:400; color:var(--tx2); margin-inline-start:2px`. Fix the discount sign to lead: `markup:294,586` → `−{{ discLabel }} <span class="unit">تومان</span>`.

**E. Icon strokes.** Standardize line icons to `stroke-width:1.75` at ≥18px and `2` at ≤16px (optical compensation) — one edit across the SVG set. Drop the 2.2/2.4 one-offs.

**F. Switch knobs → transform.** `script:592–594`: replace `inset-inline-start` animation with `transform: translateX(±18px)` (sign flipped for RTL) and `transition: transform .2s var(--ease-spring)`.

**G. Pending state.** Add `submitting` to state; while true, CTA is `disabled`, shows an inline spinner + label swap ("در حال ثبت…"). Reuses the existing `breathe` keyframe on a dot.

**H. Success delight (low-effort).** Give the check `stroke-dasharray/dashoffset` draw (~26 length) over `.5s var(--ease-decel)` and a `transform:scale` spring on the circle via `--ease-spring`. Two lines, big perceived-quality lift on the two success screens.

**I. Empty-state parity.** Give orders (`markup:694`) and requests (`726`) the same 64px icon-circle as cart/wishlist (box icon / gas-cylinder icon).

**J. Microcopy + RTL.** Pick **کارشناسان امداد اکسیژن** as the single staff noun everywhere; remove `dir="ltr"` from the Farsi placeholder tiles (keep it only where content is latin/numeric).

## 4. The ONE highest-leverage change

**Unify the chip/badge/pill primitive into a single spec — and make "selected" use `--p-soft`, not `--p`.** It is the highest-frequency micro-component in the app (category filters, gas types, stock/inquiry/default status, nav cart count, order/request status, price units — every screen), it is currently the most inconsistent surface (5 padding values, 4 label sizes), and switching selected chips off `background:var(--p)` simultaneously kills the two ugliest tells: the CTA depth-gradient and `--glow` shadow bleeding onto tiny filter chips. One primitive fixes the most surfaces, removes the most "substring-hack" evidence, and reserves hero elevation for the hero button — the exact 1% that separates crafted from templated.

Source files: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_current.html`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`.