The advisor is rate-limited, but orientation is complete and my load-bearing claims are empirically verified. Here is the critique.

---

# Elevation, Depth & Materials — Emdad Oxygen

## 1. Verdict

The app has exactly **one** real material in it — the home hero — and everything else is the same flat sheet of glass with a glowing white rim, so there is no depth *ranking*: a card, a nav bar, an input, and a recessed well all sit on the same optical plane. Two facts prove it: **58 `--sur` surfaces carry zero shadow** (only 7 floating overlays use `--shadow`), and the entire app contains **one** inset key-highlight (the hero, line 53). The fix is unusually cheap because this codebase applies material through inline-style substring hooks (`[style*="background:var(--sur)"]`) — so a real 4-level elevation system can be attached to the existing `--sur`/`--sur2` hooks in ~15 lines of CSS with **no template edits**.

## 2. Problems in this lens (with evidence)

**(a) Cards never lift off the background.** In light mode a card is `rgba(255,255,255,.62)` fill + `blur(16px)` + a `rgba(255,255,255,.85)` border, and *nothing else* — no shadow (grep: `box-shadow` appears on cards 0×). Over the mint→blue gradient with a moving aurora behind it, a 62%-white panel with a white rim is barely separated from a 90%-ish-white background. The card and the page are coplanar.

**(b) The hairline is doing the wrong job.** `--line: rgba(255,255,255,.85)` (light) is a near-opaque **white** stroke on all four sides. On glass over the aurora it reads as a bright *edge glint*, not a containing border — and on any near-white surface it vanishes. It's simultaneously too loud (as a divider: the dashed summary rules, nav top border, profile menu separators all get an 85%-white line) and too weak (as a container edge). One token is being asked to be both a specular highlight and a hairline; it's good at neither.

**(c) The elevation model is inverted.** `--sur2` (0.42 alpha) is *more transparent* than `--sur` (0.62). It's used as the **recessed** layer — qty steppers (l.195), sheet sort rows (l.849), avatars, icon chips, empty-state discs (13×). But "more see-through" optically reads as *higher/lighter*, not sunken. So the middle of the stack (card vs. well) is ambiguous or backwards: the thing that should recede floats.

**(d) Glass is uncalibrated — one blur, one saturation, everywhere.** The hook bakes in `blur(var(--blur)) saturate(1.3)` for *every* surface (l.46–48). A 40px chip, a full-width card, the bottom nav, and a bottom sheet all frost identically. Premium material systems (iOS control-center, Vision) scale blur/saturation with size and elevation — heavy blur + high saturation to fully lift a large surface off a busy backdrop, near-zero on small controls. Here the big surfaces under-blur (aurora bleeds through, contrast wobble) and small ones over-blur (wasted compositor cost).

**(e) One shadow token, misused as "float."** `--shadow` is a big *downward* drop (`0 22px 50px -26px`). It's applied only to things that shouldn't necessarily drop down: fixed **bottom** CTAs (should cast *up* into content), the address popover, the toast. The persistent bottom nav (`z-index:40`, l.911) has **no** shadow at all — just `border-top:1px solid var(--line)` — so scrolling content dead-ends into a faint line instead of sliding *under* a lifted bar. There is no ambient+key pairing anywhere except the hero.

**(f) Radii are un-nested.** 9 distinct corner values (8/9/10/12/14/16/18/20/24 + 999). Concentric radii are accidental (e.g. a 20px image frame with an 8px inner chip; 16px cards with 12px inner icon tiles) so corners don't feel machined. This is a materials tell — real product UIs keep inner-radius = outer − padding.

## 3. Recommendations (exact systems/values)

### 3.1 A 5-step elevation scale (tokens)
Add to `:root`/`body` and the dark block. Each raised level = **ambient (soft, wide, low-alpha) + key (tight, darker)**; recessed = **inset**. Light shadows tint toward the brand ink `rgba(12,74,68,…)` not pure black (glass over teal should cast teal-gray, not neutral):

```css
/* light */
--edge:  inset 0 1px 0 rgba(255,255,255,.55);           /* specular top glint */
--e0:    inset 0 1px 2px rgba(12,74,68,.14);             /* recessed well */
--e1:    0 1px 2px -1px rgba(12,74,68,.14);              /* chip / inline */
--e2:    0 1px 2px -1px rgba(12,74,68,.10),
         0 8px 20px -10px rgba(12,74,68,.20);            /* CARD */
--e3:    0 2px 6px -2px rgba(12,74,68,.16),
         0 18px 40px -16px rgba(12,74,68,.30);           /* sheet / popover / nav */
--e4:    0 24px 54px -22px var(--glow), var(--edge);     /* hero / primary moment (=current hero) */
--hairline: rgba(9,48,43,.09);                           /* NEW containing edge */
--edge-hi:  rgba(255,255,255,.6);                         /* NEW top glint alpha */

/* dark */
--edge:  inset 0 1px 0 rgba(255,255,255,.07);
--e0:    inset 0 1px 2px rgba(0,0,0,.5);
--e1:    0 1px 2px -1px rgba(0,0,0,.6);
--e2:    0 1px 2px -1px rgba(0,0,0,.5), 0 10px 24px -12px rgba(0,0,0,.6);
--e3:    0 2px 8px -2px rgba(0,0,0,.6), 0 22px 48px -18px rgba(0,0,0,.72);
--e4:    0 26px 60px -24px rgba(0,0,0,.8), var(--edge);
--hairline: rgba(255,255,255,.10);
--edge-hi:  rgba(255,255,255,.08);
```

