I have everything I need — all technical claims verified against the actual code, and the advisor confirmed the structure and caught one real trap (the auth-step size-morph), which I've folded in. Here is the analysis.

---

# State-change & micro View-Transitions — Emdad Oxygen

Files: JS `…/scratchpad/script_2.work.js` · CSS `…/scratchpad/style_3.work.css` · markup `…/scratchpad/markup_current.html` (+ `markup_edits.json`).

## The one mechanic that unlocks most of this
The existing `vtState()` + `html[data-vt="list"]` mode (script_2.work.js:202-211, style_3.work.css:140-142) is already a **general scoped-FLIP engine**: it temporarily names a set of elements, freezes root to 1ms, runs the transition, clears names in `finished`. Almost every *high-value* win in this lens is "point that same engine at a different list" — **zero new CSS**. That's the through-line below.

**Recurring caveat (state it honestly wherever a FLIP is used):** only one `startViewTransition` can run at a time — a second call while one is in flight **skips** the first (instant swap). So two rapid removes/toggles in <~350ms will snap instead of animate. Acceptable for these low-frequency actions; it's also the reason fly-to-cart and the qty stepper (both rapid-fire) should NOT be VTs. All entries fall back to plain `setState` under `prefers-reduced-motion` (copy the guard from `vtState`).

---

## TIER 1 — VT is exactly the right tool (a real layout change to carry continuity across)

### 1. Cart item remove → list FLIP + reflow  ⟵ FLAGSHIP · effort S–M · risk low
**(a) UX:** tap trash (or step qty to 0); that row fades/collapses out and the rows below **glide up** to close the gap; the totals footer settles. Same physical language as the product-filter FLIP, so it feels native to the app.
**(b) Where:** `isCart` route, the `cartItems` rows (markup_current.html:266-282). Handlers `ci.remove` (line 504) and `ci.dec` at qty≤1 (lines 500-503).
**(c) Naming/mode:** reuse `data-vt="list"` (no new CSS). Name each visible row `c-<id>` for the transition, freeze root so only rows animate; removed row has an old snapshot only → default `::view-transition-old` fade; survivors morph to new positions.
**(d)** New CSS: none. New markup hook + one helper + two handler edits.
**(e) Implementation:**
- Markup: add `data-cid="{{ ci.id }}"` to the row `<div>` at markup_current.html:267.
- `renderVals` cartItems map (line 493): add `id` to each object (`id,` alongside `title`).
- Add a helper next to `vtState` (near line 211) — it's `vtState` with a different selector/prefix, reusing the *same* list mode:
```js
vtCart(mutation) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce) { this.setState(mutation); return; }
  const name  = () => document.querySelectorAll('[data-cid]').forEach(el => { if (el.dataset.cid) el.style.viewTransitionName = 'c-' + el.dataset.cid; });
  const clear = () => document.querySelectorAll('[data-cid]').forEach(el => { el.style.viewTransitionName = ''; });
  name();
  document.documentElement.dataset.vt = 'list';               // REUSE existing mode
  const t = document.startViewTransition(() => new Promise(res => this.setState(mutation, () => { name(); res(); })));
  t.finished.finally(() => { clear(); if (document.documentElement.dataset.vt === 'list') delete document.documentElement.dataset.vt; });
}
```
- Handlers: `remove: () => { const c={...s.cart}; delete c[id]; this.vtCart({ cart:c }); }` and in `dec`, wrap **only** the delete branch (`qty<=1`) with `this.vtCart({cart:c})`; keep the `qty-1` decrement as plain `setState` (number-only, no reflow → not worth a VT).
- Note: `vtState` and `vtCart` are near-identical; you can generalize to `vtFlip(mutation, sel, prefix)` and have both callers delegate.
- Edge: removing the **last** item swaps to the empty-state block and drops the footer — those live in frozen root, so they snap in instantly under the row's fade. Fine.

