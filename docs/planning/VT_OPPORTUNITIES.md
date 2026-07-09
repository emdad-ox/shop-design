## VT OPPORTUNITY BRIEF — Emdad Oxygen

Synthesized from all four lenses. Files to edit: `…/scratchpad/script_2.work.js`, `…/scratchpad/style_3.work.css`, markup via `…/scratchpad/markup_edits.json`. One build gate applies to almost everything below — read GUARDRAIL G0 first.

---

## 1. THE CARD → DETAIL EXPAND — YES, and here's exactly how

**Yes. It's not a new primitive** — it's `vtState`'s two proven moves (temporary per-tap naming + freeze-root) welded onto `go()`'s cross-route `setState`. Every product card in the app (home-featured, products list, detail "related", wishlist) binds the *same* `vm.open` closure, so rewiring that one closure lights up the morph at **every** entry point in a single change. Rated **LOW–M risk**: duplicate-name can't bite because the shared name spans a route swap where the old card unmounts and the new hero mounts — each snapshot carries the name on exactly one element, which is the canonical shared-element case, not a collision.

**Decisive design (the two lenses conflicted on root treatment and title — here's the resolved call):**

- **Name the thumbnail only, not the whole card, not the title.** The tapped card's first-child gradient div gets `view-transition-name:'hero-img'`; the detail hero band (`data-hero-img`) gets the same. Morphing the whole card raster-stretches its *text*; morphing the 13.5px/700 title into the 18px/900 `<h1>` reflows and janks. Gradient→gradient is the clean read. Skip the title morph in v1 (revisit only if the thumbnail alone feels thin).
- **Freeze root (1ms), do NOT crossfade it.** New mode `data-vt="hero"` sets root/old/new to `1ms` exactly like list-mode; the detail body pops in instantly *behind* the flying thumbnail (Android shared-element pattern — the eye is on the hero). A root crossfade here reintroduces the two-page "blink" the team deliberately removed with the opaque cover-slide. (If you later want a softer read, a gentle `emdadFadeIn` on `::view-transition-new(root)` is the tunable — but ship freeze-root.)
- **Lifecycle (per-tap, the `vtState` discipline):** ① *before* `startViewTransition`, query the tapped card by DOM (`[data-pid="…"]`) and name its `firstElementChild` — do **not** hold the React event ref, `currentTarget` is reset after dispatch. ② *inside* the `startViewTransition` callback, `this.setState({route:'detail',pid,qty:1}, …)` and in that completion callback call **`window.scrollTo(0,0)`** (REQUIRED — `componentDidUpdate` only resets scroll on *route* change, so the same-route related-card tap would fly the hero off-screen), then name `[data-hero-img]`, then `res()`. ③ in `t.finished.finally`, clear both names and delete `data-vt`. Guard with `_morphBusy` (rapid double-tap) and early-return to `this.go(patch)` under reduced-motion / no-`startViewTransition`.
- **RTL:** the morph is rect→rect geometry-driven, so it's RTL-agnostic — no left/right keyframes to mirror (unlike the cover-slide).
- **Back-morph (detail → card) is NOT symmetric — ship forward-only first.** Forward always has a target; back does not (if the user arrived from featured/wishlist/related, the origin card may be off-screen or unmounted → name with no matching capture → whole transition skips to instant swap). If you build reverse: name the destination card **only if `querySelector('[data-pid=…]')` hits and its rect is on-screen**; on a miss, fall through to the existing `back` cover-slide. The existing cover-slide already reads great as "close," so forward-only is the safe, high-impact cut.

---

## 2. RANKED OPPORTUNITY MAP (impact-per-effort)

| # | Opportunity | UX effect | Type | Effort | Risk | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Card → detail expand (forward)** | Thumbnail lifts & grows into the detail hero; body pops in behind. Covers home/products/related/wishlist from one closure | hero-morph | M | Low–M | **BUILD — the ask, flagship** |
| 2 | **Wishlist remove FLIP** | Heart tap → card fades, rest glide up | state-micro | XS | Low | **BUILD — near-free (1 line), best impact:effort** |
| 3 | **Cart item remove FLIP** | Trash/qty-to-0 → row collapses, rows below glide up, totals settle | state-micro | S | Low | **BUILD — makes cart feel alive, reuses list mode, 0 new CSS** |
| 4 | Nav active-tab pill | Pill slides between tabs on route change | state-micro | S | Low | **BUILD as plain CSS transform, NOT a VT** (see G3) |
| 5 | Services rows / home tiles → refill & used-sale forms | Row/tile surface unfolds into the form's hero band; fields fade in beneath | container | M | Low | Build after 1–3 (needs 2 hero-band dests authored) |
| 6 | Cart summary → checkout summary | Totals card travels across the route ("the number is still here") | container | S | Low | Build — twin geometry, no new dest to design |
| 7 | Address delete FLIP | Card collapses, list reflows | state-micro | S | Low | Free once the FLIP helper exists; low frequency |
| 8 | Auth OTP phone→code step slide | Wizard step slides fwd/back instead of instant swap | state-micro | M | Low–M | Nice; needs the `min-height` anti-morph pin |
| 9 | Detail → card reverse morph | Hero shrinks back into its card | hero-morph | M | M | Fast-follow to #1; needs on-screen miss-fallback |
| 10 | In-sheet address pick-list → form | Dashed "+add"/row morphs into the form's first field as the sheet re-heights | container | M | Low–M | Polish; keep morph on inner content, not the panel |
| 11 | Discount-applied totals reveal | Green discount row slides in, total settles | state-micro | S | — | Marginal — a CSS `grid-rows 0fr→1fr` reveal is as good |
| — | Filter-funnel / addresses-FAB → sheet | Button expands into the bottom sheet | container | M | Med-High | **Skip the morph** — source persists under sheet → ghost; VT-wrap the existing slide-up instead (G4) |
| — | Add-to-cart "fly to cart" | Thumbnail arcs to the cart badge | — | L | High | **Not a VT** — WAAPI ghost clone (G1) |
| — | Success / formSuccess checkmark | Check draws in on arrival | — | S | — | **Not a VT** — CSS keyframe, no old state to morph (G2) |
| — | Qty stepper number roll | — | — | — | — | **Never VT** — rapid-fire, single-active-VT degrades it (G1) |

---

## 3. TOP 3 TO BUILD NEXT

**① Card → detail expand (flagship).** Add `openMorph(pid,e)` next to `vtState`. Change `vm(p).open` (script L~300) from `() => this.go({route:'detail',pid:p.id,qty:1})` to `(e) => this.openMorph(p.id,e)`. Markup edits: add `data-pid="{{ item.id }}"` to every card, `data-hero-img` to the detail hero div (L178, the 220px gradient stage). Mode CSS:
```css
html[data-vt="hero"]::view-transition-group(root),
html[data-vt="hero"]::view-transition-old(root),
html[data-vt="hero"]::view-transition-new(root){ animation-duration:1ms; }
html[data-vt="hero"]::view-transition-group(hero-img){
  animation-duration:var(--dur-slow); animation-timing-function:var(--ease-emphasized); z-index:20; }
```
JS lifecycle exactly as §1: name thumbnail before → `setState` + `scrollTo(0,0)` + name `[data-hero-img]` in callback → clear in `.finished`. `_morphBusy` guard; reduced-motion → `this.go(patch)`. Do NOT put a static `view-transition-name` on the hero — it would get pulled out of root and **break the theme-circle reveal while on the detail page** (constraint 2). ~10-min spike before committing: confirm the 72px-square → 220px-band gradient stretch looks right (benign because both are the same `radial-gradient`; add `object-fit:cover` when real photos land).

**② FLIP family — cart remove + wishlist remove (one helper).** Generalize `vtState` into `vtFlip(mutation, sel, prefix)` reusing the shipped `data-vt="list"` mode — **zero new CSS**. *Wishlist (XS):* wishlist cards already render via `vm(p)` and get `data-pid` from edit #1, so change the last line of `vm.unwish` from `setState` to `this.vtFlip({wish:w}, '[data-pid]', 'p-')`. `p-<id>` can't collide with the products list (different routes, never co-mounted). *Cart (S):* add `data-cid="{{ ci.id }}"` to the cart row (L267), add `id` to each `cartItems` object (L493), and route `ci.remove` and the `qty≤1` delete branch of `ci.dec` through `this.vtFlip({cart:c}, '[data-cid]', 'c-')`. Keep the plain `qty-1` decrement as `setState` (number-only, no reflow). Removed row has an old snapshot only → default fade; survivors glide. Same helper then unlocks address-delete (#7) for free.

**③ Services / home → form expand (container morph).** Add the general `expandTo(patch, srcSel, dstSel)` primitive (sibling of `vtState`; single fixed name `'expander'`, safe because one VT runs at a time and it's always cleared) with new mode `data-vt="expand"` that **crossfades root** (here the whole form body must appear, so crossfade is correct — opposite of the card `hero` mode):
```css
html[data-vt="expand"]::view-transition-old(root){ animation:expandFadeOut var(--dur-slow) var(--ease-standard) both; }
html[data-vt="expand"]::view-transition-new(root){ animation:expandFadeIn  var(--dur-slow) var(--ease-standard) both; }
html[data-vt="expand"]::view-transition-group(expander){
  animation-duration:var(--dur-slow); animation-timing-function:var(--ease-emphasized); z-index:20; }
@keyframes expandFadeOut{ to{opacity:0} } @keyframes expandFadeIn{ from{opacity:0} to{opacity:1} }
```
Reroute `goRefill`/`goUsed` to `this.expandTo({route:'refill',…}, '[data-morph="refill"]', '[data-morph-dst="refill"]')`. Markup: `data-morph="refill"` on both the services row (L361) and home tile (L67) — a single selector resolves whichever is mounted; replace each form's plain title row (L390) with a **hero band carrying `background:var(--sur)` + border + radius matching the source** (this solid tinted surface is what makes it read as an *expand* not a fade) tagged `data-morph-dst="refill"`. Same for `used`. Cart→checkout summary morph (#6) uses the identical primitive between the twin summary cards (L291 ↔ L582) — reroute only the logged-in branch of `goCheckout`, leave guest→auth untouched.

---

## 4. GUARDRAILS

**G0 — THE BUILD GATE (blocks all card work).** `grep -c data-pid markup_current.html` = **0** today. `data-pid` is injected by `markup_edits.json`, but the cards now carry `tabindex="0" role="button"` between `<div` and `onclick`, so the *old* find string no longer matches current markup — **the shipped list FLIP is silently a no-op right now** (filters hard-swap). Before building #1–#3, fix the `data-pid` edit's `find` to match the live markup and confirm it lands in the *built* DOM. Mirror this check when adding `data-cid`/`data-aid`. The card-expand, both FLIPs, and the reverse morph all depend on it.

**G1 — Fly-to-cart & qty stepper: plain animation wins, never VT.** Single-active-VT means a second `startViewTransition` while one is in flight *skips* the first (instant swap) — fatal for rapid-fire "+" taps and steppers. And a VT morph *replaces* the source, so it can't leave the thumbnail in the list *and* fly a ghost. Use a self-contained cloned-node WAAPI arc to `[data-cart-badge]` (compose with the existing `pop('[data-cart-badge]',badgePop)` that fires as it lands). Qty number = plain `setState` + optional cheap `pop()` scale, nothing more.

**G2 — Success checkmark & sheet open/close: CSS, not VT.** The check is fresh arrival content with no old state to morph from — a `checkDraw`/`checkCircPop` stroke keyframe is the right tool. Sheets already have a good `sheetIn` keyframe; a true morph forces the ghost problem (G4) for zero gain.

**G3 — Nav pill: CSS transform on the reused node, not a VT.** The nav renders at top level on every route so the runtime reuses the same DOM node → an absolutely-positioned pill with `transform` bound to `TAB_ORDER.indexOf(activeKey)` simply CSS-transitions between tabs (verify the RTL sign: index 0 = rightmost). This sidesteps the constraint-2 footgun entirely: the pill lives inside the named `emdad-nav` group, so a *static* `view-transition-name` on it would get promoted to its own group, fight every route cover-slide, and need nulling in theme mode (`html[data-vt="theme"] [data-navpill]{view-transition-name:none!important}`). The feasibility lens argued the static-name version is workable; the plain-CSS version is strictly simpler and more robust — **prefer it.**

**G4 — Persistent-source sheets (funnel, addresses FAB): don't morph.** The page stays mounted under the sheet, so the button persists in the new DOM → the root repaints it *while* the `expander` group flies a second copy → visible double-image. The only fix is `visibility:hidden` on the source for the sheet's entire lifetime plus a reverse close-morph — a resting-UX change and double the code. Instead VT-wrap the existing slide-up (name the panel, `translateY(100%)→0` keyframe, root crossfades the scrim) so it joins the motion system without the ghost. The in-sheet pick→form morph (#10) is clean because the pick-list *unmounts* when the form mounts.

**Composition with shipped transitions (no conflicts):**
- **`hero` vs cover-slide:** both could fire on a card tap → they *branch*. Card tap → `hero`; every other nav keeps the cover-slide. `openMorph` sets its own `data-vt`, no overlap.
- **`hero`/`expand` vs list FLIP:** never co-fire (a tap either filters or opens) and use disjoint names (`hero-img`/`expander` vs `p-<id>`). `vtState` clears `p-<id>` in `.finished`, so the DOM is clean between them. Mid-list-transition taps rely on the runtime skipping overlapping VTs (optionally debounce) — low.
- **`hero` vs theme reveal:** the hero is temporary-named (cleared in `.finished`), so it never exists at capture time during an unrelated theme toggle → can't be hijacked. This is *why* it must never carry a static name.
- **Universal discipline for every new helper:** open with the `matchMedia('(prefers-reduced-motion: reduce)')` guard → plain `setState`/`go`; keep `view-transition-name` unique at both capture points; clear names in `.finished`; flip the visible change synchronously in the callback, never `await` React before pseudo capture. All new modes inherit the global reduced-motion backstop (CSS L178–181).

**Ship order:** ① card-expand (forward) → ② wishlist FLIP (1 line) → ③ cart FLIP → then nav pill (CSS) + services/home→form expand + cart→checkout twin → then address FLIP, auth step slide, reverse morph as fast-follows.