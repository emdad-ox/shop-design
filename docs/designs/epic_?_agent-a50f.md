I have a complete, verified picture and the advisor's confirmation. Here is the full integrable design.

---

# EPIC: Persistence & Hydration — Integrable Design

Persist the durable slice of in-memory state to `localStorage` and rehydrate on load, so reload/close preserves cart, login, orders, requests, addresses, wishlist, and theme. All changes are in **`script_2.work.js`** — no CSS changes, and no *required* markup changes (one optional control below). The whole mechanism is one hydrate call + one save hook, designed to sit alongside the shipped motion/a11y layer without touching `go()`/View Transitions.

---

## 1) New state fields

**None added to reactive `state`.** Persistence deliberately introduces zero new template-visible state — it reuses the existing durable keys. It adds four *non-reactive instance/class fields* (they must never go into `state`, or they'd churn re-renders and get persisted into themselves):

| Field | Kind | Purpose |
|---|---|---|
| `STORE_KEY = 'emdad:v1'` | class const | namespaced localStorage key (namespace `emdad` isolates from other apps sharing the `file://` "null" origin; `v1` is the schema major) |
| `DURABLE = [...]` | class const | whitelist of state keys that are persisted |
| `this._lastPersist` | runtime, on `this` | last JSON string written; skips redundant writes |
| `this._hydrated` | runtime, on `this` | gates `persist()` off until the mount baseline is settled |

Add the two consts right after the `DELIVERIES` field (current L65):

```js
STORE_KEY = 'emdad:v1';
DURABLE = ['cart','wish','addresses','nextAddrId','orders','requests','loggedIn','userName','phone','addrId','theme'];
```

The durable slice is intentionally the task's list — **transient UI is excluded**: `route`, `sheet`, `addrSheet*`, `toast*`, `authStep/otp/authErr/resendIn/pendingSubmit`, all `rf*`/`us*`/`ad*` form drafts, `disc*`, `note`, `qty`, `pid`, `q/cat/sort/inStock`, `editingName/nameInput`, `fsKind/fsCode`, `orderNo`. `rfAddrId` is a form draft → **not** persisted (it's re-derived from `addrId`/defaults each session).

---

## 2) New / modified methods (full code, matching file style)

### 2a) New: `durableSlice()`, `persist()`, `hydrate()`

Place these near the other helpers (e.g. after `commitGuard()`, current L228):

```js
  // ---------- persistence ----------
  durableSlice() {
    const s = this.state, o = {};
    for (const k of this.DURABLE) o[k] = s[k];
    return o;
  }

  // Save the durable slice. Pure read + localStorage write — no setState, no DOM.
  // Signature-diffed so it only writes when something durable actually changed.
  persist() {
    if (!this._hydrated) return;                 // don't write during pre-hydration mount churn
    let json;
    try { json = JSON.stringify({ v: 1, s: this.durableSlice() }); }
    catch (e) { return; }                        // unserializable slice — bail, stay in-memory
    if (json === this._lastPersist) return;      // nothing durable changed this render
    try {
      window.localStorage.setItem(this.STORE_KEY, json);
      this._lastPersist = json;
    } catch (e) { /* quota / private-mode / disabled storage — keep the app running */ }
  }

  // Restore the durable slice. MUST use setState (not `this.state = …`), see notes.
  hydrate() {
    let data;
    try {
      const raw = window.localStorage.getItem(this.STORE_KEY);
      if (!raw) return false;                    // first visit
      data = JSON.parse(raw);
    } catch (e) { return false; }                // corrupt JSON / storage access threw
    if (!data || data.v !== 1 || !data.s || typeof data.s !== 'object') return false; // version gate

    const saved = data.s, patch = {};
    for (const k of this.DURABLE) if (k in saved) patch[k] = saved[k];

    // --- harden a stale snapshot so it cannot crash renderVals() ---
    const ids = new Set(this.PRODUCTS.map(p => p.id));

    // cart: drop ids no longer in the catalog, clamp qty to current stock (cartItems L451 does p.title unguarded)
    const cart = {};
    if (patch.cart && typeof patch.cart === 'object') {
      for (const [id, qty] of Object.entries(patch.cart)) {
        const p = this.PRODUCTS.find(p => p.id === id), n = parseInt(qty, 10);
        if (p && p.stock > 0 && n > 0) cart[id] = Math.min(n, p.stock);
      }
    }
    patch.cart = cart;

    // wish: keep only catalog ids (wishItems L693 does vm(find(id)); .filter(Boolean) runs AFTER the throwing map)
    const wish = {};
    if (patch.wish && typeof patch.wish === 'object') {
      for (const id of Object.keys(patch.wish)) if (ids.has(id)) wish[id] = true;
    }
    patch.wish = wish;

    // addresses: app invariant is >=1 address. If corrupt, drop the address slice and keep the seed.
    if (!Array.isArray(patch.addresses) || patch.addresses.length === 0) {
      delete patch.addresses; delete patch.addrId; delete patch.nextAddrId;
    } else {
      const addrIds = patch.addresses.map(a => a && a.id).filter(v => v != null);
      if (!addrIds.includes(patch.addrId)) patch.addrId = addrIds[0];        // addrId must resolve
      const maxId = addrIds.reduce((m, v) => Math.max(m, v), 0);
      if (!(patch.nextAddrId > maxId)) patch.nextAddrId = maxId + 1;         // no id collision on next add
    }

    // orders/requests are self-contained snapshots; accept arrays, else fall back to defaults
    if (!Array.isArray(patch.orders)) delete patch.orders;
    if (!Array.isArray(patch.requests)) delete patch.requests;

    this.setState(patch);   // synchronous state assign + the ONLY repaint on the hydrated path
    return true;
  }
```

