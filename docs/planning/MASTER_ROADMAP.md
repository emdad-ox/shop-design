# EMDAD OXYGEN — MASTER PROGRAM ROADMAP (single-engineer, phase-by-phase)

Two decisions the four lenses left to the architect, made here up front:

- **GSAP: OUT of the mainline.** Both the GSAP lens ("net-negative weight unless drag-to-dismiss is committed") and the monolith-risk lens ("recommend DROP") land here. The shipped WAAPI+VT+CSS stack already covers every page morph, FLIP, fly-to-cart and pop; a GSAP tween on a node also under `startViewTransition` fights the single-active-VT model; +~45KB gzip into a self-contained offline bundle buys nothing the roadmap needs. The ONE genuine GSAP feature — physics drag-to-dismiss on the two bottom-sheets — is carved out as an **optional post-v1.0 appendix (A1)** that must not start until the 12 phases ship and someone explicitly commits, because it first requires build.py manifest-injection infra that does not exist yet. DrawSVG checkmark / CustomWiggle shake are declined (a 4-line CSS keyframe does 90%).
- **App-bar is sequenced EARLY (right after routing).** It rewrites the header/back-button region that ~6 later phases anchor into and it owns drill-in-title→`<h1>` promotion (which lifecycle would otherwise duplicate). Building it once, early, on top of routing's `goBack`, means every later markup edit anchors to a stable unified header instead of re-anchoring around it.

Photo-upload is IN (the brief names it as one of the 7); it lands last of the form epics so it edits the final merged forms.

---

## 1. THE PHASES

Hard precedence chain: **P0 spikes → P1 substrate → P2 persistence + P3 routing (adjacent) → P4 app-bar → P5 illustrations → P6 lifecycle → {P7 delivery, P8 trust} → P9 expand → P10 a11y (markup last) → P11 photo → P12 micro-VT+polish.** Reordering silently reverts reconciled merges (a11y before routing/lifecycle targets the wrong method bodies; delivery before lifecycle adds keys to an undefined record shape; app-bar before routing has no `goBack`).

Every phase ends GREEN by the two-tier gate in §5.

### P0 — SPIKES (throwaway; ship nothing) · S
- **Routing spike:** `history.pushState` under `file://` inside a `histWrite` try/catch (catch `SecurityError`); hardware Back → `popstate` → `applyPop` → `nav(patch,'back')` so history direction drives VT direction. This coupling is the real risk, not "extend go()". **Also spike the deep-link-then-back path** (see P4 dependency): deep-link to a child route at history depth 1, press back — confirm the seeded-parent logic lands on the logical parent, not a dead button / app exit.
- **Expand-VT spike:** 10-min throwaway proving `data-vt="expand"` (crossfade root + `expander` group) *reads* as a container morph before P9 commits to it.
- **NO GSAP spike** (decision above). If drag-to-dismiss is ever greenlit, its spike is build-infra (manifest injection), run then — see A1.
- *Verify:* both spikes visually confirmed in a throwaway build; discard the code.

### P1 — VISUAL SUBSTRATE / TOKEN-SNAP (dynamic strings only) · S
Snap **only the JS dynamic style strings** to the `:root` token scales already present (CSS L93-101): `chipBase` L523, `navBase` L602, `dotStyle` L544/551, switch/knob L676-679 — whole-block replaces, build-safe. **Leave hook-bearing markup inline styles literally unchanged** (`[style*="background:var(--sur)"]`, `z-index:40`, `border-radius:20px 20px 0 0`): snapping them silently detaches the elevation material — no BUILD ERROR, no console error, just flat. Finalize any residual de-tint/line/elevation in CSS.
- *Why here:* everything downstream should target snapped values; do it before any F/M markup exists.
- *Verify:* build green; grep OUT DOM for the three material substrings — all present; app visually unchanged.

