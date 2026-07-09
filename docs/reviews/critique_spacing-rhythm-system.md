Advisor is rate-limited; I have strong first-hand evidence from all four files, so I'll finalize. Here is the critique through the spacing / radius / layout-rhythm lens.

---

## 1. Verdict

The app's incoherence is almost entirely a **rhythm problem, not a color problem**: colors are tokenized but *every* radius, gap, pad, size, and height is an inline magic number, so the same conceptual object (a "card", a "product image", a "primary button") renders at 3–4 different values across the 17 routes. There is no scale — I counted **10 distinct radii, 18 distinct font-sizes (6 of them half-pixel), 8 distinct gaps, and a near-continuous 26→56px ramp of control heights** with no tiers. Introduce three small scales (spacing, radius, control-height) and, critically, collapse "card" to **one** radius + two padding tiers; that single systematic move buys ~80% of the cohesion before you touch imagery or type weight.

## 2. Problems in my lens (with evidence)

**A. Radius is per-instance, not per-tier.** Values in use: `8, 9, 10, 12, 14, 16, 18, 20, 24, 999`. The *same card object* takes four different radii:
- Product rows / cart / wishlist / summary / spec / order / request / address cards = `16px` (L89, 132, 267, 291, 702, 763, 818…) — the plurality.
- Home quick-action buttons = `18px` (L67, 74); Services cards = `20px` (L361, 371); Profile cards = `20px` (L623, 633, 653); Related-product row = `14px` (L225).

So "a card" is 14 **or** 16 **or** 18 **or** 20 with no rule. Same for **product images**, which appear at `10/12/14/20`: featured thumb 12 (L90), list thumb 12 (L133), detail hero 20 (L178), related 10 (L226), refill tile 14 (L400), used tile 14 (L483). And **inputs** are `14px` everywhere (L330, 453, 568, 886…) *except* the search field (L114) and discount input (L285) which are `999px` pills — two inputs, no rule.

**B. Card padding is unlinked from card size.** `12` (rows, L132/267), `16` (panels, L209/291/582), `14px 16px` (orders/checkout, L558/702/763), `18px 16px` (services, L361), `16px 14px` (home action, L67), `32px 20px` (profile guest, L623). Nothing ties padding to the card's tier — visually identical cards breathe differently.

**C. No type scale → sub-pixel noise.** 18 sizes spanning `9.5–24px`; six are half-pixel (`9.5, 10.5, 11.5, 12.5, 13.5, 14.5`). Body text alone uses `11 / 11.5 / 12 / 12.5 / 13 / 13.5` — six rungs inside a 2.5px band where 12.5 vs 13 is perceptually nothing. This is pure entropy and it also breaks vertical rhythm (line-boxes never land on a common baseline).

**D. Gaps and section rhythm are ad-hoc.** Gaps `4/6/7/8/9/10/12/14` (`7` and `9` are off-grid, L59/645/777). The dominant list gap is `10px` (×25) while section spacing mixes `margin-bottom:16` and `24` for the same "block break." Screen **top padding** flips between `20px` (home/products/services/profile) and `16px` (every back-row screen) and `64px` (success) — an accident of chrome, not intent.

**E. Control heights have no tiers.** One "primary control" renders as `44/46/48/50`: fixed CTAs 50 (L237, 308, 594), sheet/save 48 (L859, 899), hero/success 46 (L62, 539), search/empty-state 44 (L114, 697). Inputs 44/46/48/50. Icon buttons 36/38/40/44. The full ramp is `26,32,34,36,38,40,42,44,46,48,50,54,56` — thirteen heights, zero tiers.

**F. Layout constants are unowned magic numbers.** Bottom padding is `120px` (no CTA) vs `170px` (fixed CTA); the fixed CTA sits at `bottom:80px` (L235, 463, 592); toast at `bottom:88px` (L906); scrim pad `34px` (style_3 L154). All four are hand-derived from the ~64px nav + 50px CTA and drift independently.

**The one thing that *is* right:** horizontal gutter `16px` and content `max-width:430px` are 100% consistent (L34, 111, 168…). That proves the team can hold a constant — everything else just never got a token.

## 3. Recommendations (exact scales + assignment rules)

Add these to `:root` in `style_3.work.css` next to the existing `--ease-*/--dur-*` block, then map inline values to them. The **dynamic style strings in `script_2.work.js` are single-source-of-truth** (`chipBase` L441, `navBase` L519, switch/knob L591–594, `dotStyle` L462/469/500) — editing those constants propagates instantly, so they're the cheapest high-yield edits.

