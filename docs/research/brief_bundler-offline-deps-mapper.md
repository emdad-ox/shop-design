I have everything I need, with all claims backed by primary-source evidence. One correction to the task's framing surfaced and is verified: React/ReactDOM are **not** bundled — they are fetched live from unpkg.com at runtime, and Baloo Bhaijaan 2 **is** embedded (not just a gstatic preconnect). Here is the briefing.

---

# BRIEFING — Outer Bundler, Offline Story, External Deps, Integrity/Security

Sources read: `/Users/macbook/Desktop/Emdad Oxygen Shop - Offline.html` (lines 1–180 + tag-structure of 180–192); `scratchpad/template_full.html` (decoded inner template, 153,595 B); `scratchpad/resources/00_7cca234d.js` (dc-runtime, 61,088 B); plus manifest/resource metadata verified against `scratchpad/resources/`.

## 0. File anatomy (outer `.html`, 191 lines total)
A tiny readable shell + 3 data `<script>` blocks:
- **Lines 1–42** — HTML shell: dark `#06171b` body, `#__bundler_thumbnail` splash (inline SVG "O₂" logo in a gradient rounded square, uses `font-family:'Baloo Bhaijaan 2'`), `#__bundler_loading` chip ("Unpacking..."), `<noscript>` fallback.
- **Lines 43–178** — the bootstrap `<script>` (the whole unpack engine; detailed in §1).
- **Line 180–182** — `<script type="__bundler/manifest">` … blob on **line 181 = 848,821 chars** (base64 of gzipped-or-raw resource bytes, keyed by UUID).
- **Line 184–186** — `<script type="__bundler/ext_resources">` … content on **line 185 = `[]`** (EMPTY — see §1.4; `window.__resources` ends up `{}`).
- **Line 188–190** — `<script type="__bundler/template">` … blob on **line 189 = 163,211 chars** = a **JSON-stringified string** of the entire inner template HTML (`template_full.html`), with every asset reference written as a bare UUID.

## 1. The bundler format & unpack sequence (outer lines 43–176)
Runs on `DOMContentLoaded`, `async`. Step by step:

1. **Error sink (lines 50–58)** — a capturing `window.addEventListener('error', …, true)` that lazily creates a fixed-position red `#__bundler_err` div and appends `'[bundle] ' + message (+ filename:lineno)`. Comment notes it lives on `window` so it "persists across `replaceWith`". NOTE: this catches DOM/script *error events*; it does **not** catch unhandled promise rejections (relevant in §3).
2. **Grab data blocks (lines 61–70)** — `document.querySelector('script[type="__bundler/manifest"]')` and `…/template`. If either missing → `setStatus('Error: missing bundle data')` and bail. `manifest = JSON.parse(manifestEl.textContent)`; `template = JSON.parse(templateEl.textContent)` (template is a JSON string → becomes the raw HTML string).
3. **Manifest shape** — object keyed by UUID; each entry `{ "mime": "...", "compressed": true|false, "data": "<base64>" }`. Verified: **18 entries** — `1 text/javascript` (dc-runtime), `1 application/javascript` (Leaflet), `13 font/woff2`, `3 image/png`. `compressed:true` on exactly the **2 JS** entries; `compressed:false` on all 13 woff2 + 3 png (already-compressed formats).
4. **Decode each asset in parallel (lines 76–112)** — `Promise.all` over `Object.keys(manifest)`:
   - `atob(entry.data)` → binary string → `Uint8Array` (byte-by-byte via `charCodeAt`).
   - If `entry.compressed`: pipe through **`new DecompressionStream('gzip')`** — write bytes to `ds.writable.getWriter()`, drain `ds.readable.getReader()` chunk-by-chunk, concat into one `Uint8Array`. If `DecompressionStream` is undefined (old browser) it only `console.warn`s and uses the still-gzipped bytes (asset silently breaks).
   - `blobUrls[uuid] = URL.createObjectURL(new Blob([finalBytes], { type: entry.mime }))`. On decode failure it creates an **empty** blob of the right mime (line 110) so string-replacement still succeeds.
