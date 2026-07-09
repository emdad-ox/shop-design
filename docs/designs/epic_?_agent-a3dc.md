# EMDAD OXYGEN — INTEGRATION PLAN (single source of truth)

Files: `script_2.work.js`, `style_3.work.css`, `markup_edits.json` (against `markup_current.html`). Build & verify one phase at a time. **`photo-upload` is null → dropped entirely; no phase.** The `rfPhotos`/`usPhotos` integer counters stay as-is and a11y's `photos` validator keys off the count — no dangling dependency.

---

## 1) RECOMMENDED BUILD ORDER

| # | Epic | One-line rationale |
|---|------|--------------------|
| 1 | **persistence** | Foundation; establishes `hydrate()`/`persist()` and the mount/update hooks everything else extends. Opaque-array record handling means it's shape-agnostic. |
| 2 | **routing-history** | Foundation; extends the *same* `componentDidMount`/`componentDidUpdate` persistence just touched (do them adjacent to reconcile the shared methods once). Owns `route` via hash — must land before any epic that adds a route. |
| 3 | **lifecycle-loading** | Defines the canonical **order/request record shape** (`stage`+`stamps`) and the `orderVm`/`requestVm`/`run()` primitives that delivery and a11y build on. Must precede both shape-touching epics. |
| 4 | **delivery-scheduling** | Adds `delivery` to the shape lifecycle just defined; folds `deliveryLabel` into lifecycle's VMs and into the (already-rewritten) orders/requests markup. |
| 5 | **trust-content** | Additive new `about` route + static content; needs routing's `ROUTE_PATH`/`DEPTH` present so `#/about` deep-links parse. Low-risk, isolated. |
| 6 | **deeper-a11y** | Validation woven into forms **last**; its submit-handler and address-sheet rewrites must target the lifecycle/routing-modified versions, and its markup R1–R28 supersede earlier `role="button"` entries. |

photo-upload: **skipped** (null spec).

---

## 2) CROSS-EPIC CONFLICT MAP

**A. Order/request record shape — lifecycle × delivery (× persistence).**
lifecycle removes frozen `status`/`statusKind`, adds `stage`+`stamps`. delivery keeps `status` and adds `delivery`. **Reconciled: drop `status`/`statusKind`, keep lifecycle's `stage`+`stamps`, and carry delivery's `delivery` string.** Status text is derived in `orderVm`/`requestVm` from `flow[stage]`. `reqChip` is deleted (lifecycle) — delivery's use of it disappears with its dropped mapping. Persisted arrays carry `stage`/`stamps`/`delivery` (all JSON-safe).

**B. `renderVals().ordersList`/`requestsList` — lifecycle × delivery.**
lifecycle replaces both with `s.orders.map(o=>this.orderVm(o))` / `requestVm`. **Reconciled: lifecycle's VM helpers win; fold delivery's label INTO them:** in `orderVm` add `deliveryLabel: o.delivery || 'هماهنگی تلفنی'`; in `requestVm` add `deliveryLabel: r.delivery || '', hasDelivery: !!r.delivery`. Delivery's standalone success-screen fields (`orderDeliveryLabel`, `fsDeliveryLabel`, `fsHasDelivery`, `co*`/`rf*` scheduler fields) are independent renderVals additions — keep as-is.

