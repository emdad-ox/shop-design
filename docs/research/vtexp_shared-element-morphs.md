Design validated (and one real bug caught: the same-route "related" morph needs an explicit `scrollTo(0,0)` because `componentDidUpdate` only resets scroll on *route* change). Here is my lens.

---

# SHARED-ELEMENT (HERO) MORPHS — Emdad Oxygen

Source files: JS `…/scratchpad/script_2.work.js` · CSS `…/scratchpad/style_3.work.css` · markup via find/replace in `…/scratchpad/markup_edits.json` (applied to `…/scratchpad/markup_current.html`).

## ★ HEADLINE — Product card → detail "expand" morph (the user's explicit ask)

**The leverage:** every product card in the app binds the *same* `vm.open` — home **featured** (L89), **products list** (L132), detail **"related"** (L225), and **wishlist** cards. Rewire that one closure and a single `openMorph` gives you the App-Store card-grows-into-page morph at **every** entry point simultaneously. This is the single highest-ROI change in the whole VT surface.

**(a) UX.** Tap a card → its thumbnail (the placeholder gradient stage) lifts off the list, flies up and grows into the detail page's full-width 220px hero stage; the title glides/scales from the card's 13.5px line into the detail `<h1>`; the rest of the list cross-fades out and the detail body (specs, description, CTA bar) cross-fades in *underneath* the flying hero. It reads as the card "opening up," not a page pushing over — distinct from the opaque cover-slide `go()` uses everywhere else.

**(b) Elements / routes.** Routes `products|home|detail|wishlist → detail` (DEPTH 0→1, currently a `forward` cover-slide — this **replaces** that slide for card taps only). Named elements per snapshot: source = the tapped card's **first child div** (the thumbnail — it's the first child in every card variant, so no source hook needed) + optional title; destination = the detail **hero stage** (`data-hero-img`) + **h1** (`data-hero-title`).

**(c) Naming / mode strategy (respecting all 6 constraints).**
- Fixed names `hero-img` / `hero-title`, but applied to **exactly one element per snapshot** → unique at capture (constraint 1). Source names set **synchronously before** `startViewTransition` (old snapshot); destination names set **inside the `setState` callback, before `res()`** (new snapshot) — the exact `vtState` pattern (constraint 4).
- The detail hero is **never statically named** — only temporarily, cleared in `.finished` (constraint 2), so it can't hijack unrelated detail→cart/back route changes.
- New `data-vt="expand"` mode; visuals driven by **CSS keyframes on the pseudos**, not `transition.ready` (constraint 3). Dynamic per-tap data is only *which* element gets named — no custom-property geometry needed, the UA group animation does the position/size/radius interpolation for free.
- Reduced-motion & no-VT → early-return to `this.go(patch)` (constraint 6; `go` itself also guards).

**(d) Effort / risk.** Forward morph: **S–M, low risk** — source is definitionally on-screen (user just tapped it), destination hero is top-of-page and visible after `scrollTo(0,0)`. Graceful degradation is inherent: if two elements ever collide on a name the transition **skips to an instant swap but the `setState` still lands and `.finished.finally` still clears names** — no stuck state, worst case is "no animation."

**(e) Implementation.**

JS — add to `class Component` in `script_2.work.js`:
```js
openMorph(pid, e){
  const patch = { route:'detail', pid, qty:1 };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce || this._morphBusy){ this.go(patch); return; }

  const card = e && e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('[data-pid]') : null;
  const src  = card || (e && e.currentTarget);
  if (src && src.firstElementChild) src.firstElementChild.style.viewTransitionName = 'hero-img'; // thumbnail
  const srcTtl = src && src.querySelector('[data-card-title]');                                  // optional
  if (srcTtl) srcTtl.style.viewTransitionName = 'hero-title';

  this._morphBusy = true;
  document.documentElement.dataset.vt = 'expand';
  const t = document.startViewTransition(() => new Promise(res => this.setState(patch, () => {
    window.scrollTo(0, 0);                                  // ← REQUIRED: same-route (related) taps don't reset scroll
    const dImg = document.querySelector('[data-hero-img]');
    const dTtl = document.querySelector('[data-hero-title]');
    if (dImg) dImg.style.viewTransitionName = 'hero-img';
    if (dTtl) dTtl.style.viewTransitionName = 'hero-title';
    res();
  })));
  t.finished.finally(() => { this._clearHeroNames(); this._morphBusy = false;
    if (document.documentElement.dataset.vt === 'expand') delete document.documentElement.dataset.vt; });
}
_clearHeroNames(){
  document.querySelectorAll('[data-hero-img],[data-hero-title]').forEach(el => el.style.viewTransitionName = '');
  document.querySelectorAll('[data-pid]').forEach(c => {
    if (c.firstElementChild) c.firstElementChild.style.viewTransitionName = '';
    const tl = c.querySelector('[data-card-title]'); if (tl) tl.style.viewTransitionName = '';
  });
}
```
The `window.scrollTo(0,0)` line is the advisor-caught fix: `componentDidUpdate` only scrolls-to-top when `prevState.route !== route`, so a **related** tap (detail→detail) leaves the user scrolled to the bottom-of-page related section while the new hero renders off-screen at the top → the card would fly *off-screen*. The explicit scroll makes the same-route case correct and is a harmless no-op cross-route. `_morphBusy` is the rapid-double-tap guard (you also have `commitGuard` if you prefer that lock).