5. **ext_resources → resourceMap (lines 114–119)** — parses `__bundler/ext_resources` (here `[]`), builds `resourceMap[entry.id] = blobUrls[entry.uuid]`. Empty here → `resourceMap = {}`.
6. **UUID → blob rewrite (line 122)** — `for (const uuid of uuids) template = template.split(uuid).join(blobUrls[uuid])`. Blunt global string replace over the whole template HTML — rewrites `<script src="UUID">`, CSS `url("UUID")` (fonts + Leaflet PNGs), everything. (There are no `<img src=UUID>` in this app; all UUID refs are script-src and CSS `url()`.)
7. **Strip SRI/crossorigin from template (line 127)** — `template.replace(/\s+integrity="[^"]*"/gi,'').replace(/\s+crossorigin="[^"]*"/gi,'')`. Rationale in comment: blob URLs from a `file://` doc inherit a **null origin**, so `crossorigin` would force a CORS fetch that SRI then rejects. (This only affects attributes *literally in the template HTML*; the app's script tags carry no such attrs anyway. It does **not** touch dc-runtime's programmatic React/Babel loads — see §5.)
8. **Inject `window.__resources` (lines 129–141)** — builds `<script>window.__resources = {…}</script>` (here `{}`), `</script>`-escaped, and `slice()`-inserts it **immediately after the `<head …>` open tag** (regex `/<head[^>]*>/i`) so the DOCTYPE stays first (avoids quirks mode).
9. **Swap in the real document (lines 147–148)** — `new DOMParser().parseFromString(template, 'text/html')` then `document.documentElement.replaceWith(doc.documentElement)`.
10. **Re-vivify scripts (lines 149–166)** — DOMParser-inserted scripts are inert per spec, so it walks `document.scripts`, re-`createElement('script')`, copies attributes + textContent, `old.replaceWith(s)`, and **awaits `onload` for `src` scripts** to preserve ordering. Special case (lines 158–162): a `text/babel`/`text/jsx` script *with a src* is fetched and inlined (blob:null src would be dropped by Babel's XHR) — **dormant for this app** (no babel-typed scripts).
11. **Post-swap Babel kick (lines 169–171)** — calls `window.Babel.transformScriptTags()` only `if (window.Babel)` — **never fires here** (Babel is never present; see §5).
12. Outer `catch` (line 172) → `setStatus('Error unpacking: ' + err.message)`.

After this, control passes to the app's own scripts in the swapped document: `<script src="blob:…(dc-runtime)">` (template line 5) then `<script src="blob:…(Leaflet)">` (template line 893).

## 2. Full resource inventory (18 assets)
**JavaScript (2, gzip-compressed):**
| UUID | file | mime | size (decoded) | role |
|---|---|---|---|---|
| `7cca234d-1457-4bcd-98a5-e26274dc969f` | 00_7cca234d.js | text/javascript | 61,088 B | **dc-runtime** — the custom React-based DC framework (`getReact/getReactDOM`, template compiler for `<x-dc>/<sc-if>/<sc-for>/<helmet>/x-import`, `StreamableLogic` aliased as `DCLogic`, registry, helmet manager, boot). Loaded first (template line 5). |
| `1442f24e-fe12-4ed6-bd63-0fe9a8cc496a` | 01_1442f24e.js | application/javascript | 147,552 B | **Leaflet 1.9.4** (banner confirms: "Leaflet 1.9.4 … (c) 2010-2023 Vladimir Agafonkin"), UMD → sets `window.L`. Loaded at template line 893. |

**Fonts (13 woff2, uncompressed):**
- **9 × Vazirmatn** (Persian body/UI font, weights 100–900), `@font-face family:Vazirmatn` in template `<style>` lines 12–84: `31df45ec`=100, `c84394b3`=200, `023143da`=300, `986da174`=400, `a4f8998d`=500, `1b60d584`=600, `b7ba6b01`=700, `2fdeacf9`=800, `8aa522ed`=900. ~50–51 KB each.
- **4 × 'Baloo Bhaijaan 2'** (the logo/display font; Google-Fonts-style subsetted), template lines 86–229. Four unique subset files reused across weights 500/600/700/800: `9e5423b7`=arabic (38 KB), `39312691`=vietnamese (9 KB), `4de9721d`=latin-ext (30 KB), `c4acad6a`=latin (35 KB). **These are fully embedded** (see §3 correction).

**Images (3 PNG, uncompressed) — all Leaflet control chrome, referenced only in the inlined Leaflet CSS:**
| UUID | file | size | CSS selector (template) |
|---|---|---|---|
| `05f89416-…` | 15_05f89416.png | 696 B | `.leaflet-control-layers-toggle` background (line 589) — layers-control icon 1× |
| `c81b3b80-…` | 16_c81b3b80.png | 1,259 B | `.leaflet-retina .leaflet-control-layers-toggle` (line 594) — layers icon 2× |
| `a640ada3-…` | 17_a640ada3.png | 1,466 B | `.leaflet-default-icon-path` (line 637) — used only by Leaflet's `L.Icon.Default` path-guessing heuristic (marker-icon) |

None of the 3 PNGs are referenced by the app's own markup — the app uses a custom `divIcon` (inline SVG) pin, so these are incidental Leaflet defaults. They are embedded and would work offline, but are largely unused.

## 3. OFFLINE analysis — what breaks vs. works

⚠️ **Headline correction to the "offline" premise:** Despite the filename "…Offline.html", the app has a **hard runtime dependency on `unpkg.com`**. dc-runtime does **not** bundle React. Its entry (`resources/00_7cca234d.js` lines 1594–1687) runs `loadReactUmd().then(init)`, and `loadReactUmd` (lines 1616–1623) injects `<script>` tags for React + ReactDOM from unpkg (verified: React is bundled **nowhere** — 0 hits in template/manifest; only 2 JS assets exist, and they are dc-runtime + Leaflet).

- **COLD offline** (page never loaded while online, so nothing in HTTP cache): the outer bundle unpacks fine (all local), the document swaps in, dc-runtime executes, calls `hideRawTemplate()` (injects `x-dc{display:none!important}`), then `loadReactUmd()` → `<script src="https://unpkg.com/react@18.3.1/…">` **fails to load** → the `.catch` at line 1683 `console.error("[dc] failed to load React or boot:")` and **rethrows** → `init()` never runs → **nothing renders. Blank dark (`#06171b`) page.** (The failure is a rejected `loadScript` promise / rethrow → an *unhandled rejection*, which the outer error sink — a `'error'` listener — does not surface, so the user just sees blank.)
- **WARM offline** (React/ReactDOM previously fetched & sitting in the browser HTTP cache from a prior online visit): React loads from cache → app boots and renders. Then:
  - ✅ **Works:** all in-memory app logic (17 routes, cart, wishlist, checkout, OTP flow, discount, forms, orders/requests), **Vazirmatn** body font (embedded blobs), **Baloo Bhaijaan 2** logo font (embedded blobs — the gstatic preconnect is a dead hint, not a dependency), Leaflet JS itself (embedded blob), the map **container + pan/zoom + the pin** (`divIcon` is inline SVG, needs no network), and Leaflet's layers-control PNGs (embedded).
  - ❌ **Breaks:** **map tiles** — `L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')` (template lines 1964 & 1992) → all tile GETs to `a/b/c/d.basemaps.cartocdn.com` fail → **maps render as a blank/grey grid** with just the teal pin floating on it. Both the interactive address picker and the static preview maps are affected.

### Every external URL in the app (exhaustive)
Runtime network dependencies:
- `https://unpkg.com/react@18.3.1/umd/react.production.min.js` — dc-runtime, **required to boot** (00_7cca234d.js:1594).
- `https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js` — dc-runtime, **required to boot** (:1596).
- `https://unpkg.com/@babel/standalone@7.29.0/babel.min.js` — dc-runtime `ensureBabel` (:1048); only loaded for `x-import` of `.jsx`. App has **0** `<x-import>`/`<dc-import>`, so this is **never fetched** in practice.
- `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` — CartoDB "Positron" light tiles, subdomains `a,b,c,d` (template:1964, 1992). **Breaks offline.**
- `https://fonts.gstatic.com` — `<link rel="preconnect" crossorigin>` only (template line 85). No actual font is fetched from it (Baloo is embedded); harmless dead preconnect, fails silently offline.

Non-fetched URLs (comments / XML namespace, no network effect): `http://www.w3.org/2000/svg` (SVG xmlns, e.g. splash + pin); `https://bugs.chromium.org/p/chromium/issues/detail?id=600120` and `https://bugzilla.mozilla.org/show_bug.cgi?id=888319` (comments inside the inlined Leaflet CSS).

## 4. Leaflet integration (template `Component`, lines ~1940–1998)
- **Access:** always via `window.L` (Leaflet UMD global from the embedded blob). `manageMaps()` (line 1953) guards with `if (!L) { …setTimeout(() => this.manageMaps(), 300) }` — polls until `window.L` exists (`this._mapRetry`).
- **Pin (`pinIcon()`, lines 1946–1951):** `window.L.divIcon({ className:'', iconSize:[30,38], iconAnchor:[15,36], html:'<svg …teardrop path fill #0b8a78 stroke #fff … <circle r=5 fill #fff>…' })`. Pure inline SVG → renders offline, no image request.
- **Interactive address picker (lines 1959–1973):** on `#addr-pick-map` when `state.addrSheet==='form'`. `L.map(pel, { attributionControl:false, zoomControl:true }).setView([state.adLat, state.adLng], 14)`, adds the cartocdn `tileLayer` (`subdomains:'abcd', maxZoom:19`), a **draggable** `L.marker` with `pinIcon()`. Wires `marker.on('dragend', …)` and `map.on('click', …)` → both call `set(ll)` which does `setState({ adLat:+lat.toFixed(6), adLng:+lng.toFixed(6) })`. Cached on `this._picker`/`_pickerEl`/`_pickerMarker`; `invalidateSize()` after 120 ms. Default new-address center `adLat 35.7219, adLng 51.3347` (Tehran).
- **Static preview maps (lines 1978–1997):** every `[data-addr-map]` element (with `data-lat`/`data-lng`) gets a locked `L.map(el, { attributionControl:false, zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, touchZoom:false, tap:false })`, same cartocdn tile layer, a **non-interactive** marker (`interactive:false`). Tracked in a `this._maps` Map keyed by element; reconciled on each `manageMaps()` (removes stale, `setView`+`setLatLng` on lat/lng change). `componentWillUnmount` (line 1940) tears down `_picker` and all `_maps`.
- **Seeded addresses (always present, state lines 1867–1870):** id1 "منزل" (35.7883, 51.3690, Saadatabad), id2 "محل کار" (35.7448, 51.4079, Valiasr). These drive the preview maps out of the box.

## 5. Integrity / security / robustness notes
- **SRI is enforced on the CDN loads, not on bundled assets.** dc-runtime pins:
  - React `sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z` (:1595)
  - ReactDOM `sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1` (:1597)
  - Babel `sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y` (:1049)
  loaded via `loadScript` with `s.integrity=…; s.crossOrigin='anonymous'; s.async=false` (:1603–1615). The outer bundler's integrity/crossorigin **stripping (outer line 127) does not touch these** — they're set programmatically post-swap, so React/ReactDOM SRI is live (but requires network + CORS from unpkg).
- **No CSP.** Zero `<meta http-equiv="Content-Security-Policy">` (or any `http-equiv`) in outer shell or template. Combined with the runtime's `new Function(...)` eval of user logic (dc-runtime `evalDcLogic` :741–750, `//! nosemgrep: eval-and-function-constructor`) and x-import module eval (:1092), the app relies on none.
- **No persistence.** All state is the in-memory `state = {…}` object (template lines 1862–1887). No `localStorage`/`sessionStorage`/IndexedDB anywhere in dc-runtime or template. **Full reload resets everything** (cart, auth, orders, added addresses).
- **Hardcoded secrets / demo shortcuts (template):**
  - **OTP `123456`** — `verifyOtp` (line 2078): `if (code !== '123456') { …'کد وارد شده صحیح نیست' }`. `sendOtp` (2069) doesn't send anything; just toasts "کد تأیید پیامک شد" and starts a resend countdown. Any Iranian-format phone + `123456` logs in.
  - **Discount `EMDAD10`** — `applyDisc` (line 2389): `if (code === 'EMDAD10') { setState({ disc: code }); toast('کد تخفیف اعمال شد') }`. Placeholder text hints it (line 1212).
  - **Seeded user** — `componentDidMount` (lines 1930–1932): `if ((this.props.startLoggedIn ?? true) && !state.loggedIn) setState({ loggedIn:true, userName:'کاربر امداد اکسیژن', phone:'0912 845 7455' })`. Precise behavior: the `data-props` default for `startLoggedIn` is **false** (line 1859), so under standalone boot the user starts **logged out** (must OTP in); the seeded name/phone only apply if a `startLoggedIn:true` prop override is supplied. The 2 seeded addresses (above) are always present regardless.
- **Robustness:** two error surfaces — the outer bundler's `#__bundler_err` sink (window `'error'` events only, misses promise rejections like the React-load failure), and dc-runtime's per-component React error boundary (`getDerivedStateFromError`/`componentDidCatch`, :827–836) rendering an in-place `.sc-logic-error` box. Decode failures degrade to empty blobs (outer :110). `DecompressionStream` absence only warns.

## 6. How to rebuild the bundle after editing
- **dc-runtime** carries the build recipe in its header (line 1) and repeated in the assignment: *"GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with `cd dc-runtime && bun run build`."* i.e. dc-runtime is compiled from TypeScript (`src/react.ts`, `parse.ts`, `boot.ts`, `expr.ts`, `encode.ts`, `compile.ts`, `logic.ts`, `component.ts`, `external.ts`, `helmet.ts`, `pseudo.ts`, `registry.ts`, `runtime.ts`, `stream-state.ts`, `index.ts` — all visible as `// src/*.ts` section banners) via esbuild-style IIFE bundling (`bun run build`). Editing the shipped `00_7cca234d.js` directly is discouraged; edit the TS and rebuild.
- **The outer bundle** (manifest/template/ext_resources blobs) is produced by a separate "bundler" tool (the shell/bootstrap is its output template). To rebuild after editing the app: re-encode each asset (gzip the 2 JS, leave woff2/png raw, base64) into the manifest map, JSON-stringify the edited inner template with asset refs written as their UUIDs, and emit the `__bundler/manifest` + `__bundler/template` (+ `__bundler/ext_resources`, `[]` here) script blocks inside the fixed shell. Practically, to just tweak app behavior you edit the **inner template** (`template_full.html`: the `Component extends DCLogic` in the `data-dc-script` block, the `<x-dc>` markup, or the `<style>` blocks), then re-run that bundler to regenerate line 181/189. No source for the outer bundler tool is present in the scratchpad — only its emitted artifact.

### Quick-reference constants
`OTP=123456` · `DISCOUNT=EMDAD10` · seeded user `کاربر امداد اکسیژن / 0912 845 7455` · map default `35.7219,51.3347` · tiles `{a,b,c,d}.basemaps.cartocdn.com/light_all` · React/ReactDOM/Babel `@18.3.1/18.3.1/7.29.0` from unpkg · Leaflet `1.9.4` embedded · 18 bundled assets (2 JS gz, 13 woff2, 3 png) · `ext_resources=[]`, `window.__resources={}`.