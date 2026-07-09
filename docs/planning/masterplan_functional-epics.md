All anchors verified, advisor refinements folded in. Here is the plan.

---

# THE 7 FUNCTIONAL EPICS — refreshed, reconciled & sequenced

## 0. Current status (verified against the live files)

**All 7 epics are greenfield** — none are applied to `script_2.work.js` (808 L). Confirmed absent: `busy`/`stage`/`stamps`/`coDay`/`rfTouched`/persistence/hash-routing/`about`. Records are still the old frozen shape (`placeOrder` L481 emits `{no,date,status,count,total}`; `completeRefill` L408 emits `{kind,code,date,status,statusKind}`).

**The design docs are stale in two ways** (the CLAUDE.md warning is real):
1. **Line numbers drift** through the file (e.g. lifecycle cites `commitGuard L228`, it's now **L301**; `placeOrder L377`→**L481**; `ordersList L685`→**L792**). Anchor *strings* are still valid — I re-verified the load-bearing ones (orders card L701, requests card L733, photo tiles L399/L482, all 9 back-chevrons, markup_edits.json fully applied to markup_current.html).
2. **The motion layer grew *after* the docs were authored** (designs 17:12; script last touched 20:32). This created **two integration gaps the specs cannot know about** — the highest-value part of this refresh, below.

**Doc → epic map:** `a50f`=persistence, `a1d3`=routing, `a3d5`=lifecycle, `a20d`=delivery, `a270`=trust, `a7f9`=a11y, `a4b8`=photo-upload (**stub only — never finished**), `?.md`=`a3dc`=integration plan (identical dupes).

---

## 1. TWO GAPS THE STALE DOCS MISS (feature these — they silently break)

### GAP-A · `openMorph` bypasses `go()` → routing loses history on the primary flow
`openMorph` (L220-246, the card→detail hero-morph) grew after the routing spec. On the **happy VT path it calls `this.setState(patch, …)` directly (L232), not `go()`** — only the reduced-motion / no-thumb fallbacks call `go(patch)` (L223, L227). Since routing's thesis is "all nav flows through `go()`", tapping a product card would change route to `detail` **without pushing a history entry or updating the hash** → hardware-Back skips detail, deep-link URL never shows `#/product/…`.
**Fix (routing phase):** extract the history half of routing's rewritten `go` into a helper `pushNav(toRoute,toPid,opts)` (saveScroll → histWrite → `_histIdx++` → `_pendingScroll=0` → modal-fold). Then `go = pushNav + nav(dir)` and **`openMorph` = `pushNav` + its own hero VT**. Key the push off **`navKeyOf` not `route`** (a "related" card is detail A→detail B, same route/new pid, still must push). Push **only on the VT branch** — the fallbacks already `go()`, so guard against a double-push.

### GAP-B · routing's `go` rewrite regresses the `TAB_ORDER` nav slide
Current `go` (L195) gives same-depth sibling tabs an L/R direction: `dir = TAB_ORDER.indexOf(tabOf(to)) >= TAB_ORDER.indexOf(tabOf(from)) ? 'forward' : 'back'`. Routing's rewritten dir-calc collapses `dd===0 → 'fade'`, and CSS maps `fade`→same keyframes as `forward` (style L134-135 == L128-129), so **profile→home would animate forward**. **Fix:** keep routing's new detail→detail `toKey` branch **but restore the `TAB_ORDER` else-branch** for same-depth siblings instead of `'fade'`.

---

## 2. PHOTO-UPLOAD — reinstated, fresh design (carries more uncertainty)

The task lens **explicitly names "real photo upload" as one of the 7**, which overrides the integration plan's "dropped (null spec)" — it was dropped only because doc `a4b8` never got past orientation, not because it's unwanted. **Unlike the other six, it has no verified design doc; the below is my fresh design.**

- **State (source of truth = arrays; drop the int counters):** replace `rfPhotos:0`/`usPhotos:0` with `rfPhotoList:[]`, `usPhotoList:[]` (`[{id,url}]`, `url`=dataURL). Because photo-upload **lands last**, it owns the single edits: a11y's `validate(form,'photos')` reads `s.rfPhotoList.length < 1`; `rfCanAddPhoto`→`length<3`, `usCanAddPhoto`→`length<5`; `rfTiles`/`usTiles` map the list (each `{url, thumbStyle:'…background-image:url('+url+')…', remove: byId}`).
- **Mechanism:** replace the mock add-`<button onclick="{{ rfAddPhoto }}">` (L406/L489) with a `<label>`-wrapped **hidden `<input type="file" accept="image/*" capture="environment" multiple onchange="{{ onRfPhotoPick }}">`** (label carries the current dashed-tile styling; input is uncontrolled). Handler: read `e.target.files`, `FileReader.readAsDataURL` each up to cap, push to list, `setState` (clear `rfErrs.photos`), then `e.target.value=''` so re-picking the same file re-fires.
- **Persistence:** lists are transient form drafts → **stay OUT of `DURABLE`** (persistence §7's base64-quota warning; they're not in the whitelist, so safe by default). **Record shape is unchanged** — photos were never stored on the order/request.
- **Composition:** input sits **inside a11y's `#rf-a-photos`/`#us-a-photos` group** (keeps `aria-invalid`/`aria-describedby`/summary-jump working); `<label>`+input is natively keyboard-accessible; add is plain `setState` (no VT); reset patches in `completeRefill`/`completeUsed` swap `rfPhotos:0`→`rfPhotoList:[]`.
- **Effort M.** Risks: memory from many large dataURLs (mitigate: cap count; optional canvas downscale); never persist.

---

## 3. RECONCILED FINAL STATE ADDITIONS (union — build to this once, don't churn)

On top of the existing initializer (L3-28):
```js
// lifecycle-loading  (ephemeral; NOT persisted)
busy: null, openOrderNo: null, openReqCode: null,
// delivery-scheduling  (drafts NOT persisted; labels are draft too)
orderDelivery: '', coDay: '', coSlot: 'phone',
rfDay: '', rfSlot: 'phone', fsDelivery: '',
// deeper-a11y
rfTouched: {}, usTouched: {}, rfSubmitted: false, usSubmitted: false,
// photo-upload  (REPLACES rfPhotos/usPhotos int counters; NOT persisted)
rfPhotoList: [], usPhotoList: [],
```
Routing adds **nothing to state** (all instance fields). Persistence adds **nothing to state**. Trust adds **nothing to state**. `busy`/`openOrderNo`/`openReqCode` need no hydrate special-casing — they're excluded from `DURABLE`, so they keep init defaults on reload.

**`DURABLE` (persistence whitelist — final):** `['cart','wish','addresses','nextAddrId','orders','requests','loggedIn','userName','phone','addrId','theme']`. Everything else (route, all `co*/rf*/us*` drafts incl. photo lists, `busy`, sheet flags, touched/submitted) is transient by design.

## 4. RECONCILED FINAL RECORD SHAPE (so orders/requests markup is authored once)

- **Order:** `{ no, date, stage, count, total, stamps, delivery }` — `stage` int (0-based into `ORDER_FLOW`), `stamps` `{stageIdx:'faTime'}`, `delivery` Farsi label or `''`. **No `status`/`statusKind`** (lifecycle derives status text from `flow[stage]`; `reqChip` L626 is deleted).
- **Request:** `{ kind, code, date, stage, stamps, delivery }` — `stage` int into `REFILL_FLOW`/`USED_FLOW` by `kind`; `delivery` present only for refill-home, else `''`.
- **Photos are NOT in the record** (demo carries no images).

---

## 5. HOT SPOTS everyone touches (coordinate here or merges silently revert)

| Site | Touched by | Merge rule |
|---|---|---|
| **`componentDidMount`** L67-77 | persistence, routing | order: lang/dir → `hydrate()` → `applyTheme()` → seed-login **only if `!hydrated`** → routing block (scrollRestoration, instance fields, parseHash, seed/normalize entry, listeners, deep-link `setState`) → keydown → maps → sheetA11y → `_hydrated=true` → `persist()`. Hash wins for `route`; hydrate restores durable data (disjoint keys). |
| **`componentDidUpdate`** L78-89 | routing, persistence | **Use routing's navKey block** (replaces the L80-86 route-only scroll/focus block) **+ append `this.persist()` last.** (Persistence's doc still shows the old route-only block — don't copy it.) `persist()` does no setState/DOM → never fights VT. a11y/lifecycle ride the existing `manageSheetA11y`/`manageMaps` calls. |
| **`go()`** L188-197 | routing (+ GAP-A/B) | rewrite = `pushNav`+`nav`; **keep TAB_ORDER else-branch (GAP-B)**; add detail→detail `toKey` branch; `openMorph` reuses `pushNav` (GAP-A). |
| **`placeOrder`** L481 | lifecycle × delivery × routing × persistence | one version: `if(busy)return` → `commitGuard` → `run('order',…)` → inside: build `no`, `delivery=scheduleLabel(coDay,coSlot)`, seed `{…stage:0,stamps:{0:nowFa()},delivery}`, `go({…,orderDelivery:delivery,coDay:'',coSlot:'phone'}, {replace:true})`. |
| **`completeRefill`/`completeUsed`** L408-425 | lifecycle × delivery × a11y × routing × photo | union all keys: `stage/stamps`, `delivery`/`fsDelivery`, `rf*/us*` resets **incl. `rfPhotoList:[]`/`usPhotoList:[]`**, `rfTouched:{}/rfSubmitted:false`, `{replace: state.route==='auth'}`. |
| **`submitRefill`/`submitUsed`** L426-451 | a11y × lifecycle | validate-gate FIRST (a11y summary + focus-first, no loading on failure) → `run('refill'/'used', …)` success path. |
| **`renderVals`** L494-807 | all | additive; the three-way orders/requests card + VM swaps are the churn point (below). |
| **`ROUTE_TAB` L175 + `activeMap` L610** | routing, trust, lifecycle | **redundant double-map** — every new route needs both. `tabOf('about')` falls back to `'home'` so trust's activeMap-only edit is harmless, but flag the double-maintenance; consider collapsing to one map during routing. |

---

## 6. CORRECTLY-SEQUENCED BUILD ORDER (build+boot at every step)

**Order is load-bearing — reordering silently reverts reconciled logic.**

**Phase 1 — Persistence** (S). `STORE_KEY`/`DURABLE` consts + `durableSlice`/`persist`/`hydrate` (with cart/wish pruning + addr reconcile); `hydrate()` first in didMount, gated seed-login, `persist()` appended to didUpdate. *Check:* cart/theme/login survive reload; corrupt key → seeded defaults; no flash.

**Phase 2 — Routing** (L). Foundation; owns `route` via hash → must precede any route-adding epic. `ROUTE_PATH`/`navKeyOf`/`hashFor`/`parseHash`/`histWrite`/`saveScroll`/modal helpers/`goBack`/`applyPop`/`applyHash`; **`pushNav` extraction + `go` rewrite with GAP-A (openMorph) and GAP-B (TAB_ORDER) fixes**; mount/didUpdate/unmount wiring; convert `placeOrder`→`{replace:true}` (interim), `completeRefill/Used` opts, `authBack`, `saveAddr`, `closeOverlays`; 4 back-chevron markup pairs (goProducts×1, goCart×1, goServices×2, goProfile×4). *Check (file://):* no SecurityError; card-tap updates `#/product/…` **and** Back returns to it (GAP-A); tab slides keep direction (GAP-B); deep-links + bad-hash→home; sheet-Back closes sheet.

**Phase 3 — Lifecycle** (L). Defines the record shape + `orderVm`/`requestVm`/`run()` that delivery/a11y build on. FLOW consts, `nowFa`/`run`/`statusChip`/`stepsVm`/`orderVm`/`requestVm`/`advanceOrder`/`advanceRequest`/`applyDisc`; `_busyT` unmount; rewrite otp/complete*/place* to `stage`+`stamps` (**merge Phase-2 routing opts**); busy/CTA renderVals + `ordersList/requestsList`→VMs; 7 CTA markup pairs + **expandable orders/requests cards**; CSS `.sp`/spinner/reduced-motion-hide. *Tell tester to clear `emdad:v1`* (Phase 1-2 orders are old-shape). *Check:* CTA spins→forward-VT; double-tap=1 order; timeline advance + chip bounce; reduced-motion hides spinner.

**Phase 4 — Delivery** (M). Adds `delivery` to Phase-3's shape. `SLOTS` + `dayList`/`firstAvailSlot`/`scheduleLabel`/`scheduleVM`; **merge** delivery keys into Phase-3 place/complete patches; state fields; `co*/rf*` scheduler + success-label renderVals; **fold `deliveryLabel` INTO `orderVm`/`requestVm`**; markup 4a/4b/4c/4d + **bake the delivery row into Phase-3's card replacement (do NOT ship 4e/4f standalone — see Conflict C)**; CSS `[data-day-rail]`. *Check:* day-rail + slots + phone-fallback, never two lit; label on success + orders list.

**Phase 5 — Trust** (M). Isolated + additive; needs routing's `ROUTE_PATH`. Content consts; `about:1`→`DEPTH` **AND `about:'/about'`→routing's `ROUTE_PATH`** (else `#/about` won't deep-link); `activeMap.about='home'`; menuRows entry; `curVm` safety/Rx flags (`showRx = isCylinder && isMedical` — excludes the `mano` accessory); renderVals `isAbout`/`goAbout`/arrays; markup A/B/C — **about-back binds `{{ goBack }}` (routing), not `goHome`**. *Check:* home strip→about forward-VT + deep-link; per-product gating (oxy40 full, co2 no-oil/no-Rx, mano none).

**Phase 6 — Deeper a11y** (L). Woven in LAST of the form epics; its submit/address-sheet rewrites must target the routing/lifecycle-modified bodies. `FOCUSABLE`/`FORMS`/validators/`blurField`/`focusFirstError`; extend `handleKey` (+`trapTab`/`moveRadio`); rewrite `manageSheetA11y` (opener capture/restore); validate-gate submit (on Phase-3 bodies); merge into **routing's** address-sheet closures (§J of integration plan); radio `checked`/`tab` + validation VM; markup R1-R28 **ordered after all prior markup edits**; CSS `.sr-only`/invalid/valid. *Check (VoiceOver):* blur/summary announce; Tab-trap + Escape-restore; arrow-nav (sort selects-on-move, address moves-only).

**Phase 7 — Photo-upload** (M, my fresh design). Lands last so it edits the final merged forms. `rfPhotoList/usPhotoList` arrays replace counters; `onRfPhotoPick/onUsPhotoPick` (FileReader→dataURL→cap); update a11y's `validate('…','photos')` to `.length`, `rfCanAddPhoto`/`rfTiles` VM, and `complete*` reset patches; markup: swap mock add-buttons for `<label>`+hidden file input (inside `#rf-a-photos`/`#us-a-photos`), tiles render `background-image:url(dataURL)`. *Check:* pick real images → thumbnails; remove works; cap enforced; re-pick same file works; validator + summary still fire on empty; lists absent from `emdad:v1`.

---

## 7. CROSS-EPIC CONFLICT MAP (carry these verbatim — the traps that silently break)

- **Conflict C (top risk):** author **ONE combined orders/requests card replacement** per card. Delivery's 4e/4f find-string lives verbatim inside lifecycle's expandable-card replacement; applied sequentially it injects the delivery row **inside lifecycle's `role="button"` toggle header** — wrong. Bake `{{ od.deliveryLabel }}`/`{{ rq.hasDelivery }}` row into lifecycle's replace strings; never apply 4e/4f alone. Anchors confirmed live at **L701 / L733**.
- **`componentDidUpdate`:** use **routing's navKey block + `persist()` appended** — not persistence's doc copy (still shows the old route-only block).
- **`go()`:** GAP-A (openMorph via `pushNav`) + GAP-B (TAB_ORDER) — both must be in the Phase-2 rewrite or the shipped card-morph history + tab-slide direction regress.
- **Trust routing:** `about` in `ROUTE_PATH` (not just `DEPTH`); about-back = `goBack`.
- **a11y after routing AND lifecycle:** address-sheet + submit rewrites target the modified bodies; markup R1-R28 supersede markup_edits.json's `role="button"` focusable rows.
- **Photo after a11y AND lifecycle+delivery:** owns the single `validate('photos')`→`.length` edit and the merged `complete*` reset patches.
- **localStorage shape drift:** clear `emdad:v1` at the Phase-3 boundary (old-shape orders look "stuck at ثبت‌شده").

## 8. Motion-layer interactions (don't fight the shipped VTs)

`persist()` never setStates/touches DOM → invisible to VT. All lifecycle navigation happens **inside `run()`'s work (after `busy` clears)** → VT never snapshots a spinner. Scheduler/photo/validation are plain `setState` (no route change) → no VT fires, correct. Routing's Back reuses the shipped `data-vt="back"` keyframes for free. `openMorph`'s hero VT stays (GAP-A only adds the history push, not a nav()). All new surfaces respect the shipped `prefers-reduced-motion` block. React re-render wipes imperative attrs → every hook (`data-*`, ids, roles) lives in the template/markup edits, never one-shot DOM mutation.

**Files:** all logic → `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`; markup pairs → `markup_edits.json` (against `markup_current.html`); CSS → `style_3.work.css`; then `build.py` reassembles `emdad.html`.