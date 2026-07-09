Verified against the current files and reconciled with the advisor. Here is the sequencing plan for the MONOLITH-RISK / SHIP-GREEN lens.

---

# EMDAD OXYGEN — MONOLITH RISK & SHIP-GREEN SEQUENCING

## 0) Reality-check (what the stale docs get wrong about the CURRENT files)

Verified against `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js` (808 L), `style_3.work.css` (207 L), `markup_current.html` (932 L), `markup_edits.json`, `build.py`.

- **The integration plan (`designs/?.md`) predates the motion layer.** It says routing must *create* `go()`/`DEPTH`. Both already exist: `go(patch)` L188 (computes direction, calls `nav()`), `DEPTH` L173, `TAB_ORDER` L174, `ROUTE_TAB` L175. **Routing must EXTEND `go(patch)`→`go(patch,opts)`, not author it.** This is the single most important correction.
- **Adding a route touches FOUR maps, not one:** `DEPTH` (L173), `ROUTE_TAB` (L175), the DUPLICATE inline `activeMap` inside `renderVals` (L610-615), plus routing's new `ROUTE_PATH`. The plan says "add `about:1` to DEPTH" and understates the other three. Trust-content will silently mis-highlight the nav tab if the inline `activeMap` copy is missed.
- **VT_OPPORTUNITIES.md items #1-4 are ALREADY SHIPPED** (`openMorph` L220, `vtFlip` L204, `vm.open`→morph L362, cart/wishlist FLIP, nav pill CSS). **Remaining VT work:** container-expand (services/home→forms), cart→checkout twin, auth OTP step-slide, reverse card-morph, in-sheet pick→form.
- **PREMIUM_PLAN.md substrate is largely shipped** (`--p:#087a6a` L12, de-tint, `--line` ink hairline, `--e0–e4` ramp, aurora recolor, `:root` token scales L85-102). **Remaining premium:** SNAP component styles to tokens, unified app-bar, product illustrations, P2 polish. PREMIUM §5 explicitly forbids new mainline motion and requires the app-bar to stay **unnamed**.
- **GSAP is genuinely absent** (0 refs in app code). Net-new heavy dependency.
- **Back buttons: there are NINE inline copies** (L170/318/391/474/548/688/720/752/804), not the "4 pairs" the plan lists.

**Build model (the ship-green substrate):** `build.py` swaps the WHOLE `script_2.orig.js`/`style_3.orig.css` blocks for the work files (so **JS/CSS collisions are purely sequential-authoring, never build-breaking**), then applies `markup_edits.json` with **strict exact-count matching** — a stale find-string is a hard `BUILD ERROR`, not a silent no-op. **The only build-breaking surface is markup_edits.json counts + the two orig-block anchors staying verbatim in SRC.** But: **build-OK is necessary, not sufficient** — it proves nothing about JS validity, CSS substring-hook integrity, or that the app boots.

## The three colliding lanes (all funnel through the same 3 files + manifest)
- **F — Functional epics:** persistence, routing-history, lifecycle-loading, delivery-scheduling, trust-content, deeper-a11y. (photo-upload dropped.)
- **M — Motion/VT:** container-expand, cart→checkout twin, auth step-slide, reverse morph, in-sheet pick→form; (+optional GSAP).
- **V — Premium/visual:** token-snap, app-bar, illustrations, P2 polish.

---

## (a) HOT-SPOT COLLISION TABLE

Rows = hot regions; columns = phases that touch them (defined in §b). `●` = primary rewrite, `+` = additive/compose. Multi-touch rows are the danger.

