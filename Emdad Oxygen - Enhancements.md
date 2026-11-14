# Emdad Oxygen — Motion & Polish pass

**File:** `Emdad Oxygen Shop - Enhanced.html` (your original `Emdad Oxygen Shop - Offline.html` is untouched)

## What changed
**Page transitions (View Transitions API)** — every screen change animates as a mature **opaque cover-slide** (iOS/Android push-pop): the incoming page slides in fully opaque and *covers* the outgoing one, which parallaxes slightly for depth. No opacity crossfade, so **no blink/flash**. Direction is smart: drill-in slides forward, Back slides the other way, and tab-switches slide left/right by tab order — all RTL-aware. The bottom nav stays pinned throughout. (Note: the `@view-transition` CSS at-rule is multi-page-only; this SPA uses the JS `document.startViewTransition()` API — same feature.)

**Smart state transitions** — changing the product **filter / sort / in-stock** doesn't snap: the list does a **FLIP** — items that remain glide to their new positions while filtered-out ones fade out and new ones fade in (each card gets a temporary `view-transition-name` during the change; the page itself stays frozen so only the cards move).

**Micro-interactions & premium feel** — tokenized motion (easing/durations), refined button press (scale), premium focus rings, primary CTAs got a subtle depth gradient, product image placeholders upgraded from crosshatch to soft branded gradient panels, the **cart badge pops when you add to cart**, and the **wishlist heart pops when you favorite** a product.

**Accessibility (high-impact)** — product cards, chips, radios and menu rows are now keyboard-focusable and activate with Enter/Space; bottom sheets are proper `role="dialog"` and close on Escape; focus moves to the new screen on navigation; visible focus rings throughout.

**Fixes** — the refill form's floating button no longer visually overlaps content (added a graceful scrim under all floating CTAs); the bottom-tab highlight is correct during the login/checkout flow; primary CTA contrast improved; accidental pull-to-refresh no longer risks wiping state; the 24/7 hotline is now a tappable `tel:` link with its own number; double-tap can't place a duplicate order; leftover English placeholder text localized.

**Motion accessibility** — everything respects `prefers-reduced-motion` (transitions and animations disable), not just the background aurora.

## Deliberately NOT changed (next steps)
Persistence/hydration, real URL routing + History/back, order/request lifecycle & loading states, trust/certification content, real photo upload, delivery scheduling. These are larger, architectural, and were kept out of this motion/polish pass.

## Rebuilding
Edit `scratchpad/style_3.work.css`, `script_2.work.js`, or `markup_edits.json`, then run `python3 scratchpad/build.py`.

## Update — clinical de-tint + circular theme toggle
- **Clinical-calm redesign (Build A):** de-tinted the ground to a cool near-neutral (teal now a deliberate accent), added an elevation ramp (cards rank above the ground), ink hairline borders, contrast-safe primary teal, calmer aurora, killed Baloo → Vazirmatn, plus spacing/radius/type/height token scales. Softer outlined chips.
- **Full-page theme toggle (View Transitions):** tapping the sun/moon (or the profile switch) now plays an expanding **clip-path circle** that reveals the new theme from the exact tap point (Akash Hamirwasia technique), driven by a CSS keyframe on `::view-transition-new(root)` with the tap origin passed via `--cx/--cy`. The nav folds into the reveal so the whole page wipes as one circle. Honors reduced-motion.

## Update — shared-element card → detail EXPAND
Tapping a product card now **morphs its thumbnail into the detail hero** (View Transitions shared-element) instead of sliding pages: the tapped card's gradient thumbnail is temporarily named `hero-img`, matched to the detail hero stage (`data-hero-img`), and grows/moves into place while the detail body pops in behind (root frozen, `data-vt="hero"`). Works from every product entry point (home featured, products list, wishlist, related) via the one `vm.open` closure → `openMorph()`. Forward-only (back keeps the cover-slide); double-tap guarded; reduced-motion falls back to the plain route change.

