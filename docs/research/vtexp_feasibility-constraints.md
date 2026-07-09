## VT Opportunity Audit — Feasibility, Risk & Sequencing

All risk levels below are **predicted from patterns already shipped in this codebase** (the list FLIP, cover-slide, theme circle), not guesses. Exactly **one** item warrants a pre-build spike (gradient-stretch aesthetics); everything else is a re-composition of proven mechanics.

### Recommended build order (impact × inverse-risk)

| # | Ship | Why this slot |
|---|------|---------------|
| **1** | **Active-tab pill morph** (`navpill`) | Lowest risk of the whole set, touches only the nav, immediate perceived-quality lift. Warm-up that de-risks static-name discipline before the flagship. S. |
| **2** | **Card → detail expand** (`expand` mode) — forward only | The explicit ask. Composes freeze-root + per-tap naming (both proven). Ship forward, then reverse as fast-follow. M. |
| **3** | **Cart FLIP** on qty/remove | Verbatim `vtState` reuse on `cartItems`. Instantly makes the cart feel alive. S. |
| **4** | **Wishlist FLIP** on unwish | Same helper, `wishItems`. S. |
| **5** | *(optional)* Detail→card **reverse** morph | Fast-follow to #2, needs the miss-fallback (below). M. |
| **6** | *(optional)* Auth phone→code **step slide**; Addresses FLIP | Nice-to-have; addresses carries Leaflet risk. M. |

### Risk + Effort matrix

| Opportunity | Effort | Risk | Dup-name risk | Naming | Approach | Reduced-motion |
|---|---|---|---|---|---|---|
| Active-tab pill | S | **LOW** | None (1 pill ever) | Static `navpill` + null in theme mode | CSS default group slide | guard in helper + global CSS backstop |
| **Card→detail expand (fwd)** | M | **LOW–M** | **None** (1 named el per capture) | **Temporary per-tap** (card before, hero in setState cb, clear in `finished`) | CSS keyframe, new `data-vt="expand"` freeze-root | fall back to `go()` cover-slide |
| Detail→card reverse | M | **M** | None | Temporary; **miss-fallback required** | CSS `expand`, reversed | fall back to `back` |
| Cart FLIP (qty/remove) | S | **LOW** | None (temp `c-<id>`) | Temporary per-mutation | reuse `vtState` verbatim | inherited from helper |
| Wishlist FLIP | S | **LOW** | None (temp `w-<id>`) | Temporary | reuse `vtState` | inherited |
| Auth step slide | M | LOW–M | None (1 card) | Temporary on form card | freeze-root, animate 1 named card | inherited |
| Addresses FLIP | S–M | **M** | None | Temporary | `vtState`-style **but cards embed Leaflet** | inherited |
| Add-to-cart "fly to badge" | L | **HIGH** | — | — | **wrong tool for VT** — use a cloned ghost + WAAPI/GSAP | n/a |
| Sheet open/close as VT | S | — | — | — | **already better as CSS `sheetIn`** | — |
| Success check reveal | S | — | — | — | **CSS keyframe, not VT** | — |

---

### Flagship: card → detail expand — the honest read

**It is not a new primitive.** It is `vtState`'s two proven moves welded to `go()`'s cross-route setState:

1. **Before** `startViewTransition`: name the tapped card's thumbnail. Query it — `document.querySelector('[data-pid="'+id+'"]').firstElementChild` — do **not** hold the React event ref. Rationale (keep it straight): not event-pooling (React 18 dropped that) — it's that you must name the *new* hero *after* setState anyway, so a DOM query is the natural symmetric tool and sidesteps `currentTarget` being reset after dispatch.
2. **Inside** the `startViewTransition` callback: `this.setState({route:'detail',pid,qty:1}, res)` — and in that completion callback, name the now-mounted detail hero (line 178 div) with the **same** name, then `res()`. Identical to how `vtState` re-names cards in the setState callback.
3. **`t.finished.finally`**: clear both names, delete `data-vt`.

**Why duplicate-name can't bite here:** the shared name spans a route swap — old card unmounts, new hero mounts — but *each capture has exactly one element carrying the name*. That's the canonical shared-element case, not a collision. This is why I rate it **LOW–M, not M**.