**C. Orders/Requests card markup — lifecycle × delivery (THREE-WAY, highest churn risk).**
lifecycle rewrites each card into an expandable row + timeline. delivery's edits 4e/4f inject a delivery row — and delivery's find-string (`{{ od.date }} · {{ od.countLabel }} کالا …` block) **exists verbatim inside lifecycle's replacement**. Applied sequentially, delivery would inject the row *inside lifecycle's `role="button"` toggle header* — wrong placement. **Reconciled: author ONE hand-written combined replacement per card.** Decision: the delivery label lands in the **collapsed summary** (inside lifecycle's toggle header, appended after the date/total row as a dashed-top row) so it's visible without expanding. Do NOT ship 4e/4f as separate edits — bake `{{ od.deliveryLabel }}` / the `{{ rq.hasDelivery }}`-gated row directly into lifecycle's orders/requests `replace` strings. This is the single highest-risk merge; give it a dedicated verification step.

**D. `placeOrder` — lifecycle × delivery × routing (× persistence).**
lifecycle wraps body in `run('order', …)` and switches to `go()`. delivery adds `delivery`/`orderDelivery` + resets `coDay/coSlot`, seeds record `delivery`. routing wants `go(patch, {replace:true})` so Back from success → cart. persistence: covered by the `componentDidUpdate` hook. **Reconciled single version:**
```js
placeOrder = () => {
  if (this.state.busy) return;
  if (!this.commitGuard()) return;
  this.run('order', () => {
    const t = this.cartTotals();
    const parts = new Intl.DateTimeFormat('en-u-ca-persian', { year:'numeric', month:'2-digit' }).formatToParts(new Date());
    const y = parts.find(x=>x.type==='year').value, m = parts.find(x=>x.type==='month').value;
    const no = 'EO-'+String(y).slice(-4)+m+'-'+String(Math.floor(1000+Math.random()*9000));
    const delivery = this.scheduleLabel(this.state.coDay, this.state.coSlot);
    this.go({
      route:'success', orderNo:no, orderDelivery:delivery, cart:{}, disc:null, discInput:'', note:'',
      coDay:'', coSlot:'phone',
      orders:[{ no, date:this.todayFa(), stage:0, count:t.count, total:t.total, stamps:{0:this.nowFa()}, delivery }, ...this.state.orders]
    }, { replace:true });   // routing: drop checkout entry → Back from success = cart
  });
};
```

**E. `completeRefill` / `completeUsed` — lifecycle × delivery × a11y × routing.**
All four add keys to the SAME `go()` patch. **Reconciled: union all keys.** completeRefill:
```js
completeRefill() {
  if (!this.commitGuard()) return;
  const c = this.code('RC');
  const delivery = this.state.rfDelivery === 'home' ? this.scheduleLabel(this.state.rfDay, this.state.rfSlot) : '';
  this.go({
    requests:[{ kind:'refill', code:c, date:this.todayFa(), stage:0, stamps:{0:this.nowFa()}, delivery }, ...this.state.requests],
    route:'formSuccess', fsKind:'refill', fsCode:c, fsDelivery:delivery,
    rfPhotos:0, rfGas:'', rfDelivery:'', rfAddr:'', rfNotes:'', rfErrs:{},
    rfDay:'', rfSlot:'phone', rfTouched:{}, rfSubmitted:false
  }, { replace: this.state.route === 'auth' });   // routing: drop transient auth screen
}
```
completeUsed mirrors it with `fsDelivery:''` (delivery's stale-label fix), `us*` resets, `usTouched:{}, usSubmitted:false`, and `{ replace: this.state.route === 'auth' }`.

**F. `submitRefill` / `submitUsed` — a11y × lifecycle × delivery.**
a11y owns validation+focus; lifecycle wraps success in `run()`. **Reconciled: validate-gate first (no loading on failure), then `run()` the success path:**
```js
submitRefill = () => {
  const errs = this.validateForm('refill');
  if (Object.keys(errs).length) { this.setState({ rfErrs:errs, rfTouched:this.touchAll('refill'), rfSubmitted:true }); this.focusFirstError('refill', errs); return; }
  this.setState({ rfErrs:{}, rfSubmitted:false });
  this.run('refill', () => {
    const s = this.state;
    if (!s.loggedIn) { this.setState({ authPhone:s.rfPhone }); this.goAuthFor('refill','refill','refill'); this.toast('برای تأیید شماره، کد پیامکی ارسال می‌شود'); return; }
    this.completeRefill();
  });
};
```
Delivery's optional slot-required validation is **not enabled** (default `'phone'` is always valid) — respects the "don't add friction" bar.

**G. `componentDidMount` — persistence × routing (× a11y/lifecycle: no change).**
**Reconciled order:** `document.documentElement` lang/dir → `hydrate()` → `applyTheme()` → seed-login *only if `!hydrated`* → **routing block** (`scrollRestoration='manual'`, init instance fields, `parseHash`, seed/normalize history entry, add popstate/hashchange/scroll listeners, deep-link `setState` if hash≠home) → keydown listener → `manageMaps()` → `manageSheetA11y()` → `_hydrated=true` → `persist()`. Disjoint keys: hydrate restores durable data (NOT route); routing's hash `setState` sets route. Hash wins for route by construction.

**H. `componentDidUpdate` — routing × persistence (× a11y/lifecycle via existing hooks).**
**Reconciled:** `applyTheme()` (top) → **routing's navKey block** (replaces the old `route`-only scroll block: navKey-based `_pendingScroll` scroll restore + `[data-route-focus]`/`h1` focus with `preventScroll` + defensive hash-reflect) → `manageMaps()` → `manageSheetA11y()` (a11y's superset: opener-capture + focus-in + restore-on-close) → `this.persist()` (last, observes committed durable state). `persist()` does no setState/DOM → never fights VT.

**I. `handleKey` — a11y extends the shipped version.** Escape + role=button preserved; Tab-trap and radio arrow-nav added ahead. No other epic touches it.

**J. Address-sheet closures — routing × a11y (openAddrForm, sheetAddrs[].pick, saveAddr, closeOverlays).** a11y must edit **routing's** versions (why a11y lands after routing). Merged:
- **`openAddrForm`**: routing's `pushModal('addr')` + a11y's focus-title callback:
```js
const openAddrForm = (a) => {
  const f = { adEditId:a?a.id:null, adTitle:a?a.title:'', adText:a?a.text:'', adErr:'', adLat:a?a.lat:35.7219, adLng:a?a.lng:51.3347 };
  const focusCb = () => requestAnimationFrame(() => { const el=document.getElementById('addr-form-title'); if(el){try{el.focus()}catch(e){}} });
  if (this.state.addrSheet) this.setState({ addrSheet:'form', ...f }, focusCb);
  else { this.pushModal('addr'); this.setState({ addrSheet:'form', addrSheetTarget:null, ...f }, focusCb); }
};
```
- **`sheetAddrs[].pick`**: keep a11y's `checked`/`tab` roving fields on the object, but the pick body uses routing's history-close:
```js
pick: () => { if (s.addrSheetTarget==='refill') this.setState({rfAddrId:a.id}); else this.setState({addrId:a.id}); this.closeAnyModal(); },
```
Composition path (verify): `closeAnyModal` → `history.back` → `applyPop` sets `addrSheet:null` → re-render → `manageSheetA11y` sees no sheet → restores focus to opener.
- **`saveAddr`**: routing's version (drop `addrSheet:null` from patches, append `this.closeAnyModal()`).
- **`closeOverlays`**: routing's version (sheets close via `closeAnyModal`).

**K. `DEPTH` / `ROUTE_PATH` / `activeMap` — routing × trust.** Trust adds `about:1` to `DEPTH` **and must also add `about:'/about'` to routing's `ROUTE_PATH`** (else `hashFor('about')`→`/` and `#/about` won't deep-link; `parseHash`'s reverse lookup then works automatically). Trust's `activeMap.about='home'` stands. Trust's about back button binds **`{{ goBack }}`** (routing), not `{{ goHome }}`, for history consistency.

---

## 3) RECONCILED DATA SHAPES

**Final `state` additions (union, on top of existing initializer):**
```js
// lifecycle-loading
busy: null, openOrderNo: null, openReqCode: null,
// delivery-scheduling
orderDelivery: '', coDay: '', coSlot: 'phone',
rfDay: '', rfSlot: 'phone', fsDelivery: '',
// deeper-a11y
rfTouched: {}, usTouched: {}, rfSubmitted: false, usSubmitted: false,
```
`busy`/`openOrderNo`/`openReqCode` need **no** hydrate special-casing — persistence's `DURABLE` excludes them, so they keep state-init defaults on reload (retires lifecycle's stated "force busy:null" concern).

