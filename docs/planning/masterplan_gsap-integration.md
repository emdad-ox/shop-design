I have everything I need. Here is the plan.

---

# GSAP INTEGRATION — Concrete, Sequenced Plan (Emdad Oxygen)

Verified against the **current** `script_2.work.js` (808 lines), `style_3.work.css` (208 lines), `markup_current.html` + `markup_edits.json`, `build.py`, and the outer bundle loader in `Emdad Oxygen Shop - Offline.html`. Two premises in my brief were **false and are corrected below** (no CDN anywhere; "spike first" is redundant).

## 0. BOTTOM-LINE VERDICT (read this first)

GSAP core + the plugins this lens names is **~125–200KB uncompressed** added to a *fully self-contained, offline, 1MB* demo whose existing **VT + WAAPI + CSS** layer already covers page transitions, list FLIP, theme reveal, card→detail morph, fly-to-cart, and badge/heart pops. **GSAP is only justified if the team commits to the one thing that layer genuinely cannot do: physics drag-to-dismiss on the bottom-sheets (+ the deferred swipe-carousel once real product images exist).** If they will not ship drag-to-dismiss, **do not add GSAP** — every other proposed use is either content-blocked or redundant, and the bundle weight is net-negative.

**Triage of the 9 proposed uses:**

| Tier | Feature | Call |
|---|---|---|
| **GENUINE** | Draggable+Inertia **drag-to-dismiss** on filter & address sheets | **Flagship — do it** |
| **GENUINE** | **DrawSVG** success/formSuccess checkmark stroke | Cheap, high-polish — do it |
| **GENUINE (marginal)** | **CustomWiggle** invalid-field shake / **CustomBounce** success | Legit micro-polish — optional |
| **DEFERRED (content-blocked)** | Draggable **swipe carousel** on detail | Design now, **gate behind PREMIUM product illustrations** — there is only one placeholder box + 3 hardcoded dots today; nothing to swipe |
| **DEFERRED (no trigger)** | **Flip** related-rail reshuffle | Related list is a static 2-item column that only changes on navigation (a route VT). No in-place reshuffle exists to animate. **Skip until a reshuffle interaction is added** |
| **RECOMMEND-AGAINST (redundant)** | **Flip** cart/wishlist remove | `vtFlip('[data-cid]','c-')` / `vtState` already do this and work |
| **RECOMMEND-AGAINST (redundant)** | **MorphSVG** theme sun↔moon | The full-page `themeVT` circle-reveal owns that moment; a morphing icon underneath it is invisible |
| **RECOMMEND-AGAINST (redundant)** | **CustomEase** on fly-to-cart arc | `flyToCart` WAAPI keyframes already arc via `cubic-bezier(.5,-0.2,.35,1)` + a `-110px` apex |
| **BLOCKED — do NOT ship as designed** | **SplitText char-stagger** title reveals | **Farsi is cursive/connected; per-char split breaks glyph joining.** See §3.4 |

Everything below is written so the app **builds and boots at every step**.

---

## 1. G0 — LOADING (foundational; must land first; build.py owns it atomically)

### How the bundle actually works (verified — this is the exact pattern to mirror)
The outer file's bootstrap `<script>` (offset 2337 in `Offline.html`) does: parse `__bundler/manifest` JSON `{uuid:{mime,compressed,data}}` → `atob` → `DecompressionStream('gzip')` → `URL.createObjectURL(Blob)`; then **`for (uuid) template = template.split(uuid).join(blobUrl)`** (global string replace of the UUID anywhere in the template); then DOMParser + **re-creates every `<script>` and `await`s each `src` script's `onload` in document order**. **Leaflet (`1442f24e`, 147KB) is bundled exactly this way** and referenced by `<script src="1442f24e-…">` at template line 893. `window.L` ends up defined off a blob — identical to how `window.gsap` will.

**→ Skip the "5-min availability spike." Leaflet is the passing spike, in production, using the identical mechanism.** Cite it; don't burn browser/network budget re-proving it.

**→ Correction:** there are **zero CDN references** in the file (grep confirms). React/ReactDOM/Babel are **not** on unpkg — `7cca234d` is the bundled custom **dc-runtime** and the app script is `type="text/x-dc"` (no Babel). So "CDN fallback like React" has no existing precedent to mirror; framed correctly in §1.4.