## Update — add-to-cart fly + FLIPs + nav pill
- **Creative add-to-cart:** tapping "+" launches a teal "+" token that arcs up and into the cart tab (WAAPI flying clone — deliberately NOT a View Transition, since a VT would skip on rapid taps and can't leave the item in the list while a copy flies), then the cart badge pops. Self-cleans (with a fallback) so nothing leaks on rapid taps.
- **Cart-remove & wishlist-remove FLIP:** removing a cart row or un-favoriting now reflows via the generalized `vtFlip` helper (removed row fades, survivors glide up), reusing the shipped list-FLIP mode — zero new CSS.
- **Nav active-tab pill:** a soft-teal pill sits behind the active bottom-tab and glides between tabs on navigation (plain CSS `inset-inline-start` transition, RTL-aware — not a VT, per the guardrail against a static name fighting the route slides).

## Update — functional epics: trust/safety, order lifecycle, delivery scheduling
- **Trust & safety (P8):** Home now has a *«چرا امداد اکسیژن؟»* trust grid (official license, authenticity/standard, safe delivery, 24/7 support). Every product detail carries an **oxygen-safety callout** (oxidizer — keep away from flame/oil, store upright & secured, use per prescription) plus an authenticity-guarantee line — the duty-of-care content a regulated medical-oxygen shop needs.
- **Order & request lifecycle (P6):** Orders and service requests now carry a **4-stage pipeline** (order: ثبت→آماده‌سازی→ارسال→تحویل; refill: ثبت→جمع‌آوری→شارژ→تحویل; used: ثبت→بررسی→قیمت‌گذاری→تکمیل) rendered as a **connected stepper** with the current stage highlighted and a *«مرحله N از ۴»* label. Stages **advance over real elapsed time** (a placed order visibly progresses across the session/reloads). Placing an order or submitting a request shows a **loading state** — spinner + disabled CTA — during a simulated server round-trip, with a double-submit guard and a cancel-on-navigation safety.
- **Delivery scheduling (P7):** Checkout and the refill service now have a **day + time-slot picker** (today/tomorrow/+2/+3 × four 3-hour windows). A slot is required before submitting; the chosen window is stored on the record and shown on the success screen and in order/request history (refill only). Legacy orders fall back to «هماهنگی تلفنی».
- Persistence schema bumped to v2 (records now carry timestamps/stages); stale records from older versions are dropped gracefully on load.

## Update — architecture, motion engine & accessibility (final phase pass)
- **History routing + hardware Back (P3):** the app now integrates with the browser history stack. Every route change (including the shared-element morphs that bypass the normal navigator) pushes a **state-only** history entry (no URL — a URL-bearing `pushState` throws under `file://`, which is how the offline file opens), so the **hardware/browser Back button walks back through the app** instead of exiting it, with the correct back-direction transition. Back also restores the exact product on a detail page, and **Back closes an open bottom-sheet** instead of leaving the screen. *(Verified via `history.back()` — a faithful `popstate` proxy — not against a physical device button.)* Fixing this also surfaced that the framework wasn't delivering a reliable `prevState`, so route-change side-effects (scroll-to-top, focus move) are now driven by our own tracking and **actually fire** for the first time.
- **Unified app-bar (P4):** every screen's header is now one consistent **sticky, glass, full-bleed app-bar** that gains a hairline as content scrolls under it — replacing the grab-bag of per-screen header spacings.
- **Product illustrations (P5):** duotone SVG artwork (cylinder / regulator / mask / concentrator) fills product thumbnails and detail heroes in place of the old placeholder panels.
- **GSAP drag + motion (GSAP-1/2):** bottom-sheets are **drag-to-dismiss** with momentum (GSAP Draggable + Inertia); the order/request **success moment** now plays a spring check-pop (CustomBounce), a drawn checkmark stroke (DrawSVG) and a per-word title reveal (SplitText — split by *words*, never characters, because Persian is a joined script).
- **Container-expand transitions (P9):** tapping a service card now **expands it into the request form** (shared-element container transform), reusing the same verified engine as the product card→detail morph.
- **Micro-polish (P12):** trust cards, service cards and the related-products rail **rise in with a stagger** as each mounts.
- **Deeper accessibility (P10):** active bottom-tab marked `aria-current="page"`; focus moves to the new screen's heading on navigation; open sheets **trap Tab focus** and **return focus to the control that opened them** on close; submit buttons expose `aria-busy` during the loading state; the toast is an `aria-live` status region; real photo-upload controls have labels. *(Verified via attribute + `document.activeElement` checks — not against a live screen reader.)*

## Update — offline integrity (GSAP bundled)
- **GSAP is now bundled into the file, not loaded from a CDN.** The used GSAP plugins (core + Draggable + Inertia + SplitText + DrawSVG + CustomEase + CustomBounce, GSAP 3.13.0, ~136 KB) are inlined ahead of the app so `window.gsap` exists before boot — exactly how React/Babel are already bundled. Result: **drag-to-dismiss sheets and the success flourish work fully offline** (verified: the app registers GSAP with **zero** network/CDN script requests). A same-version CDN fetch remains only as a defensive fallback. The build inlines from `scratchpad/gsap_bundle/`.
- If GSAP is ever absent, all GSAP-gated motion degrades gracefully — sheets still open and close by tap/Escape, the success screen still renders — with no errors (verified by exercising the GSAP-absent path).
- **Note on `file://`:** the app is verified against a local dev server. Persistence uses `localStorage`, whose availability under the `file://` (opaque) origin varies by browser; if a browser restricts storage for local files, cart/auth/orders simply won't persist across reloads — the app still runs. Everything else (routing/Back, View-Transition morphs, bundled GSAP, a11y) is self-contained and origin-independent.

## Update — GSAP on the cart (basket): add-more / remove-a-product
Designed via a 4-direction motion panel (tactile / data-elegant / playful-commerce / flip-first) → synthesized winner ("choreographed cart"), then hardened by an adversarial code review that caught and fixed 3 real bugs before shipping.
- **Add more (+):** the quantity digit stamps in (spring `back.out`), the row gives a brief teal "breathe", and the **line price and cart total count/roll** up to their new figures (Farsi digits every frame), while the nav cart-badge pops. Tapping + at max stock **denies** with a pill shake + red flash and a toast (no phantom increment).
- **Remove one (−) / delete (trash):** the row leaves via a **GSAP Flip** — surviving rows and the summary footer **glide up to close the gap** (a plain height-collapse can't close a flex gap; Flip measures real geometry), while the removed row shrinks and drifts out (RTL-aware). The total rolls **down** in sync. Removing the last item reveals the empty state with a soft rise.
- **GSAP Flip is bundled** into the offline file (added to the pre-boot inline bundle; verified it registers with **zero** network requests). Everything **degrades**: without Flip/GSAP or under reduced-motion, removal falls back to the View-Transition list-flip and numbers snap to the correct value — no errors.
- **Accessibility & correctness (from the review):** removing a line now **moves focus to a surviving remove button — or the empty-cart CTA** — on *every* path (Flip, VT-fallback, reduced-motion), not just the animated one (WCAG 2.4.3). A rapid **+ then −** reversal can no longer strand a running count-up on the wrong monetary figure (in-flight rolls are cancelled before any early return). The total is `aria-hidden` only during the roll so a screen reader announces the settled figure once. Quantity math reads live cart state, so fast taps can't drop an increment.

## Fix — `[bundle] error` overlay on load (P11 regression)
The app has a built-in red error overlay (bottom of screen) that catches **any** `error` event on `window` — including **failed resource loads**, not just JS exceptions. Two `[bundle] error` lines were showing on every page.
- **Cause:** the P11 photo-upload change rendered the tile preview as `<img src="{{ tl.url }}">`. The runtime's list skeleton pass renders that row before the (empty) photo list resolves, leaving the binding literal, so the browser fetched `…/{{ tl.url }}` → 404 → error. Two upload forms (refill + used) = two errors. (Missed earlier because a 404 is not a `console.error`, and I hadn't inspected that overlay.)
- **Fix:** the tile now carries the image in a **`data-photo` attribute** (never fetched by the browser, even when the binding is literal); a small `managePhotoTiles()` pass promotes real `data:` URLs to the `<img src>` after each render (same pattern as the product-illustration injector). Verified: the overlay is now clean at boot, after an upload, and on the product detail page, and uploaded photos still preview correctly.
- **Note (pre-existing, not this change):** the address/checkout **map** loads tiles from the internet (CartoDB). Fully offline, those tiles won't render and could surface similar overlay lines on those two pages only — the rest of the app (including all fonts) is fully self-contained.

## Update — deferred motion polish (partial)
- **Auth step slide (M1):** the login flow now slides between the phone-number step and the code step directionally (forward on "get code", reverse on "edit number") — reduced-motion-safe, pure JS.
- **Wishlist heart bloom (M2):** favoriting a product now blooms a fuller filled heart in over the outline (a two-path cross-fade + spring), and un-favoriting shrinks it back; persisted favorites show filled on load.
  - *Note:* this was scoped as a GSAP **MorphSVG** path-morph, but I verified the publicly-available MorphSVG build is **non-functional** (it registers the `morphSVG` property but never mutates the path `d` — confirmed even loading a fresh copy straight from the CDN). A genuine path-morph needs a licensed Club build, so I delivered the same visual intent (a real shape change) with a two-path cross-fade using core GSAP, which works.

## Update — deferred motion polish (complete)
- **Product hero gallery (M4):** the detail hero is now a **swipeable 3-slide gallery** — the product illustration, a "key specs" slide, and an authenticity/standard slide — driven by GSAP Draggable + Inertia, with the dot indicators synced (drag to swipe, or tap a dot to jump). (There are no real product photos, so the slides are illustration + info rather than a photo carousel.)
- **Reverse card-morph on Back (M3):** pressing Back from a product now **morphs the hero back down into the exact card it came from** (the reverse of the tap-to-open expand), instead of the plain slide. Off the detail screen it gracefully falls back to the back-slide.
- All four verified end-to-end (structure, wiring, interpolation, snap logic). Note: gsap tweens auto-play in a normal foreground browser — in the backgrounded test harness the browser pauses requestAnimationFrame, so those were verified by seeking/interpolation + end-state rather than watching them play.

## Update — UX review pass (8 epics, all verified end-to-end)
A round of functional/UX fixes from a product review. Each was driven headlessly (Chrome, View-Transitions neutralized to test the reduced-motion path) through the real user flow.

- **Price-inquiry flow reworked (no more instant submit):** inquiry-only products (اکسیژن‌ساز, CO₂) no longer fire a "sent" toast on tap. The card now opens the **product detail**, and the detail's «استعلام قیمت» opens a **confirm sheet** ("برای این محصول استعلام قیمت ثبت شود؟"); confirming records the request and shows the shared success screen. Reuses the existing sheet machinery (drag-to-dismiss, focus-trap, Escape, hardware-Back).
- **Price-inquiry list:** inquiries are now a persisted record type with their own **«استعلام‌های قیمت»** screen + a profile menu row (previously there was no list for them).
- **Referrer-aware Back:** opening a service form (شارژ کپسول / فروش دست دوم) from **Home** now returns to Home on Back — the back arrow was hardcoded to Services. Origin is tracked so the arrow mirrors the hardware-Back target.
- **Digit-only phone inputs:** all four phone fields (checkout, login, refill, used-sale) now sanitize to digits live (Persian→Latin, non-digits stripped) — previously only the price field did.
- **Discount moved cart → checkout:** the code input is gone from the cart; it now lives in the **checkout step (after login)**, where the cart flow requires login before checkout. Discount is cleared whenever you land on the cart.
- **Itemized order detail / invoice:** orders now snapshot their **line items, amounts, discount, address and delivery**. After checkout you land on a clear **itemized order-detail page** (not the orders list); it doubles as the success moment. Orders-list rows are tappable to reopen that invoice later.
- **Per-request detail:** requests-list rows are tappable and open a **جزئیات درخواست** page (gas / price / delivery / notes); refill & used records were enriched to carry those fields.
- **Empty-cart guidance:** clearer copy + two weighted CTAs (مشاهده محصولات primary, خدمات ما secondary).
- **Global support FAB:** a persistent floating call button (شبانه‌روزی `tel:`) on every screen — high-value for medical-oxygen users.

Build stays green (all exact-match markup edits resolve `x1`, except the two service-form back buttons which intentionally match `x2`).

### HoPD polish pass (follow-up review)
- **Services page now focuses on services:** the global "emergency order" hotline banner was removed from the services screen (the support number lives in the FAB now) and replaced with a services-focused guidance strip; the primary service card (شارژ کپسول) is emphasized with an accent border.
- **Invoice framing:** the order-detail page now clearly states it is a **پیش‌فاکتور** (no online payment happened; amount & delivery finalized by phone), addressing "روی اون صفحه بیشتر باید کار بشه".
- **Support FAB fixes:** unified to the real support number (`0919 100 2030`) and repositioned to **lift above the full-width bottom CTAs** (detail/cart/checkout/forms) so it never overlaps them; rests just above the nav elsewhere.

### Bottom-sheet "disappears after open" fix
Every bottom sheet (filter/sort, address picker, price-inquiry confirm) would slide up and then vanish a moment later. Cause: `manageSheetDrag` did `gsap.set(panel, { y: 0, clearProps: 'transform' })` before creating the drag handler — clearing the transform made `Draggable.create()` snapshot the `sheetIn` entrance animation's **start** value (translateY 100%) and pin the panel there via inline `translate3d(0, <panelHeight>, 0)`; once the CSS animation finished the panel reverted to that off-screen offset. Fixed by keeping the inline `y:0` (removed `clearProps`), so Draggable reads 0 and the sheet rests correctly. Verified: the panel's resting inline transform is now `translate3d(0px, 0px, 0px)` instead of `translate3d(0px, 395px, 0px)`.
- Also (same review): sort/in-stock picks **inside** the open filter sheet now use a plain `setState` instead of a View-Transitions list-flip (the flip painted the product cards over the open sheet); page chips keep their animation. The filter button also got an `aria-label`.

## Update — prototype UI/UX pass (Nov 2026, branch `prototype`)
A Head-of-Design review with three associate designers (visual system / flows / accessibility+RTL). Full write-up: `docs/reviews/2026-11_prototype-design-review.md`.
- **Truly offline now:** React 18.3.1 is inlined by `build.py`. Before this, the app fetched React from unpkg.com and stayed blank without a network.
- **Design-refactor CSS layer actually applies:** its hooks never matched React's `prop: value` inline styles. The 12px floor, weight ramp and entrance stagger now take effect.
- **AA contrast in both themes:** deeper dark CTA and hero gradients, AA light status tokens, new `--p-ink` and `--focus` tokens.
- **Flows:**
  - No empty or 0-toman orders, and Back no longer reopens an empty checkout.
  - The toast never covers a CTA, and the support pill no longer aborts view transitions.
  - Past delivery slots are disabled, and checkout preselects the first open slot.
  - OTP submits automatically, a guest price inquiry asks for a verified phone, and out-of-stock shows "notify me".
- **a11y:**
  - The theme switches have names and states, inputs have labels and autocomplete, and toasts use a persistent live region.
  - Carousel dots work from the keyboard, and the carousel can be paused.
  - Focus never hides under sticky chrome.

## Update — Apple system design + glassmorphism (branch `prototype`)
The UI now follows the iOS Human Interface Guidelines, with Liquid-Glass-style materials:
- **Colors.** iOS system neutrals: `systemGroupedBackground`, `label`, `secondaryLabel` and `separator`, plus Apple's accessible green, red and orange. The Emdad purple remains the app **tint** and teal-cyan remains the accent.
- **Glass materials.** New `--glass-thin / --glass / --glass-thick / --glass-chrome` tokens. Each is a translucent fill with backdrop blur and saturation, a 0.5px light edge and a specular top highlight. Cards, product cards, sheets, toasts and bars all use them.
- **Navigation bar.** A glass bar with a **large title** (28pt) on tab screens. On scroll it collapses to a centered 17pt inline title without shifting the layout. Bar buttons are small glass circles in the tint color.
- **Tab bar.** A **floating glass capsule** (iOS 26 style). The selected tab sits under a glass lens that moves between tabs with a spring.
- **Controls.**
  - Buttons: filled capsule buttons with a light top edge; buttons dim when pressed.
  - Fields: text and search fields use the iOS gray fill.
  - Switch: the iOS switch (51×31, green when on).
  - Sheets: a glass sheet with a grabber.
  - Toast: a glass capsule.
  - Lists: grouped lists with inset separators.
  - Floating action buttons: placed in a 12px gap above the tab bar.
- **Appearance.** The theme follows the system light/dark setting live until the user chooses one, as Apple apps do.
- **Accessibility.** With Reduce Transparency on, or in browsers without `backdrop-filter`, the glass materials become solid surfaces.
- **Persian note.** Apple's negative tracking on titles is deliberately not applied, because letter-spacing breaks the joined letters of Arabic script. Vazirmatn stays the bundled font so the file still works offline.

## Update — review notes of 13 Nov (branch `prototype`)
Changes from the handwritten review notes ("10.13 Nov milad-amin"):
1. **Apple system design:** already in place from the earlier glass pass.
2. **Wording:** "second-hand" (دست دوم) becomes "equipment" (تجهیزات) everywhere: «فروش تجهیزات».
3. **Home:** the shop (featured products) moves to the end of the page, after «چرا امداد اکسیژن؟».
4. **Category:** «کپسول گاز» is renamed «کپسول طبی».
5. **Theme:** light is the fixed default; dark appears only when the user switches to it.
6. **Refill form:** the gas-type field is removed.
7. **Photos:** optional on the refill and equipment-sale forms.
8. **Refill delivery time:** chosen in a pop-up from an optional "Delivery time" row; the row shows the chosen time.
9. **Contact pop-up:** the support button opens a pop-up instead of dialing directly.
10. **Pop-up content:** a directions button, the address between, then a call button, with the number shown underneath. The contact details are in the `CONTACT` constant in `script_2.work.js`. **The street address is a placeholder** until the official address from the Emdad Oxygen website is supplied.
11. **Delivery time optional:** in checkout and in refill. With no time chosen, the record says «هماهنگی تلفنی»; tapping the chosen slot again clears it.
12. **Phone fields:** removed from refill, equipment sale and checkout. Submitting requires login, and the verified login number is used.
13. **Login:** also asks for first and last name; both are required and saved as the profile name.

## Update — Vazir typeface (branch `prototype`)
- The app font is now **Vazir** v30.1.0, by Saber Rastikerdar, under the SIL Open Font License; see `build/font_bundle/OFL.txt`.
- **Bundled offline.** `build/build.py` builds the `@font-face` rules from `build/font_bundle/*.woff2` (Regular 400, Medium 500, Bold 700; about 130 KB) and adds them in front of the app CSS at build time. No network access is needed.
- Weight 600 renders with the Bold file.
- Vazirmatn stays only as the fallback in the font stacks.

## Update — JSON database (branch `prototype`)
- **`db.json`** (project root) is the app's database. **`server.js`** (`npm start`, no dependencies) serves the app and a REST API that writes to it.
- **App sync layer** (`dbInit` / `dbSync` / `dbAuth` in `script_2.work.js`). After every change, the app compares the state with its previous snapshot and writes what changed:
  - **Auth:** signup, login and logout records, and the user with first and last name.
  - **Shopping:** carts, wishlists and address books, for the guest and then the logged-in user.
  - **Submissions:** orders, service requests and price inquiries.
  - **Profile and catalog:** profile renames, theme changes, catalog searches and filters.
  - **Activity:** an event log of all of the above.
- **Same data in the browser.** Every write is also saved in the browser (`emdad:db`), so the app behaves the same without a server. On GitHub Pages it doesn't look for the server at all.

## Update — price inquiries removed, payment after checkout (branch `prototype`)
- **Price inquiries removed, together with everything connected to them:**
  - the «استعلام قیمت» pills, buttons and confirmation pop-up
  - the «استعلام‌های قیمت» Profile menu row and page
  - the inquiry success screen
  - the inquiry state, flow and login hand-off
  - the `priceInquiries` collection in `db.json`
- **Every product is priced and can be bought.** The concentrator and the CO₂ cylinder had no price, so they now have **demo prices** (32,500,000 and 1,850,000 Toman), marked `TODO(content)` in `PRODUCTS`.
- **Out of stock:** the button opens the contact pop-up. The earlier version of this button couldn't be tapped because its floating bar blocked clicks; that's fixed.
- **Payment.** Checkout's button reads «ادامه و پرداخت» and opens a **payment page**:
  - the amount, card number, CVV2, expiry and a one-time code (shown in a message in this demo)
  - it's a **test gateway**: no money moves, and test card `6037 9975 9999 9993` is shown on the page
  - the order is created **only after a successful payment**; cancelling returns to checkout with no order
  - the order page shows "online payment successful · tracking code", and the invoice banner switches to «فاکتور پرداخت‌شده»
- **Card data:** only the **masked** card number (`6037 99** **** 9993`) and the tracking code are saved, in the order and in `db.json` → `payments`. The full number, CVV2 and one-time code are never stored and are wiped after paying or cancelling.
- **Activity log:** new event types `payment.start`, `payment.error`, `payment.cancel` and `payment.success`.