**Persistence `DURABLE` (unchanged):** `['cart','wish','addresses','nextAddrId','orders','requests','loggedIn','userName','phone','addrId','theme']`. `route`, all `co*`/`rf*`/`us*` drafts, `busy`, `sheet*`, touched/submitted — all transient, excluded.

**Instance/class (non-state):** persistence `STORE_KEY`/`DURABLE`/`_lastPersist`/`_hydrated`; routing `_histIdx`/`_modalDepth`/`_scrollByKey`/`_pendingScroll`/`_popping`/`_lastPop`/`_selfHash`/listener refs + `ROUTE_PATH`; lifecycle `ORDER_FLOW`/`REFILL_FLOW`/`USED_FLOW`/`_busyT`; delivery `SLOTS`; a11y `FOCUSABLE`/`FORMS`/`_sheetOpener`; trust `TRUST`/`CERTS`/`WHYUS`/`WARRANTY`/`SAFETY_CYL`/`SAFETY_O2`.

**Final order record:** `{ no, date, stage, count, total, stamps, delivery }` — `stage` int (0-based into `ORDER_FLOW`), `stamps` `{stageIndex: 'faTime'}`, `delivery` Farsi label or `''`. No `status`/`statusKind`.

**Final request record:** `{ kind, code, date, stage, stamps, delivery }` — `stage` int into `REFILL_FLOW`/`USED_FLOW` by `kind`, `delivery` present only for refill-home (`''` otherwise). No `status`/`statusKind`.

