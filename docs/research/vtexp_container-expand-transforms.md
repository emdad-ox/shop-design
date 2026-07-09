Analysis complete. The checkout route confirms the cleanest cart→checkout target: its order-summary card (lines 582–590) is a structural twin of the cart summary card (lines 291–299). Here is my lens output.

---

# CONTAINER / EXPAND TRANSFORMS — VT opportunity map

**One discriminator ranks this entire lens: a container morph is clean iff the source element UNMOUNTS in the destination state.** If the source unmounts (route change, or an `sc-if` content swap), there is no duplicate and the morph is a straight compose of two already-shipped mechanisms (`nav`'s full-root crossfade + `vtState`'s temporary per-element name). If the source PERSISTS under an overlay (funnel/FAB under a sheet), you get a second ghost copy and the only fix (`visibility:hidden` the source for the sheet's whole lifetime) changes the resting UX — that is the real feasibility downgrade, not the diagonal distance.

Everything below reuses **one shared primitive + one CSS mode**, added once:

```js
// script_2.work.js — sibling of nav()/vtState(). Morph srcSel (OLD DOM) into dstSel (NEW DOM).
// Single fixed group name 'expander' is safe: only one VT runs at a time and it's always cleared.
expandTo(patch, srcSel, dstSel, opts) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce) { this.go(patch); return; } // go() self-guards
  const src = document.querySelector(srcSel);
  if (src) src.style.viewTransitionName = 'expander';                 // OLD snapshot: source named (unique)
  document.documentElement.dataset.vt = 'expand';
  const t = document.startViewTransition(() => new Promise(res => {
    this.setState(patch, () => {                                      // synchronous flip in-callback (constraint #4)
      if (src) { src.style.viewTransitionName = '';                  // clear source name (constraint #1/#2)
                 if (opts && opts.hideSrc) src.style.visibility = 'hidden'; } // persistent-source only
      const dst = document.querySelector(dstSel);
      if (dst) dst.style.viewTransitionName = 'expander';            // NEW snapshot: dest named (unique)
      res();
    });
  }));
  t.finished.finally(() => {
    const dst = document.querySelector(dstSel);
    if (dst) dst.style.viewTransitionName = '';
    if (document.documentElement.dataset.vt === 'expand') delete document.documentElement.dataset.vt;
  });
}
```

```css
/* style_3.work.css — new mode. Root CROSSFADES (page swaps / scrim fades in), the shared
   'expander' group morphs source-rect -> dest-rect via the runtime's default group animation
   (interpolates transform+width+height; old/new contents crossfade). Nav (emdad-nav) is
   present both sides so it morphs in place — same as forward/back, no special handling. */
html[data-vt="expand"]::view-transition-old(root){ animation: expandFadeOut var(--dur-slow) var(--ease-standard) both; }
html[data-vt="expand"]::view-transition-new(root){ animation: expandFadeIn  var(--dur-slow) var(--ease-standard) both; }
html[data-vt="expand"]::view-transition-group(expander){
  animation-duration: var(--dur-slow);
  animation-timing-function: var(--ease-emphasized);
  z-index: 20;                     /* float the morphing surface above both crossfading pages */
}
@keyframes expandFadeOut{ to{ opacity:0 } }
@keyframes expandFadeIn { from{ opacity:0 } to{ opacity:1 } }
```

**Critical design note on the destination:** the morphing group only *reads* as an expand if the destination element has a **solid/tinted surface background** (so the eye sees a surface growing). Naming a transparent full-page wrapper produces a plain fade, not an expand — so every destination below is a compact **hero band with `background:var(--sur)`**, not the whole screen. The rest of the destination fades in via the root crossfade underneath.

---

## TIER 1 — clean (source unmounts). Build these.

### 1. SERVICES cards → refill / used-sale forms  ·  **highest value, most natural**
- **(a) UX:** Tapping a full-width service row (lines 361 / 371) — icon chip + title + chevron — the row's surface **grows downward and out into a matching hero at the top of the form screen**; the form fields (photos, gas chips, delivery, phone) fade in beneath. Reads as the row unfolding into its form. This is the canonical "list-row expands to screen."
- **(b) Elements/routes:** `services` → `refill` (DEPTH 0→1) and `services` → `usedSale`. Source rows fire `goRefill` / `goUsed`.
- **(c) Naming/mode:** name = `'expander'`, mode `data-vt="expand"`. Source = the tapped `<button>`; dest = an added hero band. Because only one route mounts at a time, a single selector `[data-morph="refill"]` resolves whichever source (services row OR home tile, item 2) is on screen.
- **(d) Effort/Risk:** **M / Low.** New method is proven-pattern; only genuinely new work is authoring the two hero bands.
- **(e) Implementation:**
  - JS: change `goRefill`/`goUsed` in `renderVals()` from `() => this.go({route:'refill', rfPhone:…})` to:
    `() => this.expandTo({ route:'refill', rfPhone: logged ? s.phone : s.rfPhone }, '[data-morph="refill"]', '[data-morph-dst="refill"]')` (and `used` analogously).
  - Markup (via `markup_edits.json` find/replace, exactly like the proven `data-cart-badge` / `data-pid` edits): add `data-morph="refill"` to the services refill `<button>` (line 361) and home refill tile (line 67); `data-morph="used"` to lines 371 / 74.
  - Markup dest: replace each form's plain title row (refill line 390, used line 473) with a **hero band** carrying `data-morph-dst="refill"`, e.g. `<div data-morph-dst="refill" style="display:flex;gap:14px;align-items:center;background:var(--sur);border:1px solid var(--line);border-radius:20px;padding:16px;margin-bottom:16px">` containing the back button + the same acc-soft icon chip + title used on the source row. Matching the source's `var(--sur)` + radius is what sells the morph.

### 2. HOME quick-action tiles → refill / used-sale forms
- **(a) UX:** Same morph as #1 from the two home grid tiles (lines 67 / 74). A ~½-width tile expands into the form hero. Slightly more dramatic scale-up than the full-width services row.
- **(b) Elements/routes:** `home` → `refill` / `usedSale`. Same `goRefill`/`goUsed` handlers, so **#1 and #2 ship together for free** — the tiles just get the same `data-morph` attributes and reuse the same hero dests.
- **(c) Naming/mode:** identical to #1 (`'expander'`, `data-vt="expand"`, `[data-morph="refill"]` / `[data-morph-dst="refill"]`).
- **(d) Effort/Risk:** **S / Low** (once #1's method + heroes exist, this is two markup attributes).
- **(e):** add `data-morph` attrs to lines 67 / 74 as above. No JS beyond #1.

### 3. CART summary card → CHECKOUT summary card  ·  **lowest risk, best "continuity" read**
- **(a) UX:** Not the CTA button — the **totals card travels with you**. The cart's price-summary box (جمع اقلام / تخفیف / مبلغ قابل پرداخت, lines 291–299) morphs across the route into the checkout's near-identical order-summary box (lines 582–590). Because the two cards are the same width, radius, and content shape, this is a barely-there, premium "the number you were looking at is still here" morph while the surrounding checkout fields fade in.
- **(b) Elements/routes:** `cart` → `checkout` (DEPTH 0→1), triggered by `goCheckout` (line 308 button). Only on the logged-in branch — keep the guest→auth branch untouched.
- **(c) Naming/mode:** `'expander'`, `data-vt="expand"`. Source = cart summary div (line 291); dest = checkout summary div (line 582). Twin geometry ⇒ minimal distortion, no hero authoring needed.
- **(d) Effort/Risk:** **S / Low.** Both cards already exist with matching surfaces; nothing new to design.
- **(e):**
  - JS: in `goCheckout`, replace the logged path `else this.go({ route: 'checkout' })` with `else this.expandTo({ route:'checkout' }, '[data-morph="cart-sum"]', '[data-morph-dst="cart-sum"]')`.
  - Markup: add `data-morph="cart-sum"` to line 291's div; `data-morph-dst="cart-sum"` to line 582's div. (Scrolled-cart is fine — VT uses live viewport rects.)

### 4. In-sheet swap: address PICK-list / "+ افزودن آدرس جدید" → address FORM
- **(a) UX:** Inside the already-open address sheet, tapping "+ افزودن آدرس جدید" (line 882) or an existing row → the dashed button/row **morphs into the form's first field group** as the sheet re-heights from list to form. Content swap feels like a zoom-in, not a hard cut.
- **(b) Elements/routes:** pure state change `addrSheet:'pick' → 'form'` (no route). The `sc-if addrPickMode` block **unmounts** when `addrFormMode` mounts ⇒ source unmounts ⇒ clean.
- **(c) Naming/mode:** `'expander'`, `data-vt="expand"`. Root crossfade of the static page behind is invisible; the sheet's own unnamed content crossfades while the named source→dest morphs. Wrap `openAddrForm()` (defined in `renderVals`, called by `openAddrFormNew` and `ad.edit`) in an `expandTo`-style VT: name the source (`[data-morph="addr-add"]` on line 882's button, or the tapped row) and dest (`[data-morph-dst="addr-form"]` on the form's title/first `<label>` wrapper, line 885).
- **(d) Effort/Risk:** **M / Low-Med.** Slight wrinkle: the sheet panel resizes during the swap; keep the morph on the inner content block (not the whole panel) so the panel's own height reflow stays smooth. The panel's inline `sheetIn` doesn't re-trigger (state stays `open`).
- **(e):** small dedicated wrapper (openAddrForm doesn't change route, so call `startViewTransition` directly with the same set→flip→re-set→clear shape as `expandTo`, mode `expand`). Markup: `data-morph="addr-add"` on line 882; `data-morph-dst="addr-form"` on the form container at line 884.

---

## TIER 2 — persistent source (ghost risk). Feasible, but honestly downgraded.

### 5. Filter funnel button → filter sheet
- **(a) UX (intended):** the round funnel button (line 118, top-right of Products) expands into the فیلتر و مرتب‌سازی bottom sheet.
- **(b) Elements/routes:** state `sheet:false → true`; the Products page **stays mounted under the sheet**, so the funnel button persists in the new DOM.
- **(c) Naming/mode + the honest problem:** with plain `data-vt="expand"`, root crossfade re-paints the funnel at top-right **while** the `'expander'` group flies a second copy down into the sheet ⇒ visible double-image. Freezing root does **not** fix it (frozen new-root still paints the funnel). The **only** fix is `opts.hideSrc` — `visibility:hidden` the funnel — but that means the funnel must stay hidden **for the entire time the sheet is open**, and you must run a **reverse morph on close** (sheet → funnel, restoring visibility in `finished`). That changes the resting UX (funnel absent while the filter sheet is up) and doubles the code (open + close paths).
- **(d) Effort/Risk:** **M / Med-High.** Not the diagonal distance (Material FAB morphs travel further and read fine) — the cost is the persistent-source hide + reverse-morph bookkeeping.
- **(e):** if built: `openSheet`/`closeSheet` each wrap their setState in a VT; open uses `expandTo(..., {hideSrc:true})` with src `[data-morph="funnel"]` (line 118), dst the sheet panel (line 843); close names sheet→funnel and clears `visibility` in `finished`. **Recommendation:** skip the morph. The higher-value, zero-risk win here is to simply *wrap the existing slide-up in a VT* (name the panel as an enter-group with a `translateY(100%)→0` keyframe + let root crossfade the scrim) so the sheet joins the transition system and honors reduced-motion centrally — keeps today's resting UX intact.

### 6. Addresses FAB "افزودن آدرس" → address sheet
- Identical situation to #5: the FAB (line 756) persists on the Addresses screen under the sheet. Same ghost, same `hideSrc` + reverse-morph requirement, same **M / Med-High**. Same recommendation: prefer the plain VT-wrapped slide-up over a true morph, **unless** you're willing to hide the FAB while the sheet is open. Note #4 already gives the satisfying in-sheet morph once the sheet is open, which covers most of the perceived polish without the ghost.

---

## Out-of-lens note (flagged, not owned here)
**Search field → results:** in this app the search input (line 116, `onQ`) filters the *same-page* `items` list — there is no navigation, so it is not a container transform. The correct VT here is a **list FLIP**: route `onQ` through the existing `vtState({ q: … })` instead of plain setState, exactly like the cat-chip/sort/stock filters already do. That belongs to the smart-list lens; I mention it only so it isn't mistaken for an expand.

---

## Feasibility summary
- **Tier 1 (items 1–4) are high-confidence**, not speculative: they compose `nav()`'s root crossfade with `vtState()`'s temporary-name trick, both already shipped and stable in this codebase. Ship order: **3 (twin cards, trivial) → 1+2 (one method + two heroes, highest impact) → 4 (in-sheet polish)**.
- The single new design artifact across all of Tier 1 is the **destination hero band with a `var(--sur)` background** — required for the morph to read as an expand rather than a fade.
- **Tier 2 (5–6) should default to a VT-wrapped slide-up, not a true morph**, because the source persists under the sheet and a real morph forces `visibility:hidden` on the source for the sheet's lifetime plus a reverse close morph — a resting-UX change, not a free animation.
- All items inherit the existing global reduced-motion guard (`expandTo` falls back to `this.go(patch)`), keep `view-transition-name` unique at both capture points, and clear names in `finished` — satisfying constraints #1–#6.

Files: source to edit is `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js` (add `expandTo`; reroute `goRefill`/`goUsed`/`goCheckout`/`openAddrForm`), `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css` (add `data-vt="expand"` mode), and markup hooks via `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_edits.json` (add `data-morph`/`data-morph-dst` attributes + the two hero bands).