Change the `open` closure in `vm(p)` (currently L300):
```js
open: (e) => this.openMorph(p.id, e),   // was: () => this.go({route:'detail', pid:p.id, qty:1})
```

Markup edits (append to `markup_edits.json`):
```json
{ "what":"product cards: pid hook for morph + re-enables list FLIP", "count":-1,
  "find":"role=\"button\" onclick=\"{{ item.open }}\"",
  "replace":"role=\"button\" data-pid=\"{{ item.id }}\" onclick=\"{{ item.open }}\"" },
{ "what":"detail hero image target", "count":1,
  "find":"<div style=\"height:220px;border-radius:20px;border:1px solid var(--line);background:radial-gradient(circle at 30% 22%,var(--sur2),transparent 62%),linear-gradient(140deg,var(--sur),var(--bg));display:grid;place-items:center;margin-bottom:8px\">",
  "replace":"<div data-hero-img style=\"height:220px;border-radius:20px;border:1px solid var(--line);background:radial-gradient(circle at 30% 22%,var(--sur2),transparent 62%),linear-gradient(140deg,var(--sur),var(--bg));display:grid;place-items:center;margin-bottom:8px\">" },
{ "what":"detail hero title target", "count":1,
  "find":"<h1 style=\"margin:0;font-size:18px;font-weight:900;line-height:1.6\">{{ cur.title }}</h1>",
  "replace":"<h1 data-hero-title style=\"margin:0;font-size:18px;font-weight:900;line-height:1.6\">{{ cur.title }}</h1>" },
{ "what":"card title source hook (optional title morph)", "count":-1,
  "find":"<div style=\"font-weight:700;font-size:13.5px\">{{ item.title }}</div>",
  "replace":"<div data-card-title style=\"font-weight:700;font-size:13.5px\">{{ item.title }}</div>" }
}
```
**Bonus you get free:** `markup_current.html` currently has **zero `data-pid`** (verified: `grep -c` = 0), yet the shipped `vtState` list-FLIP queries `[data-pid]` — meaning your filter/sort FLIP is **silently a no-op today** and filters hard-swap. The first edit above re-activates it. (If your build already injects `markup_edits.json`'s first entry, it's a no-op here — verify which.)