---

## 4) PHASED CHECKLIST

**Phase 1 — Persistence.** Add persistence consts + `durableSlice`/`persist`/`hydrate`; insert `hydrate()`+`applyTheme()`+gated seed into `componentDidMount`; append `persist()` to `componentDidUpdate`. (Optional reset button.)
*Check:* add 2 cart items → reload → cart+badge restored; `emdad:v1` present as `{"v":1,"s":{…}}`. Toggle dark → reload → boots dark, no flash. Logout → reload → stays logged out. Corrupt the key → reload → seeded defaults, clean console.

**Phase 2 — Routing/History.** Add `ROUTE_PATH`/`navKeyOf`/`hashFor`/`parseHash`/`histWrite`/`saveScroll`/modal helpers/`goBack`/`applyPop`/`applyHash`; extend `go(patch,opts)`; wire mount (after Phase-1 hydrate) + replace didUpdate route block with navKey block + `componentWillUnmount`. Convert placeOrder→`go(…,{replace:true})` (interim), completeRefill/Used opts, authBack, saveAddr, closeOverlays; renderVals handler swaps + 4 markup back-chevron pairs.
*Check (file://):* no `SecurityError`; products→detail→cart updates `#/…`; hardware Back restores route+scroll with back-direction VT; deep-link `#/product/oxy10` and bad `#/nope`→home; filter/address sheet Back closes sheet (no nav); Escape same; Forward button forward-VT.

**Phase 3 — Lifecycle.** Add FLOW consts, `nowFa`/`run`/`statusChip`/`stepsVm`/`orderVm`/`requestVm`/`advanceOrder`/`advanceRequest`/`applyDisc`; `_busyT` in unmount; rewrite sendOtp/verifyOtp/completeRefill/completeUsed (record shape stage/stamps, merge the routing opts from Phase 2), placeOrder (`run()`+`go({replace:true})`); renderVals busy/CTA block + `ordersList`/`requestsList`→VMs; 7 CTA markup pairs + expandable orders/requests cards; CSS `.sp`/spinner/reduced-motion. **Tell tester to clear `emdad:v1`** (Phase 1–2 orders are old-shape).
*Check:* checkout → CTA spins ~0.7s → forward-VT success; double-tap = 1 order. Orders row expands → timeline → advance stages ثبت‌شده→تحویل with stamps+chip bounce. Refill guest → spinner → auth → formSuccess → request timeline. reduced-motion → spinner hidden, no frozen ring.

**Phase 4 — Delivery.** Add `SLOTS` + `dayList`/`firstAvailSlot`/`scheduleLabel`/`scheduleVM`; **merge** delivery keys into Phase-3 placeOrder/completeRefill/completeUsed patches; add state fields; `co*`/`rf*` scheduler + success-label renderVals; **fold `deliveryLabel` into `orderVm`/`requestVm`**; markup: checkout scheduler (4a), refill scheduler (4b), success pills (4c/4d), and **bake the delivery row into Phase-3's orders/requests expandable replacement** (do NOT apply 4e/4f standalone); CSS `[data-day-rail]`.
*Check:* checkout shows day rail + slots + phone-fallback; tap فردا → slot auto-selects, phone un-lights, never two lit; place order → success pill + orders-list row show label. Refill home → scheduler fades in; store → hidden, no stale pill.

**Phase 5 — Trust.** Add content consts; `about:1`→`DEPTH` **and** `about:'/about'`→`ROUTE_PATH`; `activeMap.about='home'`; menuRows about entry; `curVm` safety/rx flags; renderVals `isAbout`/`goAbout`/content arrays; markup A (home strip), B (detail safety/rx/warranty), C (about route, back button = `{{ goBack }}`); CSS `[data-trust-scroll]`.
*Check:* home strip → about (forward VT, `#/about`, deep-link works); `oxy40` shows safety+hydro+Rx+warranty; `co2` 3 bullets no-oil no-Rx; `mano` no safety/Rx (gate regression). about `<h1>` focus on entry.

**Phase 6 — Deeper a11y.** Add `FOCUSABLE`/`FORMS`/validators/`blurField`/`focusFirstError`; extend `handleKey` (+`trapTab`/`moveRadio`); rewrite `manageSheetA11y` (opener capture/restore); rewrite submitRefill/submitUsed (validate-gate → `run()`, on Phase-3 bodies); merge into **routing's** address-sheet closures (openAddrForm/sheetAddrs.pick per §J); renderVals radio `checked`/`tab` + validation VM + blur hooks + goRefill/goUsed resets; markup R1–R28 (radio semantics, anchors, input blur/aria, error live-regions, summaries, toast SR mirror) — **ordered after all prior markup edits**; CSS `.sr-only`/invalid/valid/radio.
*Check (VoiceOver, Safari+Chrome):* blur empty refill phone → announced; submit empty → summary count announced + focus lands on photos group; add-to-cart toast read once. Tab-trap cycles inside open sheet, Escape restores focus to opener. Arrow-nav: sort selects-on-move; address sheet moves-only (Enter commits, doesn't dismiss on arrow).

---

## 5) RISKS & SEQUENCING PITFALLS

- **Out-of-order = broken merges.** a11y **must** follow routing (its address-sheet + submit rewrites target routing/lifecycle bodies, not originals) and follow lifecycle (validate-gate wraps `run()`). delivery **must** follow lifecycle (adds to the record shape lifecycle defines; folds into its VMs). trust **must** follow routing (needs `ROUTE_PATH`). Reordering silently reverts reconciled logic.
- **Orders/requests markup three-way merge (Conflict C) is the top bug risk.** Never apply lifecycle's card rewrite and delivery's 4e/4f as separate sequential edits — delivery's find-string lives verbatim inside lifecycle's replacement and would inject the row inside the toggle header. Author one combined replacement per card; verify placement visually.
- **localStorage shape drift across Phase 3.** Old-shape orders (Phase 1–2) render via `o.stage||0` but look "stuck at ثبت‌شده". Clear `emdad:v1` at the Phase 3 boundary during testing.
- **`route`/transient must never enter `DURABLE`.** If persistence ever restores `route`/`sheet`/`busy`, it fights routing's hash and lifecycle's spinner. Keep the whitelist exactly as specified.
- **VT vs. spinner ordering.** All navigation happens inside `run()`'s `work()` (after `busy` clears) and `persist()` never setStates — so VT never snapshots a spinner and persistence never perturbs transitions. Preserve this contract when merging placeOrder.
- **Simplify / cut (respect demo bar):** skip delivery's optional slot-required validation (keep `'phone'` default). Keep photos as integer counters (photo-upload dropped). Keep persistence's optional reset button optional. Don't persist scheduler drafts (`co*`/`rf*` day/slot) — re-deriving a valid `'phone'` default on reload is correct and avoids stale day-keys.