### 3.2 Fix the hairline in one token
Repoint `--line` from `rgba(255,255,255,.85)` → the new hairline (`rgba(9,48,43,.09)` light; keep `rgba(255,255,255,.10)` dark). Because every card, input, divider and the nav all read `border:1px solid var(--line)` inline, this **single change fixes 130+ borders app-wide** — turning the glowing white rim into a proper contained edge — while the specular top-glint moves to the box-shadow `--edge` inset so glass still catches light on top only (physically correct: light comes from above).

### 3.3 Attach material to the existing hooks (no template edits)
Split the one glass rule into ranked materials, and add nav/sheet targets (the nav already has a `z-index:40` hook; sheets are targetable by their `border-radius:20px 20px 0 0`). Box-shadow is *not* set inline on cards/wells, so the hook fully owns it:

```css
/* CARD (level 2): lifts off bg, catches top light, medium frost */
[style*="background:var(--sur)"],[style*="background: var(--sur)"]{
  -webkit-backdrop-filter:blur(14px) saturate(1.4);
  backdrop-filter:blur(14px) saturate(1.4);
  box-shadow: var(--edge), var(--e2);
}
/* WELL (level 0): recessed, light frost, low saturation, NO drop */
[style*="background:var(--sur2)"],[style*="background: var(--sur2)"]{
  -webkit-backdrop-filter:blur(10px) saturate(1.12);
  backdrop-filter:blur(10px) saturate(1.12);
  box-shadow: var(--e0);
}
/* NAV (level 3): heavy frost, casts UP into scrolling content */
[style*="z-index:40"],[style*="z-index: 40"]{
  -webkit-backdrop-filter:blur(24px) saturate(1.5);
  backdrop-filter:blur(24px) saturate(1.5);
  box-shadow: 0 -1px 0 var(--hairline), 0 -8px 24px -12px rgba(12,74,68,.22);
}
/* SHEET (level 3): heavy frost + big upward lift off the scrim */
[style*="border-radius:20px 20px 0 0"]{
  -webkit-backdrop-filter:blur(24px) saturate(1.5);
  backdrop-filter:blur(24px) saturate(1.5);
  box-shadow: var(--edge), var(--e3);
}
```

This resolves (a)(c)(d)(e) at once: cards gain ambient+key + top glint (lift), wells get an inset (recess — killing the inversion regardless of their alpha), and the two big surfaces get true heavy-frost + directional shadows. Note the address popover (l.775) keeps its inline `box-shadow:var(--shadow)`; retarget that inline value to `--e3` for consistency.

### 3.4 De-invert the well fill (optional, 1 token)
Give `--sur2` a faint ink tint instead of pure-white transparency so it *reads* sunken even before the inset: light `--sur2: rgba(214,236,231,.5)` (a hair of mint), dark unchanged. Small but it stops wells from glowing.

### 3.5 Reuse the hero material as a "premium moment" class
The hero (l.53) is the only element with colored ambient + inset key — that's exactly the level-4 recipe (`--e4`). Apply the same formula to the two other primary surfaces that are currently **flat solid teal**: the services hotline card (l.381, `background:var(--p)` with no shadow/highlight) and the success/order-confirmation discs — add `box-shadow: var(--e4)` (colored glow + top glint). One recipe, used deliberately 2–3 times, is what makes "hero > card > well" legible.

### 3.6 Radius tokens (materials polish, supports the whole system)
Collapse 9 values → a 6-step scale and nest concentrically: `--r-chip:999px; --r-sm:10px; --r-md:14px; --r-lg:18px; --r-xl:22px; --r-hero:26px`. Rule of thumb to apply as you touch screens: inner radius = outer − padding (e.g. 18px card, 14px padding → 12px inner tile). This is the one piece that *does* need incremental inline edits, so it's lowest priority — the shadow/hairline system above is what buys the depth.

## 4. The ONE highest-leverage change

**Give `--sur` cards a real ambient+key shadow via the existing glass hook, and simultaneously repoint `--line` from 85%-white to a 9%-ink hairline (with the white glint moved to an `inset --edge` highlight).** That is a single ~15-line CSS edit, zero template changes, and it flips the app's core failure — 58 coplanar cards with a glowing rim — into cards that lift off the aurora with a lit top edge and a contained hairline, across all 17 routes at once. It's the difference between "translucent panels floating in soup" and "ranked, physically-lit surfaces," and everything else in §3 layers cleanly on top of it.

**Files:** design system to edit — `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css` (tokens at l.8–40, glass hook at l.46–48, nav hook already present at l.92). No edits required to `markup_current.html` for §3.1–3.5.