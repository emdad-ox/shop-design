# Splash screen — design

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation

## Problem

The app has no launch/splash screen — on open it renders straight into the `home`
route ([script_2.work.js:84](../../../build/script_2.work.js#L84)). A brand splash mark was
planned but never built ([critique_imagery-icon-identity.md:23](../../reviews/critique_imagery-icon-identity.md#L23)).
Goal: show a short, branded splash on launch.

## Behaviour

- **A full-screen launch overlay** on the `--grad-brand` gradient (purple→cyan), with a
  centered white **O₂** logo tile, the **امداد اکسیژن** wordmark beneath it, and a slim
  indeterminate progress bar as a "booting" hint.
- **Motion:** logo/wordmark scale + fade in, progress bar sweeps, overlay holds ~1200ms,
  then fades out (~300ms) and is removed from the DOM.
- **Frequency — once per session:** gated by a `sessionStorage` flag (`emdad:splash`).
  - First open of a tab → show, then set the flag.
  - In-app reload within the same tab session → skipped (flag survives reload).
  - New tab / new session → shows again.
  - Nothing written to durable `localStorage`; persisted app state untouched.
- **Background is brand-colored, identical in light and dark** (intentional — it is the
  brand gradient, not a theme surface).
- **Dismissal:** auto after the timer; also removed on first tap so it never blocks the app.

## Implementation (within the 3 build inputs; no `.orig` / HTML hand-edits)

### `build/script_2.work.js`
- Add a `showSplash()` method.
  - Guard: `if (sessionStorage.getItem('emdad:splash')) return;` (wrapped in try/catch —
    `sessionStorage` can throw under `file://`/private mode; on throw, skip silently).
  - Set the flag immediately: `sessionStorage.setItem('emdad:splash', '1')`.
  - Build a plain DOM node (`document.createElement('div')`, `id="eo-splash"`) with the
    logo tile + wordmark + progress-bar markup, and `document.body.appendChild(...)`.
  - Schedule fade-out: `this._splashT = setTimeout(...)` (~1200ms) → add class
    `eo-splash-out`, then a second timeout (~320ms, matches CSS fade) removes the node.
  - Add a one-shot `pointerdown`/`click` handler on the overlay that runs the same
    dismiss path early (and clears `this._splashT`).
- Call `this.showSplash()` as the **first statement** of `componentDidMount`, so it is
  injected before the browser paints the app (no app flash behind it).
- Teardown: if the app has a `componentWillUnmount` (or equivalent), clear `this._splashT`
  and remove `#eo-splash`. (Not strictly required for a single-mount SPA, but tidy.)
- No dependency on GSAP — it is not registered at boot; animation is pure CSS.

### `build/style_3.work.css`
- `#eo-splash`: `position:fixed; inset:0; z-index:<above app, below nothing needed>;`
  `background: var(--grad-brand); display:grid; place-items:center;` white text.
- Centered stack: logo tile (rounded square, ~72px, white bg, `--p` colored "O₂" OR white
  tile per final visual — see note), wordmark, slim progress track (~120px × 4px) with an
  indeterminate sweeping fill.
- Keyframes: `eo-splash-pop` (logo scale/fade in), `eo-splash-bar` (indeterminate sweep).
- `.eo-splash-out { opacity:0; transition: opacity .3s; }`.
- `@media (prefers-reduced-motion: reduce)`: no pop/sweep; static hold then plain fade;
  shorten the visible hold.

### `build/markup_edits.json`
- **No change.** Overlay is injected at runtime, keeping the fragile find/replace counts
  untouched.

## Verification (manual — no test runner)
1. `python3 build/build.py` → BUILD OK.
2. Serve via `python3 -m http.server`, open in browser: splash appears on first load,
   animates, auto-dismisses into the home route. Console clean.
3. Reload the tab → no splash (session flag). Open a new tab → splash again.
4. Tap during splash → dismisses immediately.
5. Toggle OS reduced-motion → splash shows without motion, still auto-dismisses.
6. Toggle light/dark theme, reload new tab → splash gradient identical (brand-colored).

## Non-goals
- PWA/OS-level maskable splash icon (manifest) — separate from this in-app overlay.
- Any real loading/progress semantics — the bar is decorative (there is nothing async to
  wait on; assets are inlined).