**Mode CSS** — new `data-vt="expand"`, freeze root exactly like list mode (proven at CSS L140–142), let the shared child morph:
```css
html[data-vt="expand"]::view-transition-group(root),
html[data-vt="expand"]::view-transition-old(root),
html[data-vt="expand"]::view-transition-new(root){ animation-duration: 1ms; }
html[data-vt="expand"]::view-transition-group(hero-card){
  animation-duration: var(--dur-slow); animation-timing-function: var(--ease-emphasized); }
```
The rest of the detail page pops in instantly behind the morphing image — the eye is on the hero, so it reads clean (this is the Android shared-element pattern). Do **not** crossfade root here; that reintroduces the two-page "blink" the team deliberately removed.

**Name the thumbnail, not the whole card.** Morphing the whole card raster-snapshots its *text* and stretches it into the hero — visible jank. Naming only the first-child gradient thumbnail means gradient→gradient, and the crossfade hides the box stretch.

**The one spike (≈10 min):** the thumbnail is a 72px square, the hero a 220px band — VT raster-stretches the old snapshot before the crossfade completes. Benign here because both are the same soft `radial-gradient` (not a photo), but *verify it looks right* before committing. Note in code: when real photos land, put `object-fit:cover` on both `<img>`s and the aspect morph stays clean.

**Wire-up:** change `vm().open` (script L300) from `() => this.go(...)` to `(e) => this.openVT(id)`; add `openVT` next to `vtState`. Detail side needs a temporary name only — resist a static `view-transition-name` on the hero: it's *not* always-present, but a static name there **breaks the theme-circle reveal while on the detail page** (the hero gets pulled out of root and won't be clipped by the expanding circle). Constraint 2, exactly.

### Reverse (detail → back) is **not symmetric** — the trap

Forward always has a target (the hero always exists). Back does not: if the user reached detail from **home-featured, wishlist, or a related-product row**, the origin card may not be in the back destination → a name with no matching capture → whole transition skips to an instant swap. **Spec:** name the destination card only if `querySelector('[data-pid=…]')` **hits**; on a miss, fall through to the existing `back` cover-slide. Ship forward first; reverse is the fast-follow carrying this caveat.

### Active-tab pill (`navpill`)

Add one absolutely-positioned pill inside the nav grid (renderVals computes `navPillStyle` with `inset-inline-start` from the active index; the active state today is only color/weight, so this is genuinely new markup). A **static** `view-transition-name:navpill` is acceptable here — uniqueness is guaranteed (one active tab), and it *should* persist so it slides on every route change. Two must-dos:
- **Null it in theme mode:** `html[data-vt="theme"] [data-navpill]{view-transition-name:none!important}` — the nav folds into root during the circle wipe (mirrors the existing `emdad-nav` null-out at CSS L151–152).
- **Confirm the nav renders on *every* route** incl. `auth`/`success`/`formSuccess`. The routes brief says nav+overlays are always-present siblings of the route `<sc-if>`s, so it holds — but a static-named element that vanishes on any route would silently skip that transition's pill slide. Verify in the built DOM.

The pill lives inside the lifted `emdad-nav` group; nested names animate independently, so it slides within a static nav. LOW risk.

### FLIP family (cart, wishlist, addresses) — pure `vtState` reuse

Route mutations through a `vtState` clone: name each row `c-<id>` / `w-<id>` before, freeze root (`data-vt="list"` already does this), default group animation glides survivors and fades removed rows. Needs a `data-cid` / `data-wid` hook per row (same shape as `data-pid`). Temporary per-mutation naming ⇒ no duplicate-name exposure. **Addresses is the M in the family** only because its cards embed live Leaflet maps — a VT snapshot rasterizes the map (fine), but watch for `manageMaps()`/`invalidateSize` firing mid-transition; lower its priority.

---

### Cross-cutting constraint audit

