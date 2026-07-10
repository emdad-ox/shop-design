# Home hero slideshow — design

Date: 2026-07-10 · Status: approved

## Goal
Replace the single home-page hero banner («مرکز تخصصی اکسیژن») with a **2-slide auto-playing
slideshow** in the same rounded frame:
- **Slide 0 — brand** (the current banner, unchanged): eyebrow pill, «مرکز تخصصی اکسیژن» headline,
  description, «مشاهده محصولات» CTA → products.
- **Slide 1 — image**: a full-bleed picture filling the **same 24px rounded frame**; the whole slide
  is tappable and navigates to **Services (`route:'services'`)**.

Built data-driven so more image slides can be added later by appending one array entry.

## Decisions (locked)
- **Image source:** placeholder for now (a labeled gradient graphic in-frame). Real image is a
  one-line `src="data:image/…;base64,…"` swap later. App is offline/self-contained — no remote URLs.
- **Slide 1 link:** internal, `this.go({ route: 'services' })`.
- **Behavior:** auto-advance every **5s** + swipe/drag + tappable dots.
- **Frame:** both slides share a **fixed height (~200px)**, radius 24, `overflow:hidden`, so the
  frame never jumps between the text slide and the image slide.

## Approach
Reuse the existing **detail-page hero swipe rig** (GSAP `Draggable` + snap-to-slide + dots, see
`setupHeroGallery()` in `script_2.work.js`). Add an auto-advance timer on top. Chosen over a CSS
scroll-snap carousel or a hand-rolled transform slideshow for consistency with the app's existing
swipe paradigm and zero new dependencies (GSAP is already bundled).

## Data shape
`HERO_SLIDES` computed in `renderVals()`:
- `{ type:'brand' }` → rendered by the existing banner markup.
- `{ type:'image', src:'<data-uri placeholder>', onTap: () => this.go({route:'services'}), alt }`.

Template renders the track with `<sc-for>` over the slides; the brand slide keeps its rich markup,
image slides render an `<a>`/tappable `<div>` with the image.

## Component structure
```
hero frame  (height ~200px · radius 24 · overflow:hidden · position:relative)
├─ [data-home-hero-track]   (display:flex · GSAP-draggable · each slide flex:0 0 100%)
│  ├─ slide 0: brand banner (existing content)
│  └─ slide 1: image + link (object-fit:cover · onTap → services)
└─ [data-home-hero-dots]    (row of dots · active reflects current · tap to jump)
```

## Behavior details
- **Auto-advance:** `setInterval` ~5s advances index, loops last→first. Stored on the instance so it
  can be cleared.
- **Pause/resume:** pauses on touch/drag start; resumes after release (and after dot tap, restart the
  timer so it doesn't immediately jump).
- **Reduced-motion:** if `prefers-reduced-motion`, **no auto-advance and no drag animation** — show
  slide 0, dots still tap to switch (instant).
- **Setup/teardown:** `setupHomeHero()` mirrors `setupHeroGallery()`; initialize on home render when
  `[data-home-hero-track]` exists, and **tear down** (clear interval + kill Draggable + null refs)
  when leaving home, so nothing leaks across routes.
- **Dots ↔ slide sync:** dragging snaps to nearest slide and updates the active dot; dots tap moves
  the track and resets the timer.

## Files touched (all via the build system)
- `build/script_2.work.js` — `HERO_SLIDES` data, `setupHomeHero()` (Draggable + snap + dots +
  auto-advance), teardown hook, wire into the render/route lifecycle.
- `build/markup_edits.json` — wrap the current hero banner in `[data-home-hero-track]`, add the image
  slide, add the dots row.
- `build/style_3.work.css` — hero frame / track / slide / dots styles + reduced-motion rule.

## Out of scope
- Real slide-2 artwork (placeholder now; swap the data URI later).
- More than 2 slides (structure supports it; none added now).
- Changing slide 0's content or the brand palette.

## Acceptance
- Home shows a 2-slide hero in one rounded frame; slide 0 is the current banner unchanged.
- Auto-advances every ~5s, loops; swipe/drag changes slides; dots reflect + control position.
- Slide 1 tap → Services. Auto-advance pauses on touch, off under reduced-motion.
- No timer/Draggable leak when navigating away from home. Build is green.