CSS — append to `style_3.work.css`:
```css
/* SHARED-ELEMENT (HERO) MORPH: product card ⇆ detail hero ('expand' mode) */
html[data-vt="expand"]::view-transition-group(hero-img),
html[data-vt="expand"]::view-transition-group(hero-title){
  animation-duration: var(--dur-slow);
  animation-timing-function: var(--ease-emphasized);
  z-index: 20;                                     /* hero rides above the fading page bodies */
}
html[data-vt="expand"]::view-transition-old(root){ animation: emdadFadeOut var(--dur-base) var(--ease-standard) both; z-index:1; }
html[data-vt="expand"]::view-transition-new(root){ animation: emdadFadeIn  var(--dur-slow) var(--ease-standard) both; z-index:1; }
@keyframes emdadFadeOut{ from{opacity:1} to{opacity:0} }
@keyframes emdadFadeIn { from{opacity:0} to{opacity:1} }
```
No override for `emdad-nav` → the persistent bottom tab bar stays put through the morph (correct — a card open shouldn't move the nav). The default group animation cross-fades the two hero snapshots while interpolating the box, so the square 64/72px thumbnail stretching to the 220px landscape stage is invisible (both are placeholder gradients today; a slight mid-flight squash is standard VT behavior once real photos land — acceptable, or set a shared `object-fit`/aspect later).

**RTL & the back-morph.** The morph is geometry-driven (rect→rect), so it's **RTL-agnostic** — no left/right keyframes to mirror, unlike the cover-slide. For the reverse (detail→products), a symmetric shrink-back is the premium finish but has one honest caveat: after the list resets to `scrollTop:0`, the target card may be **below the fold**, so its snapshot rect is empty. Ship it **viewport-guarded**:
```js
closeMorph(){
  const pid = this.state.pid, patch = { route:'products' };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduce || this._morphBusy){ this.go(patch); return; }
  const dImg = document.querySelector('[data-hero-img]'), dTtl = document.querySelector('[data-hero-title]');
  if (dImg) dImg.style.viewTransitionName = 'hero-img';
  if (dTtl) dTtl.style.viewTransitionName = 'hero-title';
  this._morphBusy = true; document.documentElement.dataset.vt = 'expand';
  const t = document.startViewTransition(() => new Promise(res => this.setState(patch, () => {
    const card = document.querySelector('[data-pid="'+pid+'"]');
    const r = card && card.getBoundingClientRect();
    if (r && r.top < innerHeight && r.bottom > 0){                    // only pair a card that's actually on-screen
      if (card.firstElementChild) card.firstElementChild.style.viewTransitionName = 'hero-img';
      const tl = card.querySelector('[data-card-title]'); if (tl) tl.style.viewTransitionName = 'hero-title';
    }
    res();
  })));
  t.finished.finally(() => { this._clearHeroNames(); this._morphBusy = false;
    if (document.documentElement.dataset.vt==='expand') delete document.documentElement.dataset.vt; });
}
```
Wire the detail **back button only** (L170) to it: add `backToProducts: () => this.closeMorph(),` in `renderVals`, and edit `find:"<button onclick=\"{{ goProducts }}\" aria-label=\"بازگشت\""` → `backToProducts` (the bottom-nav "محصولات" keeps plain `goProducts`). When the target is off-screen, `hero-img` exists only in the old snapshot → it gently scales/fades away (acceptable). **If you want zero risk, skip `closeMorph` entirely** — the existing `back` cover-slide already reads great as the "close." Forward-only is the safe, high-impact shipping cut.

---

## Other hero morphs, ranked by ROI

**1. Featured card → detail — FREE (S, low).** Home featured cards (L89) bind the same `item.open`; the `data-pid` edit + `openMorph` covers them with zero extra work. DEPTH 0→1, replaces the forward slide from home.

**2. Related card → detail — FREE (S, low) — needs the `scrollTo(0,0)` line.** Detail "related" cards (L225) also bind `item.open`. This is a *same-route* morph (pid changes, route stays `detail`): the current (unnamed) hero cross-fades out while the tapped related thumbnail flies up into the *new* hero. Works **only** with the explicit scroll reset above — without it the target is off-screen. Genuinely delightful "keep diving through products."

**3. Wishlist card → detail — FREE (S, low).** Wishlist renders `vm` cards with `item.open` → same morph, no extra code once the `data-pid` edit lands.

**4. Selected-address card ⇆ address picker (M, medium).** Checkout (L192-area selected address w/ live Leaflet `data-addr-map`) and the address bottom-sheet rows. When a sheet row is picked, morph that row's mini-map/card into the checkout selected-address card. Naming: temp `addr-card` on the picked sheet row (identified in the `pick` closure) + `addr-card` on the checkout card, set inside the `setState` that closes the sheet; `data-vt="addrmorph"`, default group animation. Caveat: it's a **sheet dismiss**, not a route change, and Leaflet tiles snapshot as a static image mid-flight (fine, but a beat of frozen map). Medium value, medium effort. Not the address*es*-route→checkout path (those aren't adjacent in nav).

**5. Order / request row → its detail — BLOCKED today (L, needs new route).** `ordersList`/`requestsList` (L727/729) are **flat rows with no detail route**. If you add `orderDetail`/`requestDetail` routes, the row's order-number + status chip morph into the detail header — identical card→detail pattern (temp name on the tapped row via its `go` closure + matching name on the detail header). Honest: not buildable until the destination screen exists.

**6. Service icon → form header (M, medium, needs a matching target).** Services cards carry an icon tile (refill L362 `--acc-soft`, used L372 `--p-soft`); the refill/usedSale form headers (L391/L474) are just back-button + title with **no matching hero icon**. Add a small header icon to each form, then morph the service tile into it (temp `svc-<id>` names). Nice continuity for the two service flows; low risk but requires adding the destination element.

**7. Profile menu row → section header (M, pattern).** The four profile rows (orders/requests/wishlist/addresses, L655) each have a 36px icon tile; their destination screens are title-only. Same as #6 — add a header icon per section, morph the row tile into it. A tidy *system* (one convention, four payoffs) rather than a one-off.

**8. O₂ logo → auth logo (S build, LOW value / speculative).** Home header O₂ badge (L37, 42px) and auth screen O₂ logo (L323, 64px) are the same brand mark, but **no user action navigates home→auth directly** (auth is reached from profile/checkout, which don't show the logo). The morph only pays off if you make the brand mark tappable-to-account for guests. Listed for completeness; skip unless that product decision is made. (A better future use of the same technique: an app splash/brand screen → home, if one is ever added.)

**Bottom line:** ship #1 (forward `openMorph` + the four markup hooks + `expand` CSS) — it lights up items 1–3 and the user's exact ask in one change, re-enables the dormant list-FLIP as a bonus, and degrades safely. Treat `closeMorph` (#back) and items 4–7 as follow-ons.