### 1.1 Bundle spec — ONE concatenated resource, ONE manifest key, ONE script tag
Concatenate the **minimum committed set** in dependency order into a single `gsap-emdad.min.js`:
```
gsap.min.js  →  CustomEase.min.js  →  CustomBounce.min.js  →  CustomWiggle.min.js
             →  InertiaPlugin.min.js  →  Draggable.min.js  →  DrawSVGPlugin.min.js
```
(CustomEase must precede CustomBounce/CustomWiggle; InertiaPlugin must precede Draggable for `inertia:true`.) **Exclude** Flip / MorphSVG / SplitText from the initial bundle — they only serve deferred/redundant features; add later only if those features are committed. Fetch once into scratchpad from `https://unpkg.com/gsap@3.13.0/dist/<name>.min.js` (all free since Webflow's acquisition — no auth token, no `npm.greensock.com`).

### 1.2 Extend build.py (currently it does NOT touch the manifest — this is the key tooling gap)
`build.py` today only `must_replace`s the CSS/JS blocks inside the template string and applies `markup_edits`. Add a manifest-injection step that edits the **outer** file's `__bundler/manifest` JSON:
```python
GSAP_UUID = "gsap0000-0000-4000-8000-000000000001"   # any fixed unique UUID
raw  = open(f"{SCRATCH}/gsap-emdad.min.js","rb").read()
data = base64.b64encode(gzip.compress(raw)).decode()
mm = re.search(r'(<script type="__bundler/manifest">\s*)(.*?)(\s*</script>)', html, re.DOTALL)
man = json.loads(mm.group(2))
man[GSAP_UUID] = {"mime":"text/javascript","compressed":True,"data":data}
html = html[:mm.start(2)] + json.dumps(man, ensure_ascii=False) + html[mm.end(2):]
# (re-extract the template AFTER this splice, since offsets shifted)
```
Then inject the script tag via `markup_edits.json`, **before** the dc-runtime tag so `window.gsap` exists before mount:
```json
{ "what":"gsap bundle (before dc-runtime)", "count":1,
  "find":"<script src=\"7cca234d-1457-4bcd-98a5-e26274dc969f\"></script>",
  "replace":"<script src=\"gsap0000-0000-4000-8000-000000000001\"></script>\n<script src=\"7cca234d-1457-4bcd-98a5-e26274dc969f\"></script>" }
```
The loader's await-in-order guarantees GSAP fully executes before the runtime script runs.

### 1.3 Registration — once, guarded, mirroring the `window.L` retry
The runtime `window.L` retry (`manageMaps` L106: `if (!L) setTimeout(...300)`) is the precedent. Register idempotently at mount and keep a retry so nothing calls an unregistered plugin:
```js
ensureGsap() {                       // called from componentDidMount + start of each GSAP feature
  const g = window.gsap;
  if (!g) { clearTimeout(this._gsapRetry); this._gsapRetry = setTimeout(()=>this.ensureGsap(),120); return false; }
  if (!this._gsapReady) {
    g.registerPlugin(window.InertiaPlugin, window.Draggable, window.DrawSVGPlugin,
                     window.CustomEase, window.CustomBounce, window.CustomWiggle);
    // reduced-motion aware defaults; matchMedia scopes drag vs decorative (see §4)
    this._gsapReady = true;
  }
  return true;
}
```

### 1.4 CDN fallback — deliver it, but framed honestly
Pure-CDN breaks the offline guarantee and has no precedent here. The *correct* fallback is **bundle-primary + a guard that injects a CDN `<script>` only if `window.gsap` is still undefined after decode** (belt-and-suspenders on top of the retry):
```js
if (!window.gsap && !this._gsapCdnTried) {
  this._gsapCdnTried = true;
  const s=document.createElement('script');
  s.src='https://unpkg.com/gsap@3.13.0/dist/gsap.min.js'; s.onload=()=>this.ensureGsap();
  document.head.appendChild(s);   // plus one tag per plugin, in order
}
```
Note in the deliverable: this only helps a *non-offline* deployment; for the self-contained demo the bundle is authoritative.

**Effort G0: M.** Risk: build.py offset bug after the manifest splice (re-extract template afterwards); base64 size (+~60KB gzipped — trivial vs 1MB). **This step must pass "boots + `window.gsap` truthy" before any feature code.**

---

## 2. TIER 1 — GENUINE (build these)

### 2.1 Draggable + Inertia drag-to-dismiss on the two bottom-sheets — FLAGSHIP (Effort M)
**Why GSAP:** native VT/CSS cannot do a finger-tracking, velocity-thrown, rubber-band-resisted sheet dismissal. This is the one feature that earns the dependency.

**The dc-runtime coexistence problem (load-bearing):** both sheets are `<sc-if>`-gated (`{{ sheet }}` L840, `{{ addrSheetOpen }}` L864) → **the sheet DOM is destroyed/recreated on every `setState` while open** (e.g. `toggleStock`, `so.pick`, address `sa.pick`). A Draggable bound to the old node is orphaned each render. **Mirror `manageMaps`'s node-identity guard** (`this._pickerEl !== pel`, L112, kill-stale-on-unmount):
```js
manageSheetDrag() {
  if (!this.ensureGsap()) return;
  const panel = document.querySelector('[data-sheet-panel]');   // the animated sheetIn div
  if (!panel) { if (this._sheetDrag){ this._sheetDrag[0].kill(); this._sheetDrag=null; this._sheetDragEl=null; } return; }
  if (this._sheetDragEl === panel) return;                      // same node — keep instance
  if (this._sheetDrag) this._sheetDrag[0].kill();
  const close = panel.getAttribute('data-sheet-close');         // 'closeSheet' | 'closeAddrSheet'
  this._sheetDragEl = panel;
  this._sheetDrag = window.Draggable.create(panel, {
    type:'y', inertia:true, dragClickables:false,
    trigger: panel.querySelector('[data-sheet-grab]') || panel,  // the 40x4 grabber pill (L844/868)
    bounds:{minY:0, maxY:panel.offsetHeight}, edgeResistance:0.9, allowContextMenu:true,
    onDragEnd(){
      const dismissed = this.y > panel.offsetHeight*0.35 || this.getDirection('velocity')==='down' && this.y>60;
      if (dismissed) window.gsap.to(panel,{y:panel.offsetHeight,duration:0.22,ease:'power2.in',
        onComplete:()=> (close==='closeAddrSheet' ? _self.setState({addrSheet:null,addrSheetTarget:null})
                                                   : _self.setState({sheet:false}))});
      else window.gsap.to(panel,{y:0,duration:0.4,ease:'elastic.out(1,0.75)'});   // rubber-band back
    }
  });
}
```
- **Hooks (markup_edits):** add `data-sheet-panel data-sheet-grab`… actually two attrs — tag the panel `data-sheet-panel data-sheet-close="closeSheet"` and the grabber pill `data-sheet-grab`, for both the filter sheet (L843/844) and address sheet (L867/868).
- **Call site:** add `this.manageSheetDrag()` to `componentDidMount` (after L76) and `componentDidUpdate` (after L88) — same slot as `manageMaps()`/`manageSheetA11y()`. Kill in `componentWillUnmount` (L90-95).
- **Coexists with `sheetIn` open animation:** Draggable sets an inline `transform`; the CSS `animation:sheetIn` runs once on mount then Draggable owns `y`. No conflict (animation finishes; Draggable writes transform after). Keep the scrim-tap `closeSheet` as the non-gesture path.
- **Coexists with `manageSheetA11y`:** unaffected — it keys off `[style*="sheetIn"]`; Draggable doesn't remove that.
- **Reduced-motion:** the gesture is **functional, not decorative** — keep dragging live; only make the inertia **snap instant** (`duration:0.001`) under `prefers-reduced-motion`. Do NOT disable the drag.

### 2.2 DrawSVG success checkmark (Effort S)
`isSuccess` (L603) and `isFormSuccess` (L526 region) each render a single-stroke tick `<path d="M4 12.5l5 5L20 7">` inside an 84px `--ok-soft` disc — an ideal DrawSVG target (single open path, visible stroke).
- **Hook (markup_edits):** add `data-success-check` to that `<path>` (both screens).
- **JS:** in `componentDidUpdate`, on entering a success route, **after the route VT settles** (these routes are reached via `go()` forward-cover-slide — fire on the next frame or gate on `!document.documentElement.dataset.vt`) run:
  `window.gsap.fromTo('[data-success-check]',{drawSVG:'0% 0%'},{drawSVG:'0% 100%',duration:0.5,ease:'power1.inOut'})` optionally chained with a `CustomBounce`-eased disc scale-in.
- **Coexistence:** success screen mounts once and doesn't re-render (no state churn) → stroke-dashoffset survives; safe. Honors reduced-motion via the existing global CSS kill + an `ensureGsap`/reduce early-return.
- Requires **DrawSVGPlugin** in the bundle (already listed §1.1).

### 2.3 CustomWiggle field-shake / CustomBounce (Effort S, optional)
Register once, then eases become names. Invalid-field shake on validation fail (`rfErrs`/`usErrs`/`adErr` set): `gsap.fromTo(fieldEl,{x:-6},{x:0,duration:0.5,ease:'wiggle({type:easeOut,wiggles:5})'})`. This is nicer than a CSS shake but **marginal** — a 4-line CSS keyframe does ~90% of it. Ship only if CustomWiggle/Bounce are already bundled for §2.2's disc bounce; otherwise not worth the two extra plugin files alone.

---

## 3. TIER 2/3 — DEFER or DECLINE (with reasons)

### 3.1 Swipe carousel on detail — DEFER (content-blocked) (Effort M once unblocked)
Detail has **one** `data-hero-img` placeholder box (L178) + **three hardcoded** dot `<span>`s (L182-184); there are no multiple slides and no per-product image array in `PRODUCTS`. A Draggable `type:'x'` snap-carousel needs a real multi-image track first. **Dependency: PREMIUM_PLAN "product illustrations."** Design: a flex track of slides, `Draggable type:'x'` with `snap` to slide widths + `inertia`, driving a reactive `curSlide` state for the dots. Do **not** build until images land — and reconcile with VT_OPPORTUNITIES' planned card→detail hero morph (the hero image is the shared element; the carousel must not re-tag `view-transition-name:hero-img` mid-drag).

### 3.2 Flip related-rail reshuffle — DECLINE-for-now (no trigger) (Effort S)
`related` (renderVals L682) is `PRODUCTS.filter(cat===cur.cat).slice(0,2)` — a static 2-item **vertical column** (markup L222-233). It changes **only** when you navigate to a different detail, which is already a full route transition (the planned hero VT). Flip's scroll-immunity advantage is real in general but **there is no scrolled in-place reshuffle in this app to benefit from it.** Skip until/unless someone adds an in-place "related" swap.

### 3.3 Redundant with the existing layer — DECLINE
- **Flip cart/wishlist remove:** `vtFlip('[data-cid]','c-')` (renderVals L564/567) and `vtState` (wishlist, `vm().unwish` L365) already FLIP correctly. Replacing working VT code with GSAP adds weight for zero visible gain.
- **MorphSVG theme sun↔moon:** `themeVT` (L249) plays a full-page clip-path circle-reveal that **covers the toggle** — a morph under it is unseen.
- **CustomEase fly-to-cart arc:** `flyToCart` (L319-340) already arcs via WAAPI keyframes with a `-110px` apex and a custom cubic-bezier. Converting to a GSAP MotionPath/Inertia arc is lateral, not better. (Note: `flyToCart` targets `[data-navtab="cart"]`, which **is** injected via markup_edits line 58-60 — the target exists; leave it.)

### 3.4 SplitText title reveals — BLOCKED as designed; restrict scope
**Persian/Arabic is a connected cursive script; `SplitText type:"chars"` isolates each letter into its own run and breaks glyph joining → words render as disconnected, barely-legible isolated forms.** Char-stagger title reveals are **out** for every Farsi heading in this app.
- **Only safe modes:** `type:"words"` or `type:"lines"` (each unit stays one shaping run), ideally `mask:"lines"` for a premium masked slide-up, and `aria:"auto"` (default) for screen-reader correctness in RTL.
- **VT competition:** titles arrive via the route cover-slide — the heading already slides in with the page. A SplitText reveal on top double-animates. Fire it **only on non-VT arrivals** (reduced-motion path, or same-route content swaps) **or after `t.finished`** of the route VT. Given that constraint, the payoff is small.
- **Also:** SplitText cannot touch SVG `<text>`, so an "O₂ logo reveal" is **DrawSVG on a stroked-path logo** (the current brand mark at L37/L673 is text — it needs a stroked-path asset first; flag as blocked).
- **Recommendation:** SplitText is **not** in the initial bundle; add only if the team wants word/line masked reveals on the ~2 big screen titles and accepts the VT-timing caveat.

---

## 4. CROSS-CUTTING COEXISTENCE RULES (bake into every GSAP tween)

1. **React/dc-runtime re-render wipes inline transforms** (this is *why* `pop()` re-fires via forced reflow, L268-275). GSAP tweens on runtime-controlled nodes must either (a) **finish within one render cycle**, (b) be **re-asserted in `componentDidUpdate`**, or (c) target **detached/cloned nodes** (like `flyToCart`'s clone) or **manage\*-owned instances** (Draggable via `manageSheetDrag`). Prefer (c)/manage-owned; never leave a long GSAP tween running on a node the next `setState` will re-serialize.
2. **Don't fight the VT layer.** Any GSAP entrance on a route arrival must yield to the active `data-vt` cover-slide/hero/theme/list mode: gate on `!document.documentElement.dataset.vt` or run after `transition.finished`.
3. **Reduced-motion = reduce, not remove.** Match the existing `window.matchMedia('(prefers-reduced-motion: reduce)')` guards used in `nav`/`vtFlip`/`openMorph`/`themeVT`/`pop`/`flyToCart`. Use **`gsap.matchMedia()`** to scope: decorative tweens (checkmark, wiggle) → early-return/instant; **functional drag stays live**, only its inertia snap goes instant. The CSS block L188-191 already nukes `animation/transition` globally under reduce — GSAP JS tweens are *not* covered by that, so the JS guard is mandatory.
4. **VT name uniqueness** is unaffected by GSAP (GSAP writes `transform`, not `view-transition-name`) — but §3.1's carousel must not collide with the hero-img shared-element name during a drag.

---

## 5. CORRECT SEQUENCE, DEPENDENCIES, EFFORT

| Step | What | Effort | Depends on | Must precede |
|---|---|---|---|---|
| **G0** | Bundle GSAP (build.py manifest inject + script tag + `ensureGsap` register guard + CDN fallback). Verify boots + `window.gsap`. | **M** | build.py extension | **everything** |
| **G1** | Drag-to-dismiss sheets (`manageSheetDrag`, node-identity guard, markup hooks, mount/update/unmount wiring) | **M** | G0 | — |
| **G2** | DrawSVG success checkmark (markup `data-success-check`, VT-gated fire) | **S** | G0 | — |
| **G3** | CustomWiggle/Bounce micro-polish (shake, disc bounce) | **S** | G0 | — |
| **G4 (deferred)** | Swipe carousel | **M** | G0 **+ PREMIUM product illustrations** + reconcile with hero-morph VT | — |
| **—** | Flip rail / Flip cart / MorphSVG theme / CustomEase fly / SplitText char-stagger | **—** | **declined** (see §3) | — |

**Interaction with the functional epics (`designs/?.md` integration plan):** GSAP's only shared-file touchpoints are `componentDidMount`/`componentDidUpdate`/`componentWillUnmount` (add `manageSheetDrag()`/`ensureGsap()` calls) and `markup_edits.json` (new data-attrs) and `build.py` (manifest). The functional epics `persistence` and `routing-history` also edit those lifecycle hooks first. **Sequence G0–G3 *after* persistence+routing have set their hook edits** (or author the GSAP additions as standalone appended `this.manageX()` calls so the merge is additive, not a three-way conflict). No overlap with the VT container-transform / OTP-slide / reverse-morph work in VT_OPPORTUNITIES (those are VT, not GSAP).

## 6. TOP RISKS
- **build.py manifest splice** shifting the template regex offsets — re-extract the template *after* the manifest edit. (Highest-churn tooling risk.)
- **Draggable orphaning** on sheet re-render — mitigated only by the `_sheetDragEl` node-identity guard; without it, drag silently dies after the first in-sheet `setState`.
- **Weight for nothing** — if only G0 ships without G1, you've added ~45KB gzipped for zero user-visible capability. Gate the whole workstream on committing to drag-to-dismiss.
- **RTL SplitText** — already de-scoped above; do not let a later contributor re-introduce `type:"chars"`.

**Files touched:** `build.py` (manifest inject), `markup_edits.json` (data-hooks + script tag), `script_2.work.js` (`ensureGsap`/`manageSheetDrag` + lifecycle wiring + checkmark/wiggle calls), `style_3.work.css` (only if adding a reduced-motion CSS fallback for the checkmark). New scratchpad input: `gsap-emdad.min.js` (concatenated dist files).