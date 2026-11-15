# Prototype UI/UX review — November 2026

Branch: `prototype`. Reviewed by the Head of Design with three associate designers, each with
their own lens. The associates did the measurements (Playwright, axe-core, sampled contrast).
The Head of Design triaged their findings and implemented them in the three build inputs.

| Reviewer | Lens |
|---|---|
| Head of Design | Triage, cross-lens conflicts, infrastructure, final verification |
| Associate #1 | Visual system: color, theme, type, elevation, imagery |
| Associate #2 | Interaction and flows: commerce, services, auth, floating layers |
| Associate #3 | Accessibility (WCAG 2.2 AA) and Persian/RTL |

## Headline findings

1. **The "offline" file was not offline.** The dc-runtime loaded React from unpkg.com at boot, so
   with no network the page was blank. React 18.3.1 is now inlined by `build.py`
   (`build/react_bundle/`). Map tiles are still remote (cartocdn), so maps show the pin only when offline.
2. **The whole normalization layer was inert.** React serializes inline styles as `prop: value`
   (with a space), and every `[style*="prop:value"]` hook matched zero elements. That disabled the
   12px Persian readability floor, the weight ramp, chip heights and the page-entrance stagger.
   Associates #1 and #3 found this independently.
3. **The support pill broke every view transition on Home, Products and Profile.** It shared
   `z-index:40` with the nav, and that value is the nav's `view-transition-name` hook. The duplicate
   name aborted the transition.
4. **An empty cart could be ordered.** Back after placing an order reopened checkout, and it could
   submit a 0-item, 0-toman order.
5. **Dark-theme contrast failed on every primary button.** White on `--p` measured 3.45:1. The hero
   headline measured 2.7:1.

## What changed (all shipped)

### Visual system
- Normalization hooks now match both spaced and unspaced forms.
- The 700→500 weight notch was dropped because it flattened card titles into the meta line.
- Dark `--grad-cta` and `--grad-brand` are deeper: white on CTA went from 3.45 to 5.6, the hero from 2.7 to 7.4.
- Light status and ink tokens pass AA:

  | Token | New value | Contrast before → after |
  |---|---|---|
  | `--ok` | #147a43 | 2.98 → 4.65 |
  | `--warn` | #8a5a00 | 3.03 → 5.2 |
  | `--err` | #bf1534 | 4.40 → 5.1 |
  | `--acc-ink`, `--warm-ink` | 58% mix | ≈ 5.2 |

- New `--p-ink` token for primary-colored text on `--p-soft` (dark 3.84 → 6.0).
- New `--focus` ring token (light 2.5 → 5.7).
- Category chips scroll in one row and no longer wrap. Product art is larger. Quick-action tiles are top-aligned.
- Shadows use the `--tx` hue instead of the old teal ink. `body` sets the font, so the splash no longer renders in serif.
- User-visible placeholder copy was removed from home slide 2.

### Accessibility and RTL
- The theme toggle has a name and a pressed state. The profile dark-mode control is a real `role="switch"` button.
- Every input has a label. Phone fields have `autocomplete="tel-national"` and Persian-digit placeholders. The search field uses `type="search"`.
- Toasts are announced through one persistent live region. The old one was mounted together with its text, which many screen readers skip.
- Carousel dots are focusable buttons that work with Enter and Space. Auto-advance pauses on hover or focus (WCAG 2.2.2).
- `scroll-padding` keeps the focused item from hiding under sticky chrome (2.4.11).
- Cart −, + and trash have larger hit areas.
- A number stays on the same line as its unit in product titles (`۱۰ لیتری`).

### Flows and floating layers
- The support pill moved to z-index 45, and it collapses to a round button once the page scrolls.
- Toast position is computed per route, so it never covers a CTA. It is dismissed when the screen changes.
- Back never reopens an empty checkout and never lands a signed-in user on the OTP screen. `placeOrder` refuses an empty cart.
- Delivery slots that have already passed today are disabled. Checkout preselects the first open slot.
- OTP submits automatically on the sixth digit. Refill and used-sale go straight to the code step, because the phone was already validated on the form.
- A guest price inquiry first asks for a verified phone, since experts call back. The phone is stored on the inquiry.
- A failed submit scrolls to the first error. Out-of-stock shows "notify me" instead of a dead disabled button.
- On Services, the reassurance card is the 24/7 call action again.
- Fixed: the `data-scrolled` flag, the background seam on long pages, and the bundler debug box that covered the nav when offline map tiles failed.

## Deferred, with reasons

- **Price and "تومان" treatment, five variants (Associate #1).** Unifying them needs four or more
  template edits that touch find-strings shared with earlier edits. That belongs in its own pass.
- **Order-success buttons below the fold (Associate #2).** They can be reached by scrolling. Fold it into a success-screen layout pass.
- **Product cards are `role="button"` with a nested button (Associate #3, axe `nested-interactive`).**
  Fixing it means restructuring the card template and the card→detail morph hook. It has high blast radius.
- **Map tiles offline.** Inlining a tile pyramid for Tehran is a product decision because of size.

## Verification

- `python3 build/build.py` is green with all 99 markup edits at their expected counts.
- Booted with every external request blocked, over both `http://` and `file://`: no React fetch.
- With motion on, tab hops show 0 view-transition errors (before: an `InvalidStateError` on each).
- Flow tested end to end:
  1. Add to cart, then checkout with login.
  2. OTP auto-submits and places 1 order.
  3. Back lands on Cart, and no order is created from an empty checkout.
  4. A guest inquiry goes to phone verification.
  5. A failed refill submit reveals the first error.
- No `.sc-logic-error` banners and no console errors apart from the expected tile fetch failures.