### 2. Wishlist remove → FLIP  ⟵ BEST impact:effort in the lens · effort **XS** · risk low
**Quick win — essentially one line.** The global markup_edit on `<div … onclick="{{ item.open }}">` already gave **wishlist cards `data-pid`** (they render via the same `vm(p)`), and `vm.unwish` is the *only* wishlist-route remover (detail's `toggleWish` doesn't reflow a list). So `vtState` already targets them.
**(a) UX:** tap the heart on a wishlist row → it fades out, the rest glide up.
**(b) Where:** `isWishlist` route, `unwish` control (markup_current.html:831), handler in `vm` (script_2.work.js:303).
**(c) Naming/mode:** reuses `p-<id>` + `data-vt="list"`, unchanged. (`p-<id>` collides with the products list only if both are on-screen — they never are; different routes.)
**(d)** No new CSS, no new markup.
**(e):** change the last line of `vm.unwish` from `this.setState({...})` to:
```js
unwish: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const w = { ...this.state.wish }; delete w[p.id]; this.vtState({ wish: w }); }
```
Lead the shipping list with #1 for impact, but flag #2 as the near-zero-cost quick win right after it.

### 3. Address delete → FLIP  ⟵ bonus, same pattern · effort S · risk low
**(a) UX:** deleting an address card (Addresses route) collapses it and reflows the list; when it also changes the default, the remaining default badge state snaps under the FLIP.
**(b) Where:** `isAddresses`, `addrCards` rows (markup_current.html:762-796), `deleteAddr` (script_2.work.js:391-400).
**(c) Naming/mode:** add `data-cid`-style hook `data-aid="{{ ad... }}"` on the card and a `vtFlip(patch,'[data-aid]','a-')` call (or generalized helper). Reuse `data-vt="list"`.
**(d)** No new CSS; one markup hook + route `deleteAddr` through the flip helper. `addrCards` already lacks an id field in the vm — add `id: a.id`.
**(e):** wrap the `setState(patch)` in `deleteAddr` with the flip helper; the "at least one address" guard/toast stays. Lower priority than 1–2 (less frequent), but free once `vtFlip` exists.

