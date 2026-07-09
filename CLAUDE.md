# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Persian/Farsi **RTL medical-oxygen mobile-commerce PWA**, shipped as a **single self-contained offline HTML file** (`Emdad Oxygen Shop - Enhanced.html`). It runs with the network off — React 18, GSAP, map tiles, fonts, and all assets are inlined. There is no server, no package manager, no test runner, and (currently) no git.

The app is built on a reverse-engineered proprietary React framework called **dc-runtime** (a template-interpreter that renders a compiled `<x-dc>` template against a `Component extends DCLogic` class). You do not have the framework source; you have the *original bundle* and edit the app on top of it.

## Build & run

There is no build server. The deliverable is regenerated from the untouched original by a Python script:

```bash
python3 build/build.py     # regenerates "Emdad Oxygen Shop - Enhanced.html" in place
```

Then open `Emdad Oxygen Shop - Enhanced.html` in any modern browser (double-click / `file://`). Demo login OTP is `123456`.

There are **no tests and no linter.** Verification is manual: build, open the file, exercise the flow. Prefer serving over a local dev server (`python3 -m http.server`) rather than raw `file://`, because `localStorage` persistence is unreliable under the `file://` origin.

## The one rule of editing: never hand-edit the HTML

The two big HTML files are **generated artifacts** — never edit them directly:
- `Emdad Oxygen Shop - Offline.html` — the pristine build **source** (the original bundle). Read-only.
- `Emdad Oxygen Shop - Enhanced.html` — the **output** of `build.py`. Read-only; overwritten every build.

All real work happens in exactly three build inputs, then you re-run `build.py`:
- `build/script_2.work.js` — the app logic (`class Component extends DCLogic`). **This is the main file you edit.**
- `build/style_3.work.css` — the design system + motion CSS.
- `build/markup_edits.json` — exact find/replace micro-edits applied to the compiled template markup.

## How the build works (and why edits are brittle by design)

`build.py` extracts the compiled template out of the Offline file's `__bundler/template` JSON block, then:

1. **Exact-block swap:** replaces the entire `script_2.orig.js` block with `script_2.work.js`, and `style_3.orig.css` with `style_3.work.css`. Each must match **exactly once** or the build aborts (`must_replace`). The `.orig.*` files are the baseline — leave them alone.
2. **Markup edits:** applies each entry in `markup_edits.json` as a `find`→`replace`. Each has a `count` (`-1` = replace-all, `>=1`). If the actual match count ≠ expected, **the build fails loudly.** So when you change template markup you must keep the `find` strings and their counts in sync — a whitespace drift will break the build.
3. Inlines the offline GSAP bundle (`build/gsap_bundle/_gsap_all.js`) before `</head>`.
4. Re-escapes `</` → `</` (so inner `</script>`/`</style>` can't close the outer template `<script>`) and writes the Enhanced file.

Because everything is exact-match, edits are surgical and any mismatch is a hard build error rather than silent corruption — treat a `BUILD ERROR` as "your find-string no longer matches," not a bug in the builder.

## dc-runtime architecture — the constraints that shape all logic

The template is a compiled `<x-dc>` block bound to `Component` via `renderVals()`. The full reverse-engineering brief is in [docs/research/brief_runtime-framework-mapper.md](docs/research/brief_runtime-framework-mapper.md) — read it before doing anything non-trivial. The load-bearing constraints:

- **The template expression language is tiny.** Mustaches `{{ expr }}` support only path access (`a.b.c`, `items[$index].name`), `=== !== == !=`, unary `!`, and literals. **No function calls, no arithmetic, no ternary, no `&&`/`||`, no string concat, no object literals.** Therefore **every computed value — formatted prices, filtered/sorted product lists, conditional class strings, per-item handlers — must be precomputed in `renderVals()`** and exposed as flat keys on the returned view-model. `renderVals()` (in `script_2.work.js`) is the heart of the app.
- **Event handlers take no arguments.** You cannot write `onclick="{{ add(item) }}"`. Instead `renderVals()` returns **pre-bound closures** (often per-item, e.g. `item.open`, `item.onPick`), and templates reference them as whole-value mustaches: `onclick="{{ item.open }}"`. Handlers run against the live logic instance, so they call `this.setState(...)`.
- **State is one monolithic object.** `Component.state` holds the entire app (route, cart, wishlist, addresses, auth, orders, per-form fields…). `setState(patch, cb)` merges shallowly and re-renders; it accepts a functional updater. There is no component tree of local state — it's one big reducer-like object.
- **camelCase attributes must be authored camelCase** (`viewBox`, `strokeWidth`) — the encoder round-trips them; lowercasing SVG attrs breaks rendering.
- **Errors are forgiving but silent.** A throw in `renderVals()` or a child render shows a red `.sc-logic-error` banner + placeholder and logs to console, but keeps the page alive. **Bugs can be invisible unless you watch the console** — always check it after a change.
- Reserved names to avoid colliding with: state keys `__v`/`__err`, scope key `$index`, `$`-prefixed prop keys, and the `sc-*` class/tag namespace.

## App-level patterns layered on top (all in `script_2.work.js`)

- **Persistence/hydration:** a durable *slice* of state (`DURABLE` keys) is serialized to `localStorage` under `STORE_KEY` (`emdad:v1`) via `durableSlice()`/`persist()`, restored by `hydrate()` on `componentDidMount`, versioned by `SCHEMA_V`. Only the durable slice persists — transient UI state does not.
- **Routing is real History:** navigation uses `history.pushState`/`replaceState` with `{ eoRoute, pid, overlay }` and a `popstate` handler, so the physical Back button works. `_navSource` distinguishes user-nav from pop.
- **View Transitions are the motion backbone.** Route changes, card→detail shared-element morphs, and the full-page theme circle-reveal all go through `document.startViewTransition()` helpers (`go()`, `openMorph()`, the theme-reveal), each with a `prefers-reduced-motion` fallback that just does the plain `setState`. GSAP handles drag-to-dismiss sheets, the success moment, and cart FLIP reflows.
- **Product catalog** is the `PRODUCTS` array literal at the top of the class (Persian strings, prices in Toman, `vis`/`stock` flags; `price:0` = "call for quote").

## Repo layout

- `build/` — the build system and the three editable source files above, plus `.orig.*` baselines, `template.extracted.html` (decoded template, for authoring markup edits), and `gsap_bundle/`.
- `checkpoints/` — a full snapshot of the three work files + built HTML after each development phase (`P1…P12`, `GSAP0…2`, `CART…`). History/rollback reference.
- `docs/planning/` — roadmap and per-epic masterplans (`MASTER_ROADMAP.md` is the plan of record).
- `docs/research/` — the dc-runtime, design-system, and bundler reverse-engineering briefs. `docs/reviews/` — design/UX critiques.
- `reference/` — raw decompiled/exploration artifacts from reverse-engineering the original bundle (read-only reference, not build inputs).
- `Emdad Oxygen - Enhancements.md` — human-readable changelog of everything added.