**Why `this.setState(patch)` is load-bearing (do not "optimize" to a field-initializer / `this.state =` hydrate):**
- dc-runtime's `__setLogicState` reassigns `this.logic.state` **synchronously**, so the `applyTheme()` call on the next line in `componentDidMount` already reads the hydrated `theme`.
- On the hydrated path the seed-login `setState` is **skipped** and nothing else calls `setState`; this `setState` is the only thing that repaints with the restored cart/orders. A direct assignment would leave the empty-defaults first render on screen until some later unrelated interaction. (React 18 flushes this didMount `setState` synchronously before first paint, so there is no visible flash — no pre-mount inline script needed.)

### 2b) Modified: `componentDidMount` (current L67–77)

```js
  componentDidMount() {
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
    const hydrated = this.hydrate();                 // NEW: restore durable slice first (sync state assign + repaint)
    this.applyTheme();                               // now reads the hydrated theme → correct first paint
    if (!hydrated && (this.props.startLoggedIn ?? true) && !this.state.loggedIn) {
      this.setState({ loggedIn: true, userName: 'کاربر امداد اکسیژن', phone: '0912 845 7455' });
    }
    this._onKey = (e) => this.handleKey(e); document.addEventListener('keydown', this._onKey);
    this.manageMaps();
    this.manageSheetA11y();
    this._hydrated = true;                           // NEW: open the persist gate
    this.persist();                                  // NEW: write the hydrated/seeded/reconciled baseline once
  }
```

**Reconciliation with `startLoggedIn` (the required reconcile):** hydration wins. The seed-login block now runs **only when nothing was hydrated** (`!hydrated`). So: fresh visit → seed as today; returning visit → the persisted `loggedIn/userName/phone` are restored and the seed is skipped (a user who logged out stays logged out on reload instead of being silently re-seeded). If a developer wants `startLoggedIn` to always force a state, they clear `emdad:v1` (or use the optional reset control below).

### 2c) Modified: `componentDidUpdate` (current L78–89)

Append one line at the end:

```js
  componentDidUpdate(prevProps, prevState) {
    this.applyTheme();
    if (prevState && prevState.route !== this.state.route) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-route-focus]') || document.querySelector('h1');
        if (el && document.activeElement !== el) { el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) {} }
      });
    }
    this.manageMaps();
    this.manageSheetA11y();
    this.persist();                                  // NEW: save durable slice if it changed
  }
```

**Why `componentDidUpdate` instead of a save-wrapper / targeted calls (the design decision):** the ~14 durable mutations are scattered, and most live inside **per-render `renderVals()` closures** that are recreated on every render — a `save()` wrapper around `setState` would have to be threaded through all of them and is easy to miss when new handlers are added. A signature-diff in `componentDidUpdate` makes coverage **exhaustive by construction**: any durable change from anywhere flushes automatically, and the `_lastPersist` string-compare makes it a near-free no-op on renders that don't touch durable data (e.g. every keystroke in a form draft, since drafts aren't in the slice). The slice is tiny (small cart/wish objects, short orders/requests arrays), so `JSON.stringify`-per-render is negligible.

---

## 3) `renderVals()` view-model additions

**Core epic: none.** Persistence is invisible to the template.

**Only if you ship the optional reset control (§4):** add one handler inside the returned object (anywhere near `logout`, current L682):

```js
      resetData: () => {
        try { window.localStorage.removeItem(this.STORE_KEY); } catch (e) {}
        window.location.reload();     // clean reboot → hydrate finds nothing → seeded defaults
      },
```