### P2 — PERSISTENCE · S
`durableSlice`/`persist`/`hydrate` + the final `DURABLE` whitelist (§2); `hydrate()` first in `componentDidMount`; `persist()` appended LAST in `componentDidUpdate` (no setState/DOM → never fights VT); cart/wish prune + address reconcile on hydrate; seed-login gated on `!hydrated`.
- **Ship a schema version NOW (do not defer to P6).** Persist a `v:SCHEMA_V` int in the blob; `hydrate()` **discards `orders`/`requests` on version mismatch** (keeps cart/addresses/login). P2 persists old-shape `orders`/`requests`; P6 changes the record to `stage`/`stamps`. Without the version gate, the SHIPPED artifact — opened by a user who persisted old-shape orders from an earlier demo — feeds `record.stage=undefined` into `flow[undefined]` → blank/crash on the orders screen. Bumping `SCHEMA_V` at P6 then makes this an automatic net, not a manual "remember to clear".
- *Why here:* foundation hook pattern every later phase extends; disjoint keys from routing.
- *Verify:* cart/theme/login survive reload; corrupt key → seeded defaults, no flash; bumping `SCHEMA_V` in devtools then reloading drops stale orders without wiping cart.

### P3 — ROUTING / HISTORY · L
**Extend** `go(patch)`→`go(patch,opts)` (thread `opts.replace` into `histWrite`) — do NOT author it, it exists (L188). Add `ROUTE_PATH`/`navKeyOf`/`hashFor`/`parseHash`/`histWrite`/`saveScroll`/modal helpers/`goBack`/`applyPop`/`applyHash`. Extract `pushNav(toRoute,toPid,opts)` and:
- **GAP-A:** `openMorph` (L220) must call `pushNav` on its VT branch (it currently `setState`s directly, so card→detail pushes no history/hash → Back skips detail). Key off `navKeyOf`, not `route` (detail-A→detail-B is same route/new pid). Guard the reduced-motion fallbacks (they already `go()`) against a double-push.
- **GAP-B:** keep the `TAB_ORDER` else-branch for same-depth sibling tabs (don't collapse `dd===0→'fade'`, which CSS maps to `forward` → profile→home would animate the wrong way).
- **Seed a synthetic parent entry so `goBack` never dead-ends.** After P4 all 9 backs route through `goBack`; a user who deep-links to `#/product/oxy10` (history depth 1) and taps back has nowhere to pop → dead button / app exit. On a deep-link entry, `parseHash`→synthesize the logical parent from `DEPTH`/`ROUTE_PATH` and seed it so back always lands somewhere sane.
- Replace the didUpdate route block (L78-89) with the navKey scroll/focus block; add `popstate`/`hashchange`/scroll listeners + `componentWillUnmount`. Convert `placeOrder`/`completeRefill`/`completeUsed`/`authBack`/`saveAddr`/`closeOverlays` to history-aware (`{replace}` opts, interim).
- **Do NOT rewire the 9 inline back buttons** — the app-bar (P4) is their sole editor. Interim: they hard-code their parent (work as forward-nav; acceptable, still green).
- *Verify (file://):* no `SecurityError`; card-tap updates `#/product/…` AND Back returns to it (GAP-A); tab slides keep direction (GAP-B); deep-link `#/product/oxy10` + bad `#/nope`→home; sheet-Back closes sheet.

### P4 — UNIFIED APP-BAR · M-L · (highest markup-edit-count step; build+boot per batch)
One in-flow **UNNAMED** 56px bar for all 17 routes (`grid:40px/1fr/40px; height:56; background:var(--sur)`) — unnamed so it slides WITH its page under the cover-slide (opposite of the persistent `emdad-nav`). Three variants: tab `[brand|title|theme]`, drill-in `[back|title|spacer]`, detail `[back|title|wish-heart]`. Deletes all **9** inline backs (L170/318/391/474/548/688/720/752/804) into one slot binding routing's `goBack`; unifies title sizes to one 17px/700 spec; promotes drill-in titles from `<div>` to real `<h1>`. Preserve `data-hero-img` (sits below the detail header — verify morph undisturbed) and `data-wish-heart` (moves into trailing slot). ~13-17 ordered `markup_edits.json` entries; order them so they don't invalidate the find-strings the shipped hero/cid/badge/pill edits depend on.
- *Why here:* needs `goBack` (P3, incl. the seeded-parent entry); owns the header region ~6 later phases anchor into; gives trust's `about` a bar for free; owns the drill-in→`<h1>` promotion so lifecycle needn't.
- *Verify:* all 17 routes show the one bar; back works everywhere; each of the 9 deletions hit exact count; card→detail morph still reads; **deep-link to a child route then tap the app-bar back → lands on the logical parent** (exercises P3's seeded-parent path).

### P5 — PRODUCT ILLUSTRATIONS · M
`PRODUCT_ART` 4-archetype map (8 SKUs) + `artEl(kind,size)` returning `React.createElement('svg',…)` (duotone via inline `style` objects — `var()` does NOT resolve in SVG presentation attrs; line layer `stroke="currentColor"`). Add `art:` to `vm(p)` (L353) so `featured`/`items`/`related`/`cartItems`/`wishItems` all light up from one line; larger instance on `curVm` (detail hero). Mount `{{ item.art }}`/`{{ cur.art }}` into the empty `--sur2` stages (home L90, list L133, detail hero L178, cart L268, wishlist L819); **fix the related-thumb crosshatch** (L226) and mount art there too; delete the `تصویر محصول` label (L179). **Preserve `data-hero-img`; render the SAME `PRODUCT_ART[pid]` at card thumb AND detail hero** (SVG→SVG interpolation keeps the shipped card-morph clean). Then **fly-to-cart clone (1b):** change `flyToCart` (L319) to `cloneNode(true)` the illustrated stage instead of the synthetic "+" disc (keep the disc as reduced-content fallback).
- *Why here:* app-bar-independent and record-shape-independent; must precede any art-flying morph (fly-clone here, reverse-morph P12); feeds empty-state art (P12).
- *Verify:* every stage shows an illustration; card→detail morph reads SVG→SVG; fly animates the illustration; reduced-motion falls back.

### P6 — LIFECYCLE-LOADING · L · (clear `emdad:v1` at this boundary)
FLOW consts + `nowFa`/`run()`/`statusChip`/`stepsVm`/`orderVm`/`requestVm`/`advanceOrder`/`advanceRequest`/`applyDisc`; final record shape `stage`+`stamps` (drop frozen `status`/`statusKind`; delete `reqChip` L626). Rewrite `placeOrder`/`completeRefill`/`completeUsed` merging P3's `{replace}` opts; `busy` gating + `_busyT` unmount; busy/CTA fields in renderVals; `ordersList`/`requestsList`→VMs; 7 CTA markup pairs + **expandable orders/requests cards**; `.sp`/spinner CSS + reduced-motion hide.
- *Why here:* defines the canonical record shape delivery + a11y build on; all its navigation happens inside `run()` AFTER `busy` clears, so VT never snapshots a spinner.
- *Verify:* clear `emdad:v1` first; CTA spins→forward-VT; double-tap = 1 order; timeline advances + chip bounce; reduced-motion hides spinner.

### P7 — DELIVERY-SCHEDULING · M
`SLOTS` + `dayList`/`firstAvailSlot`/`scheduleLabel`/`scheduleVM`; **merge** delivery keys INTO P6's place/complete patches (never a separate handler); fold `deliveryLabel` INTO `orderVm`/`requestVm`; co*/rf* scheduler + success-label renderVals; markup 4a-4d; **bake the delivery row INTO P6's combined card replacement — never ship 4e/4f standalone (Conflict C: delivery's find-string lives verbatim inside lifecycle's `role="button"` toggle header; sequential application injects the row inside the toggle).** CSS `[data-day-rail]`.
- *Verify:* day-rail + slots + phone-fallback, never two lit; label on success + in orders list; delivery row sits in the collapsed summary, NOT inside the toggle header.

### P8 — TRUST-CONTENT · M
Content consts; add `about` to **all four maps** — `DEPTH` (L173) + `ROUTE_TAB` (L175) + the duplicate inline `activeMap` (L610) + routing's `ROUTE_PATH` (else `#/about` won't deep-link); `activeMap.about='home'`; menuRows entry; per-product safety/Rx flags (`showRx = isCylinder && isMedical` — excludes `mano` accessory, guards the `co2` no-oil/no-Rx content bug); `isAbout`/`goAbout`/arrays; markup A/B/C — **about-back binds `{{ goBack }}` (routing), not `goHome`.**
- *Why here:* needs P3 `ROUTE_PATH`; app-bar already gives `about` a bar.
- *Verify:* home strip→about forward-VT + deep-link; per-product gating (oxy40 full, co2 no-oil/no-Rx, mano none); nav tab highlights correctly (all four maps).

### P9 — CONTAINER-EXPAND + CART→CHECKOUT TWIN + SERVICES/HOME→FORM · M
Add `expandTo(patch,srcSel,dstSel)` (sibling of `nav`/`vtFlip`; single fixed name `'expander'`; source-name before `startViewTransition`, flip+dest-name synchronously in the `setState` callback, clear both in `.finished`; reduced-motion/no-VT → `this.go(patch)`) + `data-vt="expand"` mode (root crossfades, `::view-transition-group(expander)` gets `--dur-slow`/emphasized ease/`z-index:20`). Reroute the **calls** (wrapping the now-final handlers): `goCheckout` logged-in branch, `goRefill`, `goUsed`. Twin summary cards: disambiguate the two byte-identical markup edits by including each card's first child row. The unified app-bar (P4) IS the form expand destination — do NOT author a separate hero band (double-chrome).
- *Why here:* wraps handlers finalized by P6-P8; expand markup dests must exist before a11y (P10) re-anchors the forms; composes with shipped hero/list/theme modes (disjoint names, one VT at a time).
- *Verify:* cart→checkout summary morphs; services/home tile→form reads as expand; composes with cover-slide; reduced-motion → plain nav.

### P10 — DEEPER A11Y · L · (R1-R28 markup LAST)
`FOCUSABLE`/`FORMS`/validators/`blurField`/`focusFirstError`; extend `handleKey` (+`trapTab`/`moveRadio`); rewrite `manageSheetA11y` (opener capture/restore); validate-gate `submitRefill`/`submitUsed` on P6's bodies (fail = summary + focus-first, NO loading); merge into **routing's** address-sheet closures (P3 versions); radio `checked`/`tab` + validation VM. A11y edits the patch CONTENTS nested inside P9's rerouted calls — a non-conflicting layer. Markup **R1-R28 ordered after ALL prior markup edits** (they supersede the `role="button"` focusable rows). CSS `.sr-only`/invalid/valid.
- *Why here:* must follow routing (targets its closures) + lifecycle (validate-gate wraps `run()`) + expand (dests exist); markup last so it re-anchors the final forms.
- *Verify (VoiceOver):* blur/summary announce; Tab-trap + Escape-restore; arrow-nav (sort selects-on-move, address moves-only).

### P11 — PHOTO-UPLOAD · M
Replace `rfPhotos`/`usPhotos` int counters with `rfPhotoList`/`usPhotoList` arrays (`[{id,url}]`, url=dataURL); `onRfPhotoPick`/`onUsPhotoPick` (FileReader→dataURL, cap 3/5, `e.target.value=''` for re-pick). Swap the mock add-`<button>` (L406/L489) for a `<label>`-wrapped hidden `<input type="file" accept="image/*" capture="environment" multiple>` **inside a11y's `#rf-a-photos`/`#us-a-photos` groups**; tiles render `background-image:url(dataURL)`. Owns the single edits: a11y's `validate(form,'photos')` → `.length`; `rfCanAddPhoto`→`length<3`; the merged `complete*` reset patches → `…PhotoList:[]`. **Lists stay OUT of `DURABLE`** (transient drafts; record shape unchanged — photos never stored).
- *Why here:* lands after a11y + lifecycle+delivery so it edits the final merged forms and owns the single `validate('photos')` + reset-patch edits.
- *Verify:* pick real images → thumbnails; remove works; cap enforced; re-pick same file works; validator + summary fire on empty; lists absent from `emdad:v1`.

### P12 — MICRO-VT + P2 POLISH · M
Independent fast-follows: auth OTP step-slide (`stepVT`, wrap both `sc-if` steps in one `min-height:210px` container — the pin is anti-morph), reverse card-morph (`closeMorph`, on-screen-target guard else fall to `back` cover-slide; detail back only), related-rail rise entrance (declarative `animation-timeline: view()`, scoped to the 2 rows, survives React attr-wipe), in-sheet pick→form. Plus: trust strip (from `PRODUCTS` spec data + Phase-5 SVGs), empty-state art (archetype glyphs), currency unit (`تومان` 11px class, lead the minus on discount rows).
- *Verify:* each surface animates; all reduced-motion-gated; no VT name collisions.

---

## 2. RECONCILED DATA SHAPES (set once — do not churn)

**State additions** on top of the existing initializer (L3-28):
```js
// lifecycle-loading (ephemeral; NOT persisted)
busy: null, openOrderNo: null, openReqCode: null,
// delivery-scheduling (drafts NOT persisted)
orderDelivery: '', coDay: '', coSlot: 'phone',
rfDay: '', rfSlot: 'phone', fsDelivery: '',
// deeper-a11y
rfTouched: {}, usTouched: {}, rfSubmitted: false, usSubmitted: false,
// photo-upload (REPLACES rfPhotos/usPhotos int counters; NOT persisted)
rfPhotoList: [], usPhotoList: [],
```
Routing, persistence, trust add **nothing to state** (routing uses instance fields `_histIdx`/`_pendingScroll`/etc.). `busy`/`openOrderNo`/`openReqCode` need no hydrate special-casing — excluded from `DURABLE`, they keep init defaults on reload.

**`DURABLE` whitelist (final):**
```js
['cart','wish','addresses','nextAddrId','orders','requests','loggedIn','userName','phone','addrId','theme']
```
Everything else (route, all `co*/rf*/us*` drafts incl. photo lists, `busy`, sheet flags, touched/submitted) is transient by design.

**Order record (final):** `{ no, date, stage, count, total, stamps, delivery }` — `stage` int (0-based into `ORDER_FLOW`), `stamps` `{stageIdx:'faTime'}`, `delivery` Farsi label or `''`. NO `status`/`statusKind` (derived from `flow[stage]`).

**Request record (final):** `{ kind, code, date, stage, stamps, delivery }` — `stage` int into `REFILL_FLOW`/`USED_FLOW` by `kind`; `delivery` present only for refill-home, else `''`.

Photos are NOT in either record (demo carries no images).

**"Set once" ≠ "add every field at P2."** Additive ephemeral fields (`busy`, `coDay`, …) may land at their consuming phase harmlessly. The one field-set that must be **atomic within its phase** is the photo counter→list swap: removing `rfPhotos`/`usPhotos` and adding `rfPhotoList`/`usPhotoList` happens entirely in P11 (the mock buttons read the counters; the file input reads the lists — a half-applied swap breaks the intermediate build). The rule this section enforces is *don't redesign the shape twice*, not *front-load every key*.

---

## 3. HOT-SPOT / CONFLICT MAP (the collisions + the ONE reconciled approach)

| Site | Touched by | Reconciled approach |
|---|---|---|
| `componentDidMount` (L67) | P2 persistence ●, P3 routing ●, P6 + | Author P2+P3 **adjacent**. Order: lang/dir → `hydrate()` → `applyTheme()` → seed-login **iff `!hydrated`** → routing block (scrollRestoration, instance fields, parseHash, entry seed/normalize, listeners, deep-link setState) → keydown → maps → sheetA11y → `_hydrated=true` → `persist()`. Hash wins for `route`; hydrate restores durable data (disjoint keys). |
| `componentDidUpdate` (L78) | P3 routing ●, P2 persistence +, P10 a11y + | Use **routing's navKey block** (replaces the L80-86 route-only block) + append `this.persist()` LAST. Do NOT copy persistence-doc's old route-only block. |
| `go()`/`nav()` + `DEPTH`/`ROUTE_TAB`/inline `activeMap` (L173-197, L610) | P3 ●, P8 trust +, P9 expand + | P3 **extends** `go(patch,opts)` with `pushNav`; keep GAP-B TAB_ORDER else-branch + add detail→detail `toKey` branch; `openMorph` reuses `pushNav` (GAP-A). Every new route (P8) updates **all four** maps together. |
| 9 back buttons (L170…804) | P3 (leaves alone), P4 ● | Routing does NOT touch them; **app-bar is the sole editor**, binds `goBack`. |
| `placeOrder`/`completeRefill`/`completeUsed` (L408-492) | P3 opts, P6 run●, P7 seed●, P10 validate, P11 reset | ONE version per handler: validate-gate (P10) → `if(busy)return`+`commitGuard` → `run(…)` → build `no`+`stage:0`+`stamps`+`delivery`(P7) → `go({…resets incl PhotoList:[], Touched:{}}, {replace:…})`. Union all keys. |
| orders/requests cards (L701/L733) | P6 timeline ●, P7 delivery row ●, P12 + | **ONE hand-written combined replacement per card** — bake `{{od.deliveryLabel}}`/`{{rq.hasDelivery}}` into P6's expandable-card replace strings. NEVER apply delivery 4e/4f standalone (Conflict C, top bug risk). |
| `goRefill`/`goUsed` (L653-654), `goCheckout` (L658) | P6 guard, P7 seed, P9 reroute●, P10 patch, P11 reset | Layered: P10 edits patch CONTENTS, P9 wraps the CALL in `expandTo`. P9 after P6-P8 so it wraps final handlers; a11y edits inside the rerouted patch. |
| forms markup (refill/used/checkout) | P6 CTA, P7 sched, P8 rx, P9 dest, P10 R1-R28 ● | Additive until P10; a11y's R1-R28 go **last** and supersede earlier `role="button"` rows. |
| gradient thumb / `data-hero-img` (L89/133/178/226) | P5 ● (SVG), shipped hero-morph | Illustrations swap gradient→SVG but **keep `data-hero-img`** and render the **same `PRODUCT_ART[pid]` at card thumb AND detail hero** → SVG→SVG interpolation; re-verify morph in P5 gate. |
| address-sheet closures (`openAddrForm`/`saveAddr`/`closeOverlays`) | P3 modal ●, P10 focus ● | P3 rewrites for history/modal-fold; P10 merges opener-capture/restore into **routing's** versions (not the originals). |
| `renderVals` field bag (L494-807) | all phases + | Additive; the combined orders/requests card + `vm.art` + scheduler VMs are the churn points. |
| `markup_edits.json` (strict exact-count) | P4●, P6●, P7●, P8●, P9●, P10● last, P11●, P12● | The only build-BREAKING surface (a stale find = hard error). Order edits so no batch invalidates a prior find-string; build+boot per batch, especially P4. |

---

## 4. IMMEDIATE PHASE-1 BUILD LIST (start now)

Not GSAP (dropped). Start the foundation:

1. **P0 routing spike (throwaway build).** In a scratch copy: wrap `history.pushState`/`replaceState` in `histWrite(entry,opts)` with a `try/catch(SecurityError)`; add a `popstate` listener that calls `nav(patch,'back')`. Open the built OUT in a browser via `file://`, tap a card, hit hardware Back — confirm no `SecurityError` and the back-VT direction fires. Confirm `data-vt="expand"` reads as a container morph in the same scratch build. Discard.
2. **Confirm the build+boot gate on the current tree:** run `python3 …/scratchpad/build.py` → `BUILD OK`; open `Emdad Oxygen Shop - Enhanced.html`; console clean; `data-pid`/`data-cid` hooks present in OUT DOM.
3. **P1 token-snap (first shippable increment):** replace the JS dynamic style strings (`chipBase` L523, `navBase` L602, `dotStyle` L544/551, switch/knob L676-679) to reference `:root` tokens — whole-block replaces. **Do not touch any markup inline style that carries a `[style*=…]` hook.** Build; grep OUT for `background:var(--sur)` / `z-index:40` / `border-radius:20px 20px 0 0` (all must survive); visually confirm unchanged. Ship.
4. **P2 persistence kickoff:** add `STORE_KEY`/`SCHEMA_V`/`DURABLE` (§2) + `durableSlice`/`persist`/`hydrate` (hydrate discards `orders`/`requests` on version mismatch); wire `hydrate()` into `componentDidMount`, `persist()` last in `componentDidUpdate`; gate seed-login on `!hydrated`. Verify cart/theme/login survive reload, corrupt key → defaults, version bump drops stale orders without wiping cart.

---

## 5. GUARDRAILS (what NOT to do)

1. **Keep View Transitions for page/container morphs.** Route cover-slide, hero card-morph, theme reveal, list FLIP, and the new `expand`/`step` modes stay VT. Do NOT reimplement any of them in GSAP/JS.
2. **Do not add GSAP to the mainline.** Only exception: the optional post-v1.0 drag-to-dismiss appendix (A1), and only after its build.py manifest-injection spike proves offline boot + `gsap.matchMedia` reduced-motion gate, and only if explicitly committed.
3. **Do not churn the state shape or record shape.** Build to §2 once. `stage`+`stamps` replace `status`/`statusKind`; photo lists replace int counters; nothing new is persisted beyond the `DURABLE` whitelist.
4. **Do not break the load-bearing CSS substring hooks.** Token-snap touches JS dynamic strings only; hook-bearing markup inline styles (`[style*="background:var(--sur)"]`, `z-index:40`, `border-radius:20px 20px 0 0`) stay literally unchanged — a silent flatten has no console signal.
5. **VT name uniqueness / hygiene.** Unique name per capture; set source-name before `startViewTransition`; flip+set dest-name synchronously in the `setState` callback; clear in `.finished`. NEVER a static `view-transition-name` on hero/expander/app-bar (would fight the theme circle-reveal and the cover-slide). The app-bar stays UNNAMED.
6. **Do not motion-overload.** No new mainline card entrances beyond the scoped related-rail rise (2 rows, reduced-motion-gated). Every new JS helper opens with the `matchMedia('(prefers-reduced-motion: reduce)')` early-return → plain `setState`/`go`.
7. **Never apply delivery 4e/4f standalone** (Conflict C) and **never let routing touch the 9 back buttons** (app-bar owns them). One combined card replacement; one back-button editor.
8. **Bump `SCHEMA_V` at the P6 boundary** (and clear `emdad:v1` in dev) — P2-P5 orders are old-shape; the version gate (P2) auto-discards stale `orders`/`requests` on mismatch so the shipped artifact never feeds `record.stage=undefined` into `flow[]`. Manual clearing is the dev convenience; the version gate is the shipped safety.
9. **Two-tier gate after EVERY phase:** Tier-1 build (`BUILD OK`, every markup_edit hits its exact count, orig blocks verbatim); Tier-2 boot (open OUT in browser, console clean on every touched route, material-hook grep, reduced-motion reload, theme+persistence smoke). Build-OK is necessary, not sufficient — JS validity/CSS-hook integrity/boot only show in the browser.

---

## APPENDIX A1 — OPTIONAL POST-v1.0: GSAP DRAG-TO-DISMISS (do not start until 12 phases ship + explicit commit)
The one feature the shipped stack cannot do (finger-tracking, velocity-thrown, rubber-band sheet dismissal). Requires, in order: (1) extend build.py to inject `gsap-emdad.min.js` (core+Inertia+Draggable, gzip+base64) into the `__bundler/manifest` like Leaflet, re-extracting the template after the splice; script tag before the dc-runtime tag; (2) `ensureGsap()` register-guard mirroring the `window.L` retry; (3) `manageSheetDrag()` with a `_sheetDragEl` node-identity guard (sheets are `sc-if`-gated → destroyed on every in-sheet `setState`; a Draggable bound to the old node orphans) wired into didMount/didUpdate/willUnmount alongside `manageMaps`. Reduced-motion = keep drag live (functional), only make the inertia snap instant. DrawSVG checkmark and CustomWiggle shake are declined.
