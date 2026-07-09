I have everything I need. The architecture is validated; the one hardening the advisor flagged (file:// `pushState` possibly throwing `SecurityError`) is folded in via a `histWrite` wrapper. Here is the complete, integrable design.

---

# EPIC: Client routing + History/Back + Scroll restoration

**Design thesis:** the URL hash is the source of truth for `{route, pid}`. All programmatic navigation flows through the existing `go(patch)`; every *traversal* (hardware Back/Forward, scrim tap, Escape, on-screen back chevron) flows through `history.back()` → one `popstate` handler (`applyPop`). Loops are broken by **navKey-equality idempotency** (not a suppress flag). Sheets become history entries so Back closes them first. All bookkeeping lives in **instance fields, never in `state`** — so it stays out of any persistence snapshot and the hash always wins on load.

Files to edit: `script_2.work.js` (all logic), `markup_current.html` via `markup_edits.json` (4 find/replace pairs). **No CSS changes** and **no new `state` fields** are required.

---

## (1) New state fields — NONE (by design)

Nothing is added to `state`. This is deliberate: it's the clean seam with the Persistence epic (see §7). All routing bookkeeping is instance fields, initialized in `componentDidMount`:

```
this._histIdx      // monotonic index stamped into each history entry (direction inference)
this._modalDepth   // 0 or 1 — how many sheet entries we've pushed on top of the route
this._scrollByKey  // { [navKey]: scrollY } in-memory scroll cache, keyed by route(+pid)
this._pendingScroll// scrollY to apply on the next route-change render (null = top)
this._popping      // true while applyPop's nav() is committing (suppresses the didUpdate safety-net)
this._lastPop      // timestamp — lets hashchange ignore a change a popstate already handled
this._selfHash     // true briefly when histWrite fell back to location.hash= (ignore that hashchange)
this._onPop / _onHash / _onScroll / _hashT / _selfHashT / _scrollRaf  // listener refs & timers
```

---

## (2) New / modified methods (real JS, matching file style)

### 2a. Route↔hash map + helpers (NEW — add near `DEPTH`, ~L173)

```js
ROUTE_PATH = {
  home:'/', products:'/products', detail:'/product', cart:'/cart',
  checkout:'/checkout', success:'/success', auth:'/auth',
  services:'/services', refill:'/refill', usedSale:'/used', formSuccess:'/submitted',
  profile:'/profile', orders:'/orders', requests:'/requests',
  addresses:'/addresses', wishlist:'/wishlist'
};
navKeyOf(s) { return s.route === 'detail' ? 'detail:' + s.pid : s.route; }
hashFor(route, pid) {
  if (route === 'detail') return '#/product/' + encodeURIComponent(pid || '');
  return '#' + (this.ROUTE_PATH[route] || '/');
}
parseHash(h) {
  h = (h || '').replace(/^#/, '');
  if (!h || h === '/') return { route: 'home', pid: null };
  const seg = h.split('/').filter(Boolean);           // "/product/oxy40" -> ["product","oxy40"]
  if (seg[0] === 'product') {
    const pid = seg[1] ? decodeURIComponent(seg[1]) : null;
    const ok = this.PRODUCTS.some(p => p.id === pid);
    return { route: 'detail', pid: ok ? pid : this.PRODUCTS[0].id };
  }
  const found = Object.keys(this.ROUTE_PATH)
    .find(r => r !== 'detail' && this.ROUTE_PATH[r] === '/' + seg[0]);
  return found ? { route: found, pid: null } : { route: 'home', pid: null };
}
```

### 2b. History writer with file:// fallback (NEW — the load-bearing wrapper)

```js
// Single choke-point for every push/replace. file:// can reject fragment pushState with
// SecurityError; degrade to location.hash= and reuse the hashchange path.
histWrite(st, hash, replace) {
  try {
    if (replace) history.replaceState(st, '', hash);
    else history.pushState(st, '', hash);
  } catch (err) {
    this._selfHash = true;
    clearTimeout(this._selfHashT);
    this._selfHashT = setTimeout(() => { this._selfHash = false; }, 120);
    if (replace && location.replace) location.replace(hash);
    else location.hash = hash;
  }
}
saveScroll() {
  const y = window.scrollY || window.pageYOffset || 0;
  this._scrollByKey[this.navKeyOf(this.state)] = y;
  // 2-ARG form (no url) — passing '' as url would WIPE the fragment. Classic footgun.
  try { if (history.state) history.replaceState({ ...history.state, scroll: y }, ''); } catch (e) {}
}
```

### 2c. Modal-as-history helpers (NEW)

```js
pushModal(kind) {                                   // same hash; pushState still creates an entry
  const idx = this._histIdx + 1;
  this.histWrite({ route: this.state.route, pid: this.state.pid, idx, scroll: 0, modal: kind },
                 this.hashFor(this.state.route, this.state.pid), false);
  this._histIdx = idx; this._modalDepth++;
}
openSheetH()               { this.pushModal('sheet'); this.setState({ sheet: true }); }
openAddrSheetH(mode, tgt)  { this.pushModal('addr');  this.setState({ addrSheet: mode, addrSheetTarget: tgt, adErr: '' }); }
closeAnyModal() {                                   // unified close: pop the modal entry -> applyPop closes it
  if (this._modalDepth > 0) history.back();
  else this.setState({ sheet: false, addrSheet: null, addrSheetTarget: null });   // defensive
}
```

### 2d. `go(patch, opts)` — MODIFIED (extends the existing VT method with history + scroll)

```js
go(patch, opts) {
  const from = this.state.route;
  const to = patch && patch.route;
  const fromKey = this.navKeyOf(this.state);
  const toPid = patch && ('pid' in patch) ? patch.pid : this.state.pid;
  const toKey = to ? this.navKeyOf({ route: to, pid: toPid }) : fromKey;

  let dir = 'fade';
  if (to && to !== from) {
    const dd = (this.DEPTH[to] || 0) - (this.DEPTH[from] || 0);
    dir = dd > 0 ? 'forward' : dd < 0 ? 'back' : 'fade';
  } else if (toKey !== fromKey) {
    dir = 'forward';                                 // detail A -> detail B (same route, new product)
  }

  if (toKey !== fromKey) {
    this.saveScroll();                               // cache outgoing scroll on the entry we leave
    const idx = this._histIdx + 1;
    const st = { route: to, pid: toPid, idx, scroll: 0 };
    const replace = (opts && opts.replace) || this._modalDepth > 0;
    if (this._modalDepth > 0) {                      // navigating out from under a sheet: fold it closed
      patch = { ...patch, sheet: false, addrSheet: null, addrSheetTarget: null };
      this._modalDepth = 0;
    }
    this.histWrite(st, this.hashFor(to, toPid), replace);
    this._histIdx = idx;
    this._pendingScroll = 0;                          // forward nav lands at top
  }
  this.nav(patch, dir);                               // unchanged VT wrapper does the setState
}
```

### 2e. Caller-aware Back (NEW)

```js
parentRoute(route) {
  const P = { detail:'products', checkout:'cart', success:'home', auth:'profile',
    refill:'services', usedSale:'services', formSuccess:'services',
    orders:'profile', requests:'profile', addresses:'profile', wishlist:'profile' };
  return P[route] || 'home';
}
goBack(fallback) {
  if (this.state.addrSheet || this.state.sheet) { this.closeAnyModal(); return; }
  if (this._histIdx > 0) { this.saveScroll(); history.back(); return; }   // real Back → applyPop
  this.go({ route: fallback || this.parentRoute(this.state.route) });     // deep-linked first entry
}
```

### 2f. The traversal handler `applyPop` (NEW — the single source of truth for Back/Forward)

```js
applyPop(e) {
  this._lastPop = Date.now();
  const popped = (e && e.state) || history.state || null;

  // 1) Sheet-as-history: a Back that lands on a non-modal entry closes the open sheet, not the route.
  if (this.state.addrSheet && !(popped && popped.modal === 'addr')) {
    this._modalDepth = Math.max(0, this._modalDepth - 1);
    if (popped && typeof popped.idx === 'number') this._histIdx = popped.idx;
    this.setState({ addrSheet: null, addrSheetTarget: null, addrMenuId: null });
    return;
  }
  if (this.state.sheet && !(popped && popped.modal === 'sheet')) {
    this._modalDepth = Math.max(0, this._modalDepth - 1);
    if (popped && typeof popped.idx === 'number') this._histIdx = popped.idx;
    this.setState({ sheet: false });
    return;
  }

  // 2) Route sync — idempotent; THIS is the loop-breaker.
  const target = (popped && popped.route) ? popped : this.parseHash(location.hash);
  const curKey = this.navKeyOf(this.state);
  const tgtKey = this.navKeyOf({ route: target.route, pid: target.pid });

  let dir;
  if (popped && typeof popped.idx === 'number') {    // idx compare → correct for hardware FORWARD too
    dir = popped.idx < this._histIdx ? 'back' : popped.idx > this._histIdx ? 'forward' : 'fade';
    this._histIdx = popped.idx;
  } else {                                            // file:// fallback lost the state obj → DEPTH
    const dd = (this.DEPTH[target.route] || 0) - (this.DEPTH[this.state.route] || 0);
    dir = dd > 0 ? 'forward' : 'back';
    this._histIdx = Math.max(0, this._histIdx - 1);
  }

  if (tgtKey === curKey) return;                      // already there: no setState, no VT

  this._pendingScroll = (popped && typeof popped.scroll === 'number')
    ? popped.scroll : (this._scrollByKey[tgtKey] || 0);
  this._popping = true;
  this.nav({ route: target.route, pid: target.pid, addrMenuId: null }, dir);   // BACK-direction VT
}
```

### 2g. `hashchange` handler for manual URL edits / deep-links (NEW)

```js
applyHash() { clearTimeout(this._hashT); this._hashT = setTimeout(() => this.applyHashNow(), 0); }
applyHashNow() {
  if (this._selfHash) return;                          // our own histWrite fallback wrote this
  if (Date.now() - (this._lastPop || 0) < 80) return;  // a traversal already handled it
  const t = this.parseHash(location.hash);
  if (this.navKeyOf(t) === this.navKeyOf(this.state)) return;   // idempotent
  const idx = this._histIdx + 1;
  this.histWrite({ route: t.route, pid: t.pid, idx, scroll: 0 }, this.hashFor(t.route, t.pid), true);
  this._histIdx = idx; this._pendingScroll = 0; this._popping = true;
  const dd = (this.DEPTH[t.route] || 0) - (this.DEPTH[this.state.route] || 0);
  this.nav({ route: t.route, pid: t.pid }, dd > 0 ? 'forward' : dd < 0 ? 'back' : 'fade');
}
```

### 2h. `componentDidMount` — APPEND (after the existing `manageSheetA11y()` call, before the closing brace)

```js
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
this._histIdx = 0; this._modalDepth = 0; this._scrollByKey = {}; this._pendingScroll = null;

const t0 = this.parseHash(location.hash);
const seed = { route: t0.route, pid: t0.pid, idx: 0, scroll: 0 };
if (t0.route === 'home' && (!location.hash || location.hash === '#' || location.hash === '#/')) {
  try { history.replaceState(seed, ''); } catch (e) {}          // seed entry, keep clean URL
} else {
  this.histWrite(seed, this.hashFor(t0.route, t0.pid), true);   // normalize partial/invalid deep-link
}

this._onPop = (e) => this.applyPop(e);   window.addEventListener('popstate', this._onPop);
this._onHash = () => this.applyHash();   window.addEventListener('hashchange', this._onHash);
this._onScroll = () => {                                        // keep _scrollByKey fresh for current page
  if (this._scrollRaf) return;
  this._scrollRaf = requestAnimationFrame(() => {
    this._scrollRaf = 0;
    if (!this.state.sheet && !this.state.addrSheet)
      this._scrollByKey[this.navKeyOf(this.state)] = window.scrollY || window.pageYOffset || 0;
  });
};
window.addEventListener('scroll', this._onScroll, { passive: true });

if (this.navKeyOf(t0) !== this.navKeyOf(this.state))           // deep-link: switch off the default 'home'
  this.setState({ route: t0.route, pid: t0.pid || this.state.pid });   // plain setState → no VT on first paint
```

### 2i. `componentDidUpdate` — REPLACE the route-change block

Replace the existing:
```js
  if (prevState && prevState.route !== this.state.route) {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => { ...focus... });
  }
```
with:
```js
  if (prevState) {
    const prevKey = this.navKeyOf(prevState);
    const curKey  = this.navKeyOf(this.state);
    if (prevKey !== curKey) {                          // navKey (not just route) → covers detail A→B
      const y = (this._pendingScroll != null) ? this._pendingScroll : 0;
      this._pendingScroll = null;
      window.scrollTo(0, y);                            // scroll BEFORE the VT captures the new snapshot
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-route-focus]') || document.querySelector('h1');
        if (el && document.activeElement !== el) {
          el.setAttribute('tabindex', '-1');
          try { el.focus({ preventScroll: true }); } catch (e) {}   // preventScroll → won't fight our scroll
        }
      });
      // Defensive: reflect any route change that bypassed go() into the URL (idempotent; normally no-op).
      if (!this._popping) {
        const exp = this.hashFor(this.state.route, this.state.pid);
        const homeClean = exp === '#/' && (location.hash === '' || location.hash === '#');
        if (location.hash !== exp && !homeClean) {
          const idx = this._histIdx + 1;
          this.histWrite({ route: this.state.route, pid: this.state.pid, idx, scroll: 0 }, exp, false);
          this._histIdx = idx;
        }
      }
      this._popping = false;
    }
  }
```
(Keep the `this.applyTheme()` at the top and `manageMaps()/manageSheetA11y()` at the bottom exactly as they are.)

### 2j. `componentWillUnmount` — APPEND

```js
window.removeEventListener('popstate', this._onPop);
window.removeEventListener('hashchange', this._onHash);
window.removeEventListener('scroll', this._onScroll);
clearTimeout(this._hashT); clearTimeout(this._selfHashT);
if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
```

### 2k. Route-changing handlers that bypass `go()` — CONVERT

**`placeOrder`** (currently a raw `setState({route:'success',...})`): change the `this.setState({ ... })` to `this.go({ ... }, { replace: true })` (same patch object). `replace:true` drops the checkout entry so hardware-Back from **success** lands on the (now-empty) cart, not a stale checkout.

**`completeRefill` / `completeUsed`** (already use `go`): add the opts arg so the transient auth screen is dropped from history when submission completes right after login:
```js
this.go({ /* ...existing patch... */ }, { replace: this.state.route === 'auth' });
```

**`authBack`** VM handler — becomes history-driven (uses the already-tracked `authFrom` as the deep-link fallback):
```js
authBack: () => { clearInterval(this._cd); this.setState({ resendIn: 0 }); this.goBack(s.authFrom || 'home'); },
```

**`saveAddr`** method — remove `addrSheet:null` from its two `setState` calls and append `this.closeAnyModal();` at the end (after the toast, outside the validation early-returns):
```js
saveAddr = () => {
  const s = this.state;
  const title = s.adTitle.trim(), text = s.adText.trim();
  if (!title) { this.setState({ adErr: 'عنوان آدرس را وارد کنید (مثلاً منزل)' }); return; }
  if (text.length < 10) { this.setState({ adErr: 'آدرس کامل را وارد کنید (حداقل ۱۰ کاراکتر)' }); return; }
  if (s.adEditId) {
    this.setState({ addresses: s.addresses.map(a => a.id === s.adEditId ? { ...a, title, text, lat: s.adLat, lng: s.adLng } : a) });
    this.toast('آدرس ویرایش شد');
  } else {
    const id = s.nextAddrId;
    const patch = { addresses: [...s.addresses, { id, title, text, lat: s.adLat, lng: s.adLng }], nextAddrId: id + 1 };
    if (s.addrSheetTarget === 'refill') patch.rfAddrId = id;
    else if (s.addrSheetTarget === 'checkout') patch.addrId = id;
    this.setState(patch);
    this.toast('آدرس جدید ثبت شد');
  }
  this.closeAnyModal();
};
```

**`closeOverlays`** (Escape handler) — route sheet-close through history so no dangling modal entry:
```js
closeOverlays() {
  const s = this.state;
  if (s.addrSheet || s.sheet) { this.closeAnyModal(); return; }   // pops the modal entry
  else if (s.addrMenuId != null) this.setState({ addrMenuId: null });
}
```

---

## (3) `renderVals()` view-model additions/changes

Change these existing keys (exact left→right):

| existing | new |
|---|---|
| `openSheet: () => this.setState({ sheet: true }),` | `openSheet: () => this.openSheetH(),` |
| `closeSheet: () => this.setState({ sheet: false }),` | `closeSheet: () => this.closeAnyModal(),` |
| `openAddrPickCheckout: () => this.setState({ addrSheet: 'pick', addrSheetTarget: 'checkout', adErr: '' }),` | `openAddrPickCheckout: () => this.openAddrSheetH('pick', 'checkout'),` |
| `openAddrPickRefill: () => this.setState({ addrSheet: 'pick', addrSheetTarget: 'refill', adErr: '' }),` | `openAddrPickRefill: () => this.openAddrSheetH('pick', 'refill'),` |
| `closeAddrSheet: () => this.setState({ addrSheet: null, addrSheetTarget: null }),` | `closeAddrSheet: () => this.closeAnyModal(),` |

**Add one new handler** (next to `goProfile`, ~L548):
```js
goBack: () => this.goBack(),
```

**Rewrite the `openAddrForm` closure** (~L469) to be modal-aware (pick→form reuses the entry; opening fresh from the addresses route pushes one):
```js
const openAddrForm = (a) => {
  const f = { adEditId: a ? a.id : null, adTitle: a ? a.title : '', adText: a ? a.text : '',
              adErr: '', adLat: a ? a.lat : 35.7219, adLng: a ? a.lng : 51.3347 };
  if (this.state.addrSheet) this.setState({ addrSheet: 'form', ...f });                 // same modal session
  else { this.pushModal('addr'); this.setState({ addrSheet: 'form', addrSheetTarget: null, ...f }); }
};
```

**Rewrite `sheetAddrs[].pick`** (~L473) to select-then-pop:
```js
pick: () => {
  if (s.addrSheetTarget === 'refill') this.setState({ rfAddrId: a.id });
  else this.setState({ addrId: a.id });
  this.closeAnyModal();
},
```

`addrCards[].edit`/`.del` need no change — `edit` calls `openAddrForm(a)` (now pushes a modal entry because the sheet is closed at that point); `del` calls `deleteAddr` (no sheet).

---

## (4) Markup changes — 4 find/replace pairs (in `markup_edits.json`)

Only the back-**chevron** buttons change (identified by `aria-label="بازگشت"`; the nav tabs, hero CTA and empty-state buttons that reuse `goProducts`/`goServices`/etc. are left untouched). No new blocks.

```
1. FIND:    <button onclick="{{ goProducts }}" aria-label="بازگشت"
   REPLACE: <button onclick="{{ goBack }}" aria-label="بازگشت"
   (1 occurrence — detail)

2. FIND:    <button onclick="{{ goCart }}" aria-label="بازگشت"
   REPLACE: <button onclick="{{ goBack }}" aria-label="بازگشت"
   (1 occurrence — checkout)

3. FIND:    <button onclick="{{ goServices }}" aria-label="بازگشت"
   REPLACE: <button onclick="{{ goBack }}" aria-label="بازگشت"
   (apply to ALL — 2 occurrences: refill, usedSale)

4. FIND:    <button onclick="{{ goProfile }}" aria-label="بازگشت"
   REPLACE: <button onclick="{{ goBack }}" aria-label="بازگشت"
   (apply to ALL — 4 occurrences: orders, requests, addresses, wishlist)
```

The **auth** back button keeps `onclick="{{ authBack }}"` (its handler is upgraded in JS). The scrim/close buttons of both sheets keep `{{ closeSheet }}` / `{{ closeAddrSheet }}` — those VM handlers now route through `history.back()`.

---

## (5) CSS additions — NONE required

Directional transitions already exist: `nav(patch, dir)` sets `html[data-vt="back|forward|fade"]` and `style_3.work.css` L93–98 defines `vtOldBack/vtNewBack` etc. `applyPop` simply passes `dir:'back'` on Back, so the **BACK-direction View Transition composes for free**. Scroll restoration writes `window.scrollTo` *before* the VT captures the new snapshot (§2i timing), so no CSS is involved. The `emdad-nav` `view-transition-name` on the bottom bar (L84) keeps it pinned across all of this. (Optional nicety, not required: nothing.)

---

## (6) Integration points — how this composes with the existing motion/a11y layer

- **`go(patch)` (unchanged callers):** every existing `this.go({route:…})` now *also* pushes a history entry + captures outgoing scroll, transparently. Direction inference (`DEPTH`) is untouched; I only added a `toKey!==fromKey` branch so **detail→detail(new pid)** is treated as a forward nav (it wasn't, because `to===from`).
- **`nav(patch, dir)` (unchanged):** remains the sole VT wrapper. Both `go` and `applyPop` call it, so pushes and pops share one transition path. History `pushState` happens *before* `startViewTransition`, so it never affects the old/new snapshot.
- **Loop safety:** `pushState` fires no events, so a forward nav never re-enters. `popstate`/`hashchange` are made idempotent by `navKeyOf` equality — when we pushed a hash, state already matches it, so the resulting handler is a no-op.
- **`componentDidUpdate` scroll/focus:** the trigger widens from `route` to `navKey`; scroll target comes from `_pendingScroll` (0 on forward, cached value on Back). The existing `[data-route-focus]`/`h1` focus with `preventScroll:true` is preserved and deliberately won't fight the restored scroll.
- **`commitGuard()`:** unchanged and still guards `placeOrder`/`completeRefill`/`completeUsed`. **Do not** wrap `goBack` in it — Back must stay responsive, and a double-Back legitimately pops two entries.
- **`closeOverlays()` (Escape) + `manageSheetA11y()`:** Escape now closes sheets via `history.back()` (one path with hardware Back), so the modal entry is always consumed — no "one dead Back press after Escape" wart. `manageSheetA11y` still promotes the sheet to a dialog on the render triggered by the setState inside `applyPop`.
- **`pop()` micro-anims (badge/heart):** untouched.

---

## (7) Interdependencies with the other 6 epics (by name)

- **Persistence epic (localStorage of `state`).** Hard contract: the persisted snapshot **must exclude** `route`, `pid`, `sheet`, `addrSheet`, `addrSheetTarget`, `addrMenuId` — on load, **the hash is the source of truth** (`componentDidMount` reads `location.hash`; if Persistence restores `route` too, they fight). My bookkeeping is already safe: `_histIdx/_modalDepth/_scrollByKey/_pendingScroll` are instance fields, not `state`, so they're never serialized. If Persistence restores `cart/wish/orders/...` that's fine and orthogonal. Coordinate ordering: Persistence's restore and my mount `setState(route from hash)` both run in mount — the hash `setState` must win for route.
- **Loading/Skeleton epic (`commitGuard`-composing async states).** The route + hash change happen synchronously in `go`; if a destination needs an async load, render a skeleton for the *already-active* route rather than delaying the transition. Don't gate `applyPop` behind a loader — Back must be instant. Shares `commitGuard` only on the submit actions, not on navigation.
- **Maps epic (`manageMaps`/Leaflet).** Routes with maps (checkout, addresses, refill) restore scroll then `manageMaps` re-runs `invalidateSize` in the same `componentDidUpdate`; order is fine. Note the VT snapshots a Leaflet canvas mid-transition (may show a stale tile for ~320ms) — cosmetic, accepted.
- **Any Toast/Notification epic:** toast is a fixed sibling of routes and is unaffected by transitions/scroll.
- **A11y/Focus epic:** I preserve the `[data-route-focus]`→`h1` focus move on every navKey change (including Back), so keyboard focus follows history navigation. If the A11y epic adds `[data-route-focus]` anchors per route, Back honors them automatically.
- **Search/Filter epic:** the filter bottom-sheet is now a history entry via `openSheetH`; if that epic adds more sheet controls, keep them inside the same sheet session (no extra `pushModal`) so one Back closes the whole sheet.

---

## (8) Risks + concrete browser verification

**Risks & mitigations**
1. **`pushState` on `file://` throwing `SecurityError`** — the load-bearing assumption. Mitigated by `histWrite`'s try/catch → `location.hash=`/`location.replace` fallback (reusing the hashchange path, guarded by `_selfHash`). In the fallback, direction degrades to `DEPTH` and scroll to `_scrollByKey` — both already the design's fallbacks.
2. **Modal-as-history in the fallback path only:** same-hash `location.hash=` creates no entry, so in the (rare) file:// fallback, Back on an open sheet still closes it (applyPop catches it) but consumes one route entry. Accepted, fallback-only.
3. **Hardware Forward after a Back-that-closed-a-sheet does not reopen the sheet** (route-sync idempotency swallows it). Intended, not a bug.
4. **VT snapshot/scroll ordering:** we `scrollTo` in `componentDidUpdate` (before the setState-callback resolves the VT promise, i.e. before the new snapshot is captured) — verified against the `nav()` implementation. Under `prefers-reduced-motion`/no-VT, `nav` does a plain `setState` and scroll still applies.
5. **`replaceState` fragment wipe:** `saveScroll` uses the 2-arg form (no url) — never passes `''` as url.

**Verify in a browser (open the built bundle both ways):**
1. **file:// smoke:** open `…/index.html` directly. Console must show **no `SecurityError`**. Tap into products→a product→cart. URL must read `#/products`, `#/product/oxy40`, `#/cart`. Press the browser/hardware **Back**: returns cart→detail→products with a **back-direction** slide and **restored scroll** on each.
2. **Deep link:** open `…/index.html#/product/oxy10` (and `#/orders`, and a bad `#/nope`). Lands on the right screen; bad hash normalizes to home.
3. **Scroll restoration:** on products, scroll down, open a product, Back — list is at the previous offset (not 0). Open product B from A's "related", Back — returns to A.
4. **Sheet-as-history:** on products open the filter sheet → press Back → sheet closes, route stays products (no navigation). Repeat with the address sheet on checkout. Same with **Escape**.
5. **Forward button:** after a few Backs, press browser **Forward** — advances with a **forward-direction** transition (proves idx-based direction, not DEPTH).
6. **Caller-aware back:** deep-link straight to `#/checkout`, tap the on-screen back chevron → goes to cart (fallback via `parentRoute`), not a blank.
7. **Order/auth replace:** cart→checkout→place order→ success; press Back → cart (empty state), **not** a stale checkout. Guest refill→login→submit; Back from the success screen skips the auth screen.
8. **Reduced motion:** enable OS "reduce motion" — routing/Back/scroll all still work with no transition.

---

**Files:** logic in `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`; markup pairs in `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_edits.json` (targeting `markup_current.html`). No edits to `style_3.work.css`.