(If a full reload feels heavy, the alternative is `removeItem` + `this._lastPersist = null` + a toast asking the user to refresh. Reload is the more predictable "reset demo".)

---

## 4) Markup changes

**Core epic: none required.**

**Optional — a "clear local data" affordance** (doubles as the browser-verification reset button). Apply as an exact find→replace pair in `markup_edits.json`. Anchor is the profile footer (current markup L681), which sits *outside* the `isLogged` block so it shows for guests too:

FIND:
```html
<div style="text-align:center;font-size:11px;color:var(--tx2)">امداد اکسیژن تهران · نسخه پیش‌نمایش PWA</div>
```
REPLACE:
```html
<div style="text-align:center;font-size:11px;color:var(--tx2)">امداد اکسیژن تهران · نسخه پیش‌نمایش PWA</div>
        <button onclick="{{ resetData }}" style="display:block;margin:8px auto 0;border:none;background:none;color:var(--tx2);font-size:11px;text-decoration:underline;cursor:pointer">پاک‌سازی اطلاعات محلی</button>
```

---

## 5) CSS additions

**None.** No tokens, keyframes, or selectors needed. (The optional reset button styles itself inline and deliberately avoids `background:var(--p)` so it doesn't pick up the primary-glow hook.)

---

## 6) Integration points (how this composes with the existing motion/a11y layer)

- **`componentDidMount` (L67–77):** `hydrate()` is inserted as the *first* action, **before** the seed-login block, and `applyTheme()` moves to right after it so the first paint is themed correctly. `_hydrated`/baseline `persist()` close the method.
- **`componentDidUpdate` (L78–89):** one appended `this.persist()`. It runs *after* `applyTheme`/`manageMaps`/`manageSheetA11y`, so it observes fully-committed durable state.
- **Does not fight `go()` / View Transitions:** `persist()` performs no `setState` and touches no DOM — it's a synchronous read of `this.state` + a `localStorage.setItem`. When a route change goes through `nav()` → `startViewTransition(() => setState(...))`, React commits, then `componentDidUpdate` fires inside the VT update callback; a sub-millisecond `setItem` there neither blocks nor perturbs the old/new DOM snapshots the transition animates. `route` is excluded from the slice, so persistence never races the VT direction inference in `go()`.
- **Composes with `commitGuard()`:** the double-submit guards in `placeOrder`/`completeRefill`/`completeUsed` still run first; persistence simply records whichever single committed result they allow. No new guarding needed.
- **Composes with theme:** `theme()` = `state.theme ?? props.defaultTheme ?? 'light'`. Persisting `theme` captures the user's *explicit* toggle; `theme:null` (never toggled) persists harmlessly and still falls back to `props.defaultTheme` on hydrate.

**Durable mutation sites the `componentDidUpdate` hook covers** (enumerated per the brief — the hook makes targeting them unnecessary, but this documents its coverage):

1. `addToCart` (L230) — `cart`
2. `verifyOtp` (L283) — `loggedIn`, `userName`, `phone`
3. `completeRefill` (L304) / `completeUsed` (L313) — `requests`
4. `deleteAddr` (L349) — `addresses`, `addrId` (`rfAddrId` is transient)
5. `saveAddr` (L359) — `addresses`, `nextAddrId`, `addrId`
6. `placeOrder` (L377) — `cart`, `orders`
7. `vm().unwish` (L261) — `wish`
8. `cartItems` `inc`/`dec`/`remove` (L457–462) — `cart`
9. `toggleTheme` (L541) — `theme`
10. `addrCards[].makeDefault` (L486) — `addrId`
11. `toggleWish` (L580) — `wish`
12. `saveName` (L681) — `userName`
13. `logout` (L682) — `loggedIn`, `userName`, `phone`

---

## 7) Interdependencies with the other 6 epics (by name)

- **Routing / deep-linking (hash) epic — tightest coupling.** Persistence **excludes `route` by design**; that epic owns route via `location.hash`. Recommendation: always boot to a sensible route (`home`) from persistence, and let the routing epic's hash-parse in `componentDidMount` set `route` **after** `hydrate()` runs, so restored data and the hash route are consistent and there is a single source of truth for route. If they instead want route persisted, it should live in the hash, not in `emdad:v1`. No code conflict today (disjoint keys); only the componentDidMount ordering must be honored (hydrate durable data first, then apply hash).
- **Real photo-upload epic — quota risk, flag now.** Today photos are integer counters and aren't even in the durable slice. If that epic moves real `File`/dataURL images into `state`, **do not add them to `DURABLE`** — base64 images will blow the ~5 MB quota (which `persist()` swallows, silently dropping saves). Keep media out of `localStorage` (or use IndexedDB). Persist only lightweight metadata.
- **Map / address (Neshan) picker epic.** `addresses` (with `lat`/`lng`) are persisted, so keep address objects plain-JSON — never store Leaflet/Neshan instances or callbacks in `state.addresses` (they'd make `durableSlice()` unserializable → `persist()` bails). The picker's `adLat`/`adLng` are transient (not persisted); `manageMaps()` already guards `isNaN`, so a slightly-off restored coord degrades gracefully.
- **Auth / session epic.** Persistence stores `loggedIn`/`userName`/`phone` and reconciles with `startLoggedIn` (hydration wins; documented above). If that epic adds a token/session object, decide explicitly whether it joins `DURABLE`; if it does, ensure it's JSON-serializable and consider a schema bump (`emdad:v2`).
- **Motion & polish epic (already shipped).** Explicitly composed with: `persist()` never calls `setState`/touches DOM, so it doesn't interfere with `go()`/`nav()`/`pop()`/VT; `hydrate()`'s single `setState` repaint runs before first paint (no flash), and theme hydration flows through the existing `applyTheme()`.
- **Records & history epic (orders / requests / wishlist screens).** These arrays now survive reload — the main payoff. If that epic evolves the shape of an order/request object (e.g. adds a mutable `status`), keep reads defensive: old persisted snapshots must still render. `hydrate()` accepts them as opaque arrays; add field-level fallbacks there if the shape changes, or bump the schema key.

---

## 8) Risks + concrete browser verification

**Risks & mitigations:**
1. **Stale snapshot crashing `renderVals()`** — the one crash vector persistence introduces. A persisted `cart`/`wish` id absent from a newer `PRODUCTS` build crashes `cartItems` (L451, unguarded `p.title`) and `wishItems` (L693 — `.filter(Boolean)` runs *after* the throwing `vm(undefined)` map). **Mitigated** by mandatory cart+wish pruning in `hydrate()`.
2. **`file://` shared origin** — Chrome gives all `file://` pages the same opaque origin, so two copies of the bundle on one machine share `emdad:v1`. Namespacing prevents collisions with *other* apps; acceptable for a demo. (localStorage works on `file://` in Chrome/Firefox/Safari; all access is try/caught, so if a sandbox blocks it the app runs exactly as today, fully in-memory.)
3. **Quota (~5 MB)** — durable slice is tiny; safe now. Real risk only if the photo epic adds images (see §7). `setItem` failures are swallowed.
4. **Corrupt / future-schema data** — `try/catch` + `data.v !== 1` gate → `hydrate()` returns false → defaults; never crashes. Forward-safe: a future `emdad:v2` key ignores v1 automatically.
5. **`addrId`/`nextAddrId` drift** — reconciled in `hydrate()` (addrId→surviving address; nextAddrId→`max(id)+1`).

**Browser verification (open the bundle via `file://` or static host):**
1. **Cart survives reload:** add 2 items → badge shows count → hard-refresh → cart + badge restored. In DevTools → Application → Local Storage, confirm one `emdad:v1` entry shaped `{"v":1,"s":{…}}`.
2. **Theme, no flash:** toggle dark → reload → boots dark; watch the first painted frame — it should already be dark (no light→dark flash).
3. **Login reconcile:** while logged in, reload → still logged in. Then **logout** → reload → **stays logged out** (proves hydration wins over the `startLoggedIn` seed).
4. **Records:** place an order and submit a refill → reload → they appear on the orders/requests screens.
5. **Corruption resilience:** in console `localStorage.setItem('emdad:v1','{bad json')` → reload → app boots to seeded defaults, no red `.sc-logic-error` banner, console clean.
6. **Stale-id resilience:** set `localStorage['emdad:v1'] = JSON.stringify({v:1,s:{cart:{ghost:3},wish:{ghost:true}}})` → reload → no crash; ghost id is dropped, cart empty.
7. **VT non-interference:** navigate home→detail→cart with persisted data present → transitions animate normally; confirm no extra re-renders/jank and that `emdad:v1` only rewrites when durable data actually changes (add a temporary `console.count` in `persist()` past the diff guard — it should stay silent while merely typing in a form).
8. **(If shipped) reset control:** profile → "پاک‌سازی اطلاعات محلی" → `emdad:v1` removed and app reloads to seeded defaults.

**Files touched:** `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js` (all core changes) and, only for the optional reset control, `markup_current.html` via `markup_edits.json`. No changes to `style_3.work.css`.