**Spacing (4px base):**
```
--sp-1:4; --sp-2:8; --sp-3:12; --sp-4:16; --sp-5:20; --sp-6:24; --sp-7:32; --sp-8:40; --sp-9:48; --sp-10:64;
```
Snap map: `6,7,9 → 8`; `10 → 12`; `13 → 12`; `14 → 16` (in spacing contexts); `18 → 16 or 20`. The 25×`gap:10` list rhythm becomes `--sp-3`.

**Radius (6 tokens, assigned by tier — not by instance):**
```
--r-sm:10;   /* image tiles/thumbnails nested in a card, dropdown menu rows, inline mono chip */
--r-md:14;   /* inputs, textareas, icon tiles, compact controls */
--r-lg:16;   /* ALL content cards — unify 14/16/18/20 here */
--r-xl:20;   /* bottom sheets, product-detail hero image, largest feature panels */
--r-2xl:24;  /* home hero ONLY (the single most prominent surface) */
--r-pill:999;/* buttons, chips, badges, avatars, switches, dots */
```
Remaps: home actions `18→16`, services/profile cards `20→16`, related row `14→16`; search + discount inputs `999→14` (they are inputs, not pills). **Concentric rule** for images inside cards: inner ≈ outer − padding; a 16px card with 12px pad is geometrically 4px inside, but `--r-sm:10` reads better against this soft glass system — use `--r-sm` and treat the full-bleed detail hero (no inner pad) as `--r-xl:20` sharing its panel radius.

**Control heights (3 tiers + icon):**
```
--h-sm:36;  /* chips, inline/secondary small buttons  (from 34/38) */
--h-md:44;  /* inputs, textareas, secondary buttons   (from 44/46/48) */
--h-lg:50;  /* primary CTAs                            (from 46/48/50) */
--h-icon:40;/* round icon buttons                      (from 36/38/40/44) */
```
Switch stays `26` (L591). Chip base (L441) becomes `height:var(--h-sm)`.

**Type scale (kill every half-pixel; 7 rungs — shared with the typography lens, but the *rhythm* payoff is mine):**
```
--fs-micro:10;  /* cart badge (from 9.5) */
--fs-caption:11;/* meta/labels (absorbs 10,10.5,11,11.5) */
--fs-sm:12;     /* secondary body (absorbs 12,12.5) */
--fs-body:13;   /* primary UI (absorbs 13,13.5) */
--fs-label:14;  /* buttons/emphasis (absorbs 14,14.5,15) */
--fs-title:16;  /* h2 section heads (absorbs 16,17) */
--fs-h1:20;     /* screen titles (absorbs 18,19,20) */
--fs-display:24;/* hero */
```

**Vertical-rhythm contract (one system, every screen):** gutter `--sp-4`; screen-top `--sp-5` (uniform — the `16` variant only exists because of the ad-hoc back-row, so it dies when chrome is unified); list gap `--sp-3`; heading→content `--sp-3`; section→section `--sp-6`; label→field `--sp-2`; field→next block `--sp-5`. **Card padding = two tiers only:** compact row `--sp-3` all sides; standard panel `--sp-4` all sides. Nothing else.

**Layout tokens (retire the magic numbers):**
```
--nav-h:64;
--cta-bottom: calc(var(--nav-h) + var(--sp-2));           /* replaces bottom:80  */
--toast-bottom: calc(var(--nav-h) + var(--sp-6));         /* replaces bottom:88  */
--pad-screen: calc(var(--nav-h) + var(--sp-6));           /* replaces 120        */
--pad-screen-cta: calc(var(--nav-h) + var(--h-lg) + var(--sp-5)); /* replaces 170 */
```
Now moving the nav height re-flows every screen automatically instead of desyncing four hand-tuned constants.

## 4. The ONE highest-leverage change

**Unify the card + screen frame.** Give every card on all 17 routes **one radius (`--r-lg:16`) + one of two paddings (`--sp-3` compact row / `--sp-4` standard panel) + one list gap (`--sp-3`)**, and lock the screen frame to **gutter `--sp-4`, top `--sp-5`, section gap `--sp-6`.** Cards and the screen frame are the repeating substrate under literally every screen, so snapping just those to tokens erases the 14/16/18/20 card jitter, the 10/12/16/24 spacing jitter, and the 16-vs-20 top-padding jitter in one pass — the app instantly reads as one system, and it's the prerequisite that makes the later imagery/elevation/type-weight work look intentional instead of landing on a wobbly grid.

**Files:** all edits live in `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css` (add the `:root` token block) with value mapping across `markup_current.html` (inline styles) and `script_2.work.js` (the `chipBase` L441, `navBase` L519, switch L591–594, and `dotStyle` constants — the cheapest propagation points).