### 4. Auth OTP step change → scoped directional slide  ⟵ effort M · risk low–med
**(a) UX:** on "دریافت کد تأیید", the phone block slides out toward the page edge and the 6-digit code block slides in — a real wizard "step forward"; "ویرایش شماره" slides back. Reinforces 2-step progress; currently an instant `sc-if` swap.
**(b) Where:** `isAuth` route, the two step blocks (markup_current.html:324-353). Triggers: `sendOtp` (script_2.work.js:319, forward), `editPhone` (line 680, back).
**(c) Naming/mode:** the two steps never coexist (`sc-if`), so wrap them in one stable container and give **it** a temporary name `auth-step`; freeze root (same idea as list mode); slide `::view-transition-old/new(auth-step)`. New mode `data-vt="step-fwd" | "step-back"`.
**⚠ Size-morph trap (must handle):** phone-step and code-step are different heights → a shared-name group would interpolate its box old→new and **warp/squish** both snapshots under the slide (worsened because frozen root snaps to the new height instantly). Fix: **pin the container to a fixed `min-height` (≈210px)** so old box == new box → pure slide, no distortion. (Alternative if you don't want a fixed height: name the phone block old-side-only and the code block new-side-only — no pairing, no morph — but that's more code.)
**(d)** New CSS mode + 4 keyframes; one markup wrapper; one helper; two handler edits.
**(e):**
- Markup: wrap both step `sc-if`s: `<div data-auth-step style="min-height:210px">` … `</div>`.
- Helper:
```js
stepVT(patch, dir) {  // dir: 'fwd' | 'back'
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce) { this.setState(patch); return; }
  const el = document.querySelector('[data-auth-step]'); if (el) el.style.viewTransitionName = 'auth-step';
  document.documentElement.dataset.vt = 'step-' + dir;
  const t = document.startViewTransition(() => new Promise(res => this.setState(patch, res)));
  t.finished.finally(() => { if (el) el.style.viewTransitionName = ''; if (document.documentElement.dataset.vt === 'step-'+dir) delete document.documentElement.dataset.vt; });
}
```
- `sendOtp`: replace its `setState({authStep:'code',…})` with `this.stepVT({authStep:'code', authErr:'', otp:''}, 'fwd')` then `startCountdown()`/`toast` after (or in the `finished` chain). `editPhone`: route its `setState` through `this.stepVT({…}, 'back')`.
- CSS (matches the app's existing forward=incoming-from-negative-X convention, style_3.work.css:128-135):
```css
html[data-vt^="step-"]::view-transition-group(root),
html[data-vt^="step-"]::view-transition-old(root),
html[data-vt^="step-"]::view-transition-new(root){ animation-duration:1ms; }
html[data-vt^="step-"]::view-transition-old(auth-step),
html[data-vt^="step-"]::view-transition-new(auth-step){ animation-duration:var(--dur-base); animation-timing-function:var(--ease-emphasized); }
@keyframes stepInFwd { from{transform:translateX(-22px);opacity:0} to{transform:none;opacity:1} }
@keyframes stepOutFwd{ from{transform:none;opacity:1} to{transform:translateX(22px);opacity:0} }
@keyframes stepInBack{ from{transform:translateX(22px);opacity:0} to{transform:none;opacity:1} }
@keyframes stepOutBack{from{transform:none;opacity:1} to{transform:translateX(-22px);opacity:0} }
html[data-vt="step-fwd"]::view-transition-new(auth-step){ animation-name:stepInFwd }
html[data-vt="step-fwd"]::view-transition-old(auth-step){ animation-name:stepOutFwd }
html[data-vt="step-back"]::view-transition-new(auth-step){ animation-name:stepInBack }
html[data-vt="step-back"]::view-transition-old(auth-step){ animation-name:stepOutBack }
```
Same-route trigger, so no concurrency clash with route VTs.

---

## TIER 2 — VT *works* but a plain animation is as good or better (use the alternative)

### 5. Add-to-cart "fly to cart" → use a WAAPI ghost clone, NOT a VT · effort M · risk low
This is the marquee ask, but **VT is the wrong tool here** and I'd push back on doing it as one:
- No real layout change to capture — you'd be *fabricating* a flyer, which is not VT's sweet spot.
- **Single-active-VT** kills it: tapping "+" on several cards quickly → each add starts a VT that skips the previous one → dropped animations. Independent clones just stack.
- The badge lives inside `emdad-nav` (a named element); a `view-transition-name` on a descendant gets **promoted to its own top-level group** (pulled out of the nav snapshot), so you'd also have to suppress it in every custom mode (theme, etc.) — the constraint-#2 footgun.
- Thumbnails are gradient placeholders (no real product image), so the VT payoff is blunted anyway.

**Recommended: a self-contained clone that arcs to the cart tab, composing with the existing `badgePop`** (script_2.work.js:276):
```js
flyToCart(e, id) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { this.addToCart(id, 1); return; }
  const thumb = e.currentTarget.closest('[data-pid]')?.querySelector('[data-thumb]');
  const target = document.querySelector('[data-cart-badge]') || document.querySelector('[data-nav="cart"]');
  if (!thumb || !target) { this.addToCart(id, 1); return; }
  const a = thumb.getBoundingClientRect(), b = target.getBoundingClientRect();
  const g = thumb.cloneNode(true);
  Object.assign(g.style, { position:'fixed', margin:0, left:a.left+'px', top:a.top+'px', width:a.width+'px', height:a.height+'px', borderRadius:'12px', zIndex:60, pointerEvents:'none' });
  document.body.appendChild(g);
  const dx = (b.left+b.width/2)-(a.left+a.width/2), dy = (b.top+b.height/2)-(a.top+a.height/2);
  g.animate([
    { transform:'translate(0,0) scale(1)', opacity:1, offset:0 },
    { transform:`translate(${dx*0.5}px,${dy*0.5 - 40}px) scale(.7)`, opacity:1, offset:.6 },  // arc apex
    { transform:`translate(${dx}px,${dy}px) scale(.12)`, opacity:.2, offset:1 }
  ], { duration:520, easing:'cubic-bezier(.5,-0.2,.7,1)' }).finished.finally(() => g.remove());
  this.addToCart(id, 1);   // badgePop fires as the ghost lands
}
```
Hooks: add `data-thumb` to the thumbnail div (markup_current.html:133 list, :268 detail-related) and `data-nav="cart"` on the cart nav button as a first-add fallback (badge only exists when count>0). Wire `item.add`/`addFromDetail` to `flyToCart(e,id)`. Arc via the mid keyframe; fully tunable, no VT concurrency issues. **If** you insist on the VT version: name the tapped thumb `flyer` old-side, name the badge `flyer` new-side (clear the thumb's name in the callback so it isn't double-named) — but ship the clone.

### 6. Discount applied → totals recompute · effort S · risk low · **value marginal**
**(a) UX:** applying `EMDAD10` inserts the green discount row (markup_current.html:293-296) and drops the payable total. A VT could slide the row in + settle the total.
**Verdict:** a real but tiny layout change. A CSS `grid-template-rows: 0fr→1fr` reveal on the row (plus the existing toast) reads just as well and avoids a VT for a one-shot. If you want it in-system, reuse `data-vt="list"`: temporarily name the discount row + total container, freeze root, let them glide. Low priority — do it only if you're already touching the checkout totals. Don't VT the raw *number* on every qty change (see #8).

---

## TIER 3 — VT is OVERKILL here; keep/return to plain CSS (protect against motion overload)

### 7. Bottom-nav active-tab indicator pill → **CSS transform, not VT** · effort M · risk low
A morphing "nav-indicator" pill is a genuine shared-element case, but **VT is the wrong tool**: tab switches *are route changes* already running the root cover-slide, and the pill lives inside `emdad-nav` → a name on it is promoted to its own group and would fight the route transition, plus it'd need a persistent name suppressed per custom mode (theme). The nav renders at top level (markup_current.html:911) on every route, so the runtime **reuses the same DOM node** → an inline `transform` bound to the active index simply **tweens via CSS transition**. Cleaner, robust, composes with everything.
**Build:** add one absolutely-positioned pill in the nav container (outside the `sc-for`), width `20%`, `transition: transform .32s var(--ease-spring)`. In `renderVals` compute `navActiveIndex = this.TAB_ORDER.indexOf(activeKey)` and bind a `navPillStyle` that sets `transform: translateX(calc(var(--i) * -100%))` with `--i:<index>` (RTL: index 0 = rightmost, so the offset is negative/physical-left as index grows — verify sign against the live RTL layout). No VT, no new mode.

### 8. Quantity stepper number "roll" → **keep instant / tiny CSS pop, never VT** · risk: VT would *hurt*
The qty number changing is text with no reflow. VT is overkill **and actively risky**: steppers are rapid-fire, and single-active-VT means fast taps queue/skip → a stepper that feels laggy. Keep `inc/dec` as plain `setState`. Optional flourish: a cheap non-VT scale-pop on the number via the existing `pop()` helper (script_2.work.js:233) targeting a `[data-qty]` span with a `numPop` keyframe — restarts cleanly on each tap. That's the ceiling; don't go further.

### 9. Cart-badge pop & wishlist-heart pop → already correct, keep as-is
`addToCart` → `pop('[data-cart-badge]','badgePop…')` and `toggleWish` → `pop('[data-wish-heart]','heartPop…')` (script_2.work.js:276, 625; keyframes style_3.work.css:174-175) are one-shot CSS on persistent elements. This is precisely where VT is the wrong tool (no snapshot needed). No change.

### 10. Success / formSuccess checkmark → **CSS entrance, not VT** · effort S · risk none
The route *into* success is already the cover-slide VT; the checkmark is fresh content with **no old state to morph from**, so VT can't apply. Add a self-contained stroke-draw as an arrival flourish (replaces the plain `fadeIn` at markup_current.html:601):
```css
@keyframes checkCircPop{ 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
@keyframes checkDraw{ from{stroke-dashoffset:30} to{stroke-dashoffset:0} }
```
Apply `animation:checkCircPop .5s var(--ease-spring) both` to the circle (line 602) and, on the check `<path d="M4 12.5l5 5L20 7">` (line 603), `stroke-dasharray:30; animation:checkDraw .5s .15s var(--ease-decel) both`. Same treatment for the `formSuccess` code reveal (markup_current.html:526-535). Purely CSS, gated by the existing reduced-motion block (style_3.work.css:178-181).

---

## Build order (impact × cost)
1. **Wishlist remove** (#2) — one-line `setState`→`vtState`, ship immediately.
2. **Cart remove FLIP** (#1) — flagship; `vtCart` helper reuses the list mode (no CSS).
3. **Success/formSuccess checkmark** (#10) — cheap, high polish, not a VT.
4. **Auth OTP step slide** (#4) — meaningful UX; remember the `min-height` anti-morph pin.
5. **Nav pill** (#7, CSS) and **fly-to-cart** (#5, WAAPI clone) — flashy, medium cost, explicitly *not* VTs.
6. Address-delete FLIP (#3) and discount reveal (#6) — free once the helpers exist; low frequency.

**Explicitly do NOT VT:** qty stepper (#8), badge/heart pop (#9, already CSS), nav pill (#7), fly-to-cart (#5) — each is either overkill or actively degraded by the single-active-VT model.