- **Temporary vs static naming.** Everything shared/morphing = **temporary per-tap/per-mutation** (card, hero, FLIP rows, auth card). Only `navpill` earns a **static** name (provably unique, wants to persist), and even it must be nulled in theme mode. No morphing element should carry a static name — that's the exact failure in constraint 2 (unexpected morph during unrelated route changes; breaks the theme circle).
- **CSS-keyframe vs flaky WAAPI.** 100% CSS keyframes on the pseudos, values passed via custom props — the pattern already used for the theme circle. **No new opportunity needs `transition.ready` + `element.animate`.** Keep it that way; that path intermittently rejects with `InvalidStateError` here.
- **Conflict matrix.**
  - *expand vs cover-slide:* both fire on the same card tap, so **branch** — card tap → `expand`, all other navs keep cover-slide. `openVT` sets its own `data-vt`, no overlap.
  - *expand vs list FLIP:* both touch the products route and both name product cards, but they never co-fire (a tap either filters or opens) and use different names (`p-<id>` vs `hero-card`). `vtState` clears `p-<id>` in `finished`, so DOM is clean between them. Edge: tapping a card *mid-list-transition* — rely on the runtime queuing/skipping overlapping `startViewTransition` calls; optionally debounce. Low.
  - *navpill vs everything:* during list/expand the tab doesn't change, so the pill is captured but static — fine.
- **React-timing.** Never `await` React before pseudo capture. Flip the visible thing synchronously in the callback and pass `res`/name-new-elements in the setState completion — the discipline `vtState` and `themeVT` already encode. New helpers must copy it verbatim.
- **Performance.** Named-element counts are trivial (expand: 2; pill: 1; FLIPs: a handful; list FLIP already ships ~8 cards). No concern at this catalog size. **Future watch:** `vtState` names *every* `[data-pid]` in the DOM — if the catalog grows to dozens/hundreds, cap naming to on-screen cards.
- **Reduced-motion.** Every new helper must open with the same `matchMedia('(prefers-reduced-motion: reduce)')` guard → plain `setState`. The global CSS override (L178–181 zeroes all `::view-transition-*`) is the backstop, but the JS guard avoids even forming the transition.

### Build preconditions (don't assume)

- **`data-pid` must actually reach the built DOM.** `grep` finds **zero** `data-pid` in `markup_current.html`; it's injected by `markup_edits.json`. That injection's `find` string (`<div onclick="{{ item.open }}"`) **no longer matches** current markup — the cards already carry `tabindex="0" role="button"` *between* `<div` and `onclick` (lines 89/132/225/818). The shipped list FLIP proves the hook lands *somehow*, so the audit can rely on it — but every card transition (expand + reverse) depends on it, so treat "**confirm the `data-pid` edit lands in the built DOM**" as an explicit gate, and mirror it when adding `data-cid`/`data-wid`.

### Tempting but **not worth it**

- **Add-to-cart "fly to badge" via VT.** VT morph *replaces* the old element — it can't leave the thumbnail in the list *and* fly a ghost to the badge. Wrong tool. If wanted, clone a ghost + WAAPI/GSAP; otherwise the existing `pop('[data-cart-badge]', badgePop)` already covers the feedback. HIGH effort, HIGH risk, low incremental value.
- **Bottom-sheet / address-sheet open-close as VT.** The CSS `sheetIn` keyframe is simpler and already good; VT adds scrim+panel naming for zero gain.
- **Success / formSuccess check reveal via VT.** A CSS scale/pop keyframe is the right tool; not a shared-element case.
- **Card *title* as a second shared element** in the expand. Text morph (13.5px/700 → 18px/900) reflows and janks; skip in v1, revisit only if the thumbnail morph alone feels thin.
- **Static name on nav or hero**, and **cart→checkout summary-card morph** (layouts don't map; low ROI).

Source refs: helpers `vtState`/`nav`/`go`/`themeVT`/`pop` at `script_2.work.js` L202–240; DEPTH/TAB_ORDER L173–176; product cards markup L89/132/225/818, detail hero L178; VT mode CSS `style_3.work.css` L104–156 (`emdad-nav` L119, list-freeze L140–142, theme null-out L151–152); build-time hooks in `markup_edits.json`.