| Hot region (file · anchor) | P1 V | P2 pers | P3 route | P4 bar | P5 lifecyc | P6 deliv | P7 trust | P8 illus | P9 expand | P10 a11y | P11 poly |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `componentDidMount` (js L67) | | ● | ● | | + | | | | | | |
| `componentDidUpdate` (js L78) | | ● | ● | | | | | | | + | |
| `go()`/`nav()` + `DEPTH`/`ROUTE_TAB`/inline `activeMap`×4 (js L173-197, L610) | | | ● | | | | ●+ | | + | | |
| back-buttons ×9 → app-bar (mk L170…804) | | | (defer) | ● | | | + | | | | |
| `placeOrder`/`completeRefill`/`completeUsed` (js L408-492) | | +hook | ●opts | | ●run | ●seed | | | | | |
| `goRefill`/`goUsed` (js L653-654) | | | | | | +seed | | | ●reroute-call | ●reset-patch | |
| `goCheckout` (js L658) | | | | | +guard | | | | ●reroute(logged) | | |
| forms markup: refill/used/checkout | ✗leave | | | | +CTA | ●sched | +rx | | +hero-band | ●R1-R28 | |
| orders/requests cards (mk L685-748) | | | | + | ●timeline | ●bake-row | | | | | + |
| gradient thumb / `data-hero-img` (mk L89/133/178/226) | ✗leave | | | | | | | ●SVG | (compose) | | + |
| `openAddrForm`/`sheetAddrs`/`saveAddr`/`closeOverlays` (js L463-479, 574-594) | | | ●modal | | | | | | | ●focus | |
| `renderVals` field bag (js L640-806) | +styles | + | + | ● | + | + | + | + | + | + | + |
| `:root` + material substring hooks (css L59-66, 85-102) | +tokens | | | | +spin | +rail | +trust | | +mode | +a11y | +poly |
| `markup_edits.json` (append + strict count) | ✗ | | (defer) | ● | ● | ● | ● | ● | ● | ●last | ● |

**The five red cells (multi-lane, highest churn):**
1. **`componentDidMount`/`DidUpdate`** — F-persistence ● and F-routing ● both rewrite. → author **adjacent** (P2+P3), reconcile once.
2. **orders/requests cards** — F-lifecycle timeline ● × F-delivery row ● (Conflict C): delivery's find-string lives verbatim inside lifecycle's replacement → **one hand-written combined replacement per card**, never two sequential edits.
3. **back-buttons/app-bar** — F-routing wants `goBack`, V-app-bar deletes all 9. → **routing does NOT touch the 9 backs (P3); app-bar consumes `goBack` (P4).**
4. **`goRefill`/`goUsed`** — M-expand reroutes the *call*, a11y edits the *patch contents*, delivery seeds keys. → layered, non-conflicting **only if a11y (P10) precedes expand (P9)'s call-wrap OR expand wraps a11y's final patch** (resolved in §b: a11y is the last patch-editor, expand/micro-VT the finale).
5. **gradient/`data-hero-img`** — V-illustrations swaps gradient→SVG; M-hero-morph (shipped) animates that element. → illustrations must keep `data-hero-img` and render **the same `PRODUCT_ART[pid]` at card thumb and detail hero** (SVG→SVG interpolation).

---

## (b) RECONCILED BUILD ORDER — 12 phases, each independently buildable + bootable + verifiable

Each phase ends GREEN by the two-tier gate in §c. Rationale = the gate that forces the position.

**P0 — SPIKES (throwaway, ship nothing).** De-risk before any feature commits.
- (a) **Routing spike** — exercise the delicate coupling, not "extend go()": `history.pushState` under `file://` wrapped in `histWrite` (catch `SecurityError`); hardware Back → `popstate` → `applyPop` → `nav(patch,'back')` so history-direction drives VT-direction. This is the real risk.
- (b) **Expand-VT spike** — 10-min throwaway confirming `data-vt="expand"` (crossfade root + `expander` group) *reads* as a container morph. (Reduced-motion is auto-covered by the CSS backstop css L188-191 — spike is visual only.)
- (c) **GSAP-loading spike** *(only if a lens names a feature needing timeline choreography WAAPI can't do)* — the spike is **build-infra, not animation**: `build.py` does NOT touch the `__bundler/manifest`, so offline GSAP needs manifest injection (extend build.py) or unpkg (breaks offline). **Default: DROP** (see §d).
- (d) **G0 build-gate check** — confirm `data-pid`/`data-cid` hooks land in the BUILT OUT DOM and current build is green before adding hooks.

**P1 — VISUAL SUBSTRATE (V, scoped).** *Gate: everything downstream targets snapped values (PREMIUM move #1); do before any F/M markup edit exists.*
Snap **only the JS dynamic style strings** (`chipBase` L523, `navBase` L602, `dotStyle`, switch/knob L676-679 — whole-block replace, build-safe) to the already-present `:root` tokens. **Leave hook-bearing markup inline styles literally unchanged** (`[style*="background:var(--sur)"]`, `z-index:40`, `border-radius:20px 20px 0 0`) — snapping them silently detaches the elevation material (no BUILD ERROR, no console error, just flat). Finalize any residual de-tint/line/elevation in CSS.

**P2 — PERSISTENCE (F1).** `durableSlice`/`persist`/`hydrate` + `DURABLE` whitelist; `hydrate()` into `componentDidMount`; `persist()` appended to `componentDidUpdate` (last, no setState → never fights VT). *Gate: foundation hook pattern everything extends.*

**P3 — ROUTING/HISTORY (F2).** **Extend** `go(patch)`→`go(patch,opts)` threading `opts.replace` into `histWrite`; add `ROUTE_PATH`/`parseHash`/`histWrite`/`saveScroll`/modal helpers/`goBack`/`applyPop`; replace the didUpdate route block (L78-89) with the navKey scroll/focus block; `popstate`/`hashchange`/scroll listeners + `componentWillUnmount`. Convert `placeOrder`/`completeRefill/Used`/`authBack`/`saveAddr`/`closeOverlays` to history-aware. **Do NOT rewire the 9 inline backs** (app-bar owns them). *Gate: authored adjacent to P2 (shared didMount/didUpdate).* Interim ship-green: inline backs still hard-code their parent (work as forward-nav; not yet true history-back — acceptable).

**P4 — UNIFIED APP-BAR (V).** One in-flow **UNNAMED** bar (`grid:40/1fr/40; height:56`) — must stay unnamed so it slides *with* its page under the cover-slide (opposite of the bottom nav, which IS `emdad-nav` and persists). Replace all 9 inline backs; single back binds routing's `goBack`. *Gate: needs `goBack` (P3); precedes trust (about gets the bar free) + all header polish.* **Highest markup-edit-count change after Conflict C → dedicated build-green verify (each of 9 deletions must hit exact count).**

**P5 — LIFECYCLE-LOADING (F3).** FLOW consts, `run()`/`nowFa`/`orderVm`/`requestVm`/`advance*`, record shape `stage`+`stamps` (drop frozen `status`/`statusKind`), rewrite `placeOrder`/`completeRefill/Used` merging P3's `{replace}` opts, `busy`/spinner CSS. *Gate: defines canonical record shape delivery+a11y build on.* **Clear `emdad:v1` at this boundary** (P2-P4 orders are old-shape).

**P6 — DELIVERY (F4).** `SLOTS`/`scheduleLabel`; **merge** delivery keys INTO P5's handler patches (union, per plan §D/E); fold `deliveryLabel` into `orderVm`/`requestVm`; checkout+refill scheduler markup; **bake the delivery row into P5's card replacement** (Conflict C — one combined replacement, never standalone 4e/4f).

**P7 — TRUST (F5).** `about` route → **all four maps** (`DEPTH` + `ROUTE_TAB` + inline `activeMap` L610 + `ROUTE_PATH`); `activeMap.about='home'`; menuRows entry; detail safety/rx (gate off `co2`/`mano` content bug); home strip; about back = `goBack`. *Gate: needs P3 `ROUTE_PATH` for `#/about` deep-link.*

**P8 — PRODUCT ILLUSTRATIONS (V).** `PRODUCT_ART` 4-archetype inline-SVG (duotone via inline `style`, not `var()` in presentation attrs); mount into `--sur2` stages; **preserve `data-hero-img`; render same `PRODUCT_ART[pid]` at card thumb AND detail hero**; fix related-thumb crosshatch (mk L226). *Gate: independent of record-shape; only hard check = re-verify card→detail morph reads SVG→SVG.*

**P9 — CONTAINER-EXPAND + CART→CHECKOUT TWIN (M).** `expandTo(patch,srcSel,dstSel)` + `data-vt="expand"` mode; reroute `goRefill`/`goUsed`/`goCheckout`(logged-in branch) — **wraps the CALL** around the now-final handlers; form hero-band dests compose with P4 app-bar + P8 art. *Gate: handlers finalized by P5-P8.*

**P10 — DEEPER A11Y (F6).** Validators/focus-trap/aria-live; rewrite `submitRefill/Used` on P5 bodies; merge into **routing's** address-sheet closures (P3 versions); **R1-R28 markup LAST** (supersede `role="button"`); edits the *patch contents* nested inside P9's `expandTo(...)` (non-conflicting layer). *Gate: must follow routing (targets its closures) + lifecycle (validate-gate wraps `run()`).*

**P11 — MICRO-VT + P2 POLISH (M+V).** auth OTP step-slide, reverse card-morph, in-sheet pick→form; currency unit, switch-knob `translateX`, success-check stroke-draw, empty-state art, trust strip. Each independent fast-follow.

**Ordering nit resolved (advisor):** a11y (P10) is the last editor of handler *patch contents*; container-expand/micro-VT (P9/P11) wrap the *call* — they are non-conflicting layers. P9 sits before P10 because expand's markup dests must exist before a11y's R1-R28 re-anchors the forms; a11y then edits inside the already-rerouted patch.

---

## (c) "KEEP IT SHIPPABLE" CHECKLIST — run after EVERY phase (two-tier)

**Tier 1 — BUILD (mechanical, build.py enforces):**
1. `python3 /private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/build.py` → prints `BUILD OK`.
2. Every `markup_edit` prints its expected `x<count>` (a mismatch aborts — good).
3. `script_2.orig.js` / `style_3.orig.css` still match SRC verbatim (untouched).

**Tier 2 — BOOT (build.py canNOT catch these):**
4. **Open OUT** `/Users/macbook/Desktop/Emdad Oxygen Shop - Enhanced.html` in a browser (file://; React/Babel from unpkg = needs network). App renders — proves JS validity (a syntax error string-replaces fine and only explodes here).
5. **Console clean** — no errors/warnings; navigate every route touched this phase.
6. **Material-hook integrity** (P1/P4/P8 especially): `grep` OUT for `background:var(--sur)`, `z-index:40`, `border-radius:20px 20px 0 0` — all still present (silent flatten has no console signal).
7. **Reduced-motion:** OS reduce-motion ON → reload → no frozen VT/spinner, plain setState fallback (CSS backstop css L188-191 auto-covers new VT modes; new JS helpers still need the `matchMedia` early-return).
8. **Theme + persistence smoke:** toggle theme (circle reveal, no flash); reload (durable state restored, transient/route not).

**Phase-specific adds:** P3 → hardware Back restores route+scroll with back-VT, no `SecurityError`, deep-link `#/product/oxy10` + bad `#/nope`→home. P4 → all 17 routes show the one bar, back works everywhere. P5 → clear `emdad:v1`, double-tap checkout = 1 order. Conflict-C phases (P5/P6) → visually confirm delivery row sits in the collapsed summary, not inside the toggle header. P8 → card→detail morph reads.

---

## (d) TOP RISKS & DE-RISKING (spikes first)

1. **Token-snap silently detaches the elevation material (no BUILD ERROR, no console).** → Scope P1 to JS dynamic strings only; leave hook-bearing markup styles literally unchanged; add the grep-hook check (#6) to the gate.
2. **Conflict C orders/requests three-way merge (lifecycle × delivery).** Highest bug risk. → One hand-written combined replacement per card; never apply delivery's row as a standalone edit; dedicated visual verify.
3. **Adding `about` mis-highlights the nav (four maps, one missed).** → Checklist item: every new route updates `DEPTH` + `ROUTE_TAB` + inline `activeMap` L610 + `ROUTE_PATH` together.
4. **Back-button double-edit (routing × app-bar).** → Routing (P3) leaves the 9 backs alone; app-bar (P4) is the sole editor, binds `goBack`.
5. **Illustrations break the shipped hero-morph.** → Keep `data-hero-img`; same `PRODUCT_ART[pid]` both ends; re-verify morph in P8's gate.
6. **file:// routing throws `SecurityError` on `pushState`.** → `histWrite` try/catch wrapper; exercised in the P0 routing spike.
7. **GSAP — recommend DROP.** Net-new heavy dep; offline path needs manifest injection build.py doesn't do (the real spike is build-infra); a GSAP tween on an element also under `startViewTransition` fights the single-active-VT model; PREMIUM §5 forbids new mainline motion and the shipped WAAPI+VT+CSS stack is mature. Adopt ONLY if a lens names a feature needing timeline choreography WAAPI can't express — then P0 spike bundles `gsap.min.js` into the manifest (gzip+base64 like Leaflet) and proves offline boot + `gsap.matchMedia` reduced-motion gate before any feature.

**Spikes that MUST precede features:** P0(a) routing (history↔VT-direction coupling) before P3; P0(b) expand-VT read before P9; P0(c) GSAP manifest-injection before ANY GSAP feature (or drop). **Hard precedence chain:** P1 substrate → P2+P3 adjacent → P4 app-bar → P5 shape → {P6 delivery, P7 trust} → P8 art → P9 expand → P10 a11y (markup last) → P11 polish. Reordering silently reverts reconciled merges (a11y before routing/lifecycle targets the wrong method bodies; delivery before lifecycle adds to an undefined record shape; app-bar before routing has no `goBack`).

Relevant files: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/script_2.work.js`, `style_3.work.css`, `markup_current.html`, `markup_edits.json`, `build.py`; source-of-truth prior art `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/designs/?.md` (reconcile per §0, do not follow its stale line numbers or "create go()" framing).