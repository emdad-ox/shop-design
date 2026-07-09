# Layout, Composition & Chrome — Critique

## 1. Verdict
The app has one genuinely consistent decision — every route is a `max-width:430px` centered column — and then improvises everything above and around it. There is no app bar: **page titles render in three sizes across two different typefaces depending on route**, the back button is hand-re-declared inline in nine screens and scrolls away with the content, and the fixed-CTA pattern leaves a dead band above the nav on short screens. Fixing the chrome into a single app-bar system and giving each screen a vertical-layout archetype (instead of always top-stacking) is the highest-leverage cohesion move left in the bundle — bigger than any per-component polish.

## 2. The problems, with evidence

**A. There is no app bar — there are three, and the titles aren't even the same font.** This is the spine of the whole cohesion problem, and it's provable from the markup:
- Top-level tabs (Products L112, Cart L253, Services L359, Profile L621, Success L605) title with a real `<h1 … font-size:20px;font-weight:900>` → hits `h1,h2{font-family:'Baloo Bhaijaan 2'…}` (CSS L51) → **Baloo, 20px**.
- Drill-ins (Auth L321, Refill L394, Used L477, Checkout L551, Orders L691, Requests L723, Addresses L755, Wishlist L807) title with a `<div … font-weight:900;font-size:17px>` → no `h1` match → **Vazirmatn, 17px**.
- Detail (L173) titles with `<div … font-weight:800;font-size:15px>` → **Vazirmatn, 15px, lighter weight** — a third variant.

So a user moving Home → Products → Detail sees the page title change typeface (Baloo→Vazirmatn), size (20→15px), and weight (900→800) with no logical reason. That single fact discredits the chrome more than any color or spacing issue.

**B. The "back" affordance is nine inline copies and it's in the wrong layer.** The 40px round back button (`width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--sur)…`) is pasted verbatim into Detail L170, Auth L318, Refill L391, Used L474, Checkout L548, Orders L688, Requests L720, Addresses L752, Wishlist L804. Because it lives *inside the scrolling content column*, it scrolls off — there is no persistent way back, while the bottom nav *is* persistent. Meanwhile the four top-level tabs have neither a back button nor any chrome row, and **Home has a totally different top zone** (42px brand tile + two-line title + theme toggle, L35–51). Four incompatible top treatments for 17 screens.

**C. Header metrics drift even within a pattern.** Container `padding-top` is 20px on tabs vs 16px on drill-ins; header `margin-bottom` is 14px (Detail) / 16px (most) / 28px (Auth L317); the Detail header is the only one carrying a trailing action (wishlist heart), and it's the one that also shrank the title to 15px. Nothing lines up screen-to-screen.

**D. The fixed-CTA void.** Action screens pin the CTA at `position:fixed;bottom:80px` and pad content `…120px 16px 170px` to clear it (Detail L235, Cart L306, Refill L463, Used L518, Checkout L592). On a long form that's fine. On a **one-line cart or a short form**, the button floats in the middle of empty space with a visible gap down to the nav — the scrim you added (CSS L152) softens it but can't fill it. Separately, screens with *no* CTA — Services (L357: h1 + subtitle + 2 cards + hotline ≈ 380px of content in an ~780px column), and both Success screens (L527/L601: `padding-top:64px` then a centered block) — top-align their content and leave a large dead band below. These are two different bugs: a *floating-CTA gap* and *dead top-aligned space*.

**E. Weak visual ranking / ad-hoc geometry (composition).** Radii in use: 12/14/16/18/20/24/999 — seven values, no scale, so a hero (24, L53), a services button (20, L361), a product card (16, L89), and a related row (14, L225) all read as "rounded-ish" with no hierarchy. Product thumbnails come in four sizes — 48 (related L226), 56 (cart L268 / wishlist L819), 64 (featured L90), 72 (products L133) — for what is the same object. Most damningly for a commerce app: **the Home "featured" cards (L89) are the exact same flex-row as the ordinary Products list rows (L132)** — identical padding, radius, thumbnail treatment — so "featured" has zero visual promotion. Every screen below the header is a single vertical stack; nothing is *composed*, it's *piled*.

## 3. Recommendations — three systems

### System 1 — One App Bar (baseline + premium tier)
Replace all three header patterns with a single header block on every route. Slot it into the existing architecture so it costs almost nothing:

- **Structure:** `display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:8px;height:56px`. In RTL the leading (right) column is column 1.
- **Frost for free:** give it `background:var(--sur)` so it inherits the existing glass hook (CSS L46) automatically — no new CSS needed to make it feel part of the system.
- **One title spec, everywhere:** a real `<h1 style="font-size:17px;font-weight:800;letter-spacing:-.3px;…">` with single-line truncation (`overflow:hidden;text-overflow:ellipsis;white-space:nowrap`). Using `<h1>` means every page title finally renders in **Baloo**, at one size — this alone erases problem A.
- **Map the three patterns onto the three slots:**
  - Top-level tab → `[brand mark | title | theme-toggle]` (or empty 40px trailing spacer). Keep the 40px spacer even when empty so the title stays optically centered.
  - Drill-in → `[back | title | contextual action or 40px spacer]`. One back button definition, deleted from 9 places.
  - Detail → same drill-in bar, wishlist heart in the trailing slot (it already wants to be there).
- **Baseline tier (do first, zero risk):** keep it **in-flow** at the top of the column. Immediate cohesion; it travels with the page during your existing cover-slide transition, which is exactly the iOS push metaphor the motion layer already implements. Do **not** give it a `view-transition-name` — that would fight the opaque cover-slide (the incoming page is supposed to slide in *with* its bar). Only the bottom nav stays named/persistent.
- **Premium tier (optional):** make it `position:sticky;top:0;z-index:35` and scroll-condense — transparent/no-border at scrollTop 0, then toggle to `background:var(--sur)` + `backdrop-filter` + `border-bottom:1px solid var(--line)` once scrolled a few px (Arc/Apple large-title collapse). Still transition-safe because it stays unnamed and part of each route.

### System 2 — Vertical layout archetypes (kills the void)
Make the column a flex context and pick a strategy per screen type instead of always top-stacking. Wrapper becomes `min-height:100dvh;display:flex;flex-direction:column`.

- **Scroll/list screens** (Products, Cart-full, Orders, Requests, Addresses, Wishlist, Detail): unchanged — top-aligned, content-driven.
- **Confirmation screens** (Success L601, FormSuccess L527): `justify-content:center` and drop the `padding-top:64px` — the block sits in the optical center of the free space instead of near the top with a void beneath.
- **Empty states** (cart/orders/wishlist/requests empty): same — center the icon+copy+CTA block vertically rather than `padding:48px 20px` from the top.
- **Short landing screens** (Services): after the two service cards, promote the hotline card into an anchored bottom module (`margin-top:auto`) so it docks near the nav and the two cards breathe at the top — the empty space becomes intentional composition, not a gap.
- **Floating-CTA fix (separate from the above):** change the pinned CTA from `position:fixed;bottom:80px` to a **sticky footer inside the column** — a full-width action dock (`position:sticky;bottom:0`, its scrim, sitting directly above the nav). On a 1-item cart it sits right after the content (no floating gap); on a long form it sticks. This also lets you drop the magic `bottom:80px` + `padding-bottom:170px` bookkeeping and the CTA-overlaps-content problem the scrim was patching.

### System 3 — Composition primitives (geometry that ranks)
Small, systematic, high cohesion-per-edit:
- **Collapse radii to four:** `--r-sm:12` (chips, thumbnails, inputs), `--r-md:16` (all cards/rows/summary), `--r-lg:20` (sheets, hero inner, big service buttons), `--r-pill:999`. Hero 24→20, related rows 14→16, quick tiles 18→16. Serves composition by making elevation legible, not by rebuilding tokens.
- **Two thumbnail sizes only:** `72px` for primary/product-list, `56px` for secondary rows (cart, wishlist, related). Retire 48 and 64.
- **Actually rank "featured":** make Home's featured strip a horizontal snap carousel of larger image-forward cards (`display:flex;overflow-x:auto;scroll-snap-type:x mandatory`, ~150px tiles) instead of reusing the Products list-row. This creates the hierarchy the word "ویژه/featured" promises and uses the horizontal axis the app currently never touches — composition, not just decoration. (Keep the Products screen as vertical list rows; a 2-col grid isn't worth it until real imagery exists — that's a different lens.)
- **Reuse the section-header row** (Home's `[h2 | مشاهده همه]`, L83) as a named pattern and apply it to grouped areas (Profile menu groups, Orders) so section chrome is consistent too.

## 4. The single highest-leverage change
**Build System 1 — the one App Bar — first.** It directly resolves the most visible and most provable defect (three title sizes in two fonts, plus a nine-times-duplicated back button that scrolls away), unifies the top edge of all 17 routes, and — because it just uses `background:var(--sur)` and a real `<h1>` — snaps into the existing glass and typography systems with almost no new CSS and zero conflict with the shipped motion layer. Everything else (voids, radii, ranking) is refinement on top of a screen that now, finally, looks like the same app on every route.

---
Source files reviewed: `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/markup_current.html`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/style_3.work.css`, `/private/tmp/claude-501/-Users-macbook-Desktop/7dff2082-9727-40a3-a53d-1f3d4bf89324/scratchpad/brief_design-system-mapper.md`.