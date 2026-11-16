# HoPD review: Emdad Oxygen panel + shop (branch under-review)

Method: read-only. Static read of `panel/index.html` (CSS lines 8-231, JS 232-858) and the unpacked shop template
(`shop-src/template.html`: CSS 894-1467, markup 1468-2602, JS 2604+). Both apps were then run from a scratch copy on :3101
(db.json in the repo was NOT touched; demo orders, payments and technicians were seeded into the copy only). Driven with
Playwright at 320/360/390 and 1280, light and dark. Screenshots: `scratchpad/hopd/*.png`.
Contrast numbers are computed from the tokens (WCAG relative luminance).

Legend: Sev = Critical / High / Med / Low. Effort = S (under 30 min), M (a few hours), L (a day or more).
SAFE = visual/semantic change that preserves behavior (no logic change, no flow change).
BEHAVIOR = changes interaction or logic, so it needs a product decision or tests.

---------------------------------------------------------------------------------------------------

## A. PANEL (`panel/index.html`)

### D1. Hash navigation drops focus to <body>; no focus management after route change. High / M / BEHAVIOR (a11y)
- Where: `render()` L819-826 replaces `#app.innerHTML` on every route, filter, search keystroke and 10 s poll; `route()` L827.
- Problem: verified. Pressing Enter on a sidebar link leaves `document.activeElement === BODY`. A keyboard or screen-reader user
  restarts from the top after every navigation, and after every 10 s poll when online (focus is only restored for `#q`).
  The `<h1>` is never announced.
- Fix: in `route()` after `render()`, focus the heading: render `<h1 id="page-h" tabindex="-1">` and call
  `$('#page-h').focus({preventScroll:true})`. In `render()`, remember `document.activeElement`'s `data-a/data-id/href` and refocus
  the matching node after the innerHTML swap. For the poll, skip `render()` when the data hash is unchanged.

### D2. Dialogs/drawers: no accessible name, no focus trap, background not inert, outside click does nothing. High / M / BEHAVIOR (focus trap, scrim click) + SAFE (aria-labelledby)
- Where: `openOverlay()` L587-593, `.scrim` L190, `.modal` L192.
- Problem, all verified:
  - `role=dialog` has no `aria-label`/`aria-labelledby`.
  - 45 Tab presses escape the dialog into the page behind it.
  - The page behind is not `inert`.
  - The `.modal` wrapper (z-index 51, inset 0) sits above `.scrim`, so clicking outside the card never closes it (checked in light and dark).
  - The drawer closes only via x/Esc.
- Fix (markup): give `.d-h h2` an `id="ov-t"` and set `aria-labelledby="ov-t"` on the dialog. On open, set `$('.shell').inert = true`;
  on close, set it back.
  Fix (CSS): `.modal{pointer-events:none} .modal>.card{pointer-events:auto}` so scrim clicks pass through (the scrim already has `data-a="close"`).
  Closing on outside click is a behavior change: confirm it is wanted for forms with unsaved input. The delete-confirm box is safe either way.

### D3. Horizontal overflow of the whole page at 320-360 px on Overview. High / S / SAFE
- Where: `.ov{display:grid;gap:14px}` L115.
- Problem: verified. `scrollWidth` is 389 vs 360. The single implicit grid column is `auto`, so the nowrap `.rlist .t b` and
  `.stat .s` push it wider. The 4 stat cards and the alert strip are cut off at the viewport edge (screenshot `panel-overview-360.png`).
- Fix: `.ov{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)}`. Verified: scrollWidth returns to 360 (`panel-overview-360-fixed.png`).

### D4. Pipeline step arrows point the wrong way in RTL, and tiles clip text at 1000-1280 px. High / S / SAFE
- Where: `.steps4 li:not(:last-child)::after{content:'›';inset-inline-end:-6px}` L167; `.steps4` L165-166.
- Problem: steps flow right to left, so the connector must be `‹` (it is currently `›`, pointing back to the previous step).
  The glyph also straddles the 6 px gap and overlaps tile text. At 1280 the two pipelines sit side by side in a 40% card, so each
  tile is about 40 px wide. "در حال آماده‌سازی" and "تکمیل‌شده" are cut off or overflow (screenshot `panel-overview-d-light.png`).
- Fix:
  ```css
  .steps4 li:not(:last-child)::after{content:'‹';inset-inline-end:-9px}
  .steps4 small{overflow-wrap:anywhere;hyphens:auto}
  @media (max-width:1400px){.pipes{grid-template-columns:minmax(0,1fr)}}  /* stack the two pipelines until the card is wide */
  .ov-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}               /* or give status the larger share */
  ```
  Also switch the connector to an SVG chevron with `transform:scaleX(-1)` under `[dir=rtl]`, so the icon is not a font glyph.

### D5. Contrast failures (WCAG 1.4.3 / 1.4.11). High / S / SAFE
| Pair | Ratio | Where |
|---|---|---|
| white on `--err` #ff6961 (dark nav count badge) | 2.82 | `.nav .count` L53 |
| default placeholder #757575 on `--fill` (light search input) | 4.01 | `.search`, `.form input`: no `::placeholder` rule exists |
| input fill vs surface (no visible boundary: border is `transparent`) | 1.15 light / 1.33 dark | `.search` L92, `.form input` L204, `.login input` L214 |
| `--line` border vs surface (chips, buttons, cards; unlabeled chips rely on it) | 1.27 light / 1.33 dark | `.chip`, `.btn` |

(Passing, for reference: badge text on its soft fill is 4.7-7.8; `--tx2` on surfaces is 5.1-6.8; the focus ring `--p` is 5.8 / 6.6.)
- Fix:
  ```css
  :root[data-theme=dark]{--on-err:#2a0a0c}                 /* or darken the badge in dark: background:#d63a33 */
  .nav .count{color:var(--on-err,#fff)}
  ::placeholder{color:var(--tx2);opacity:1}
  .search,.form input,.form select,.form textarea,.login input{border-color:color-mix(in oklab,var(--tx2) 55%,transparent)}
  ```
  1.4.11 needs about 3:1 for the control boundary. A 1px border at `--tx2` mixed 55% gives about 3:1. The `.chip` border
  needs the same. This changes the visual look slightly: get design sign-off for the stronger borders.

### D6. Touch targets under 44 px. High / S / SAFE
Measured (px, w x h): `.btn.sm` (refresh, logout, open app) 80x32 / 252x32; `.btn` 38 tall; `.chip` 32 tall; `.x` close 36x36;
`.burger` and `.theme-btn` 42x42; `.search` 40; sidebar `a` 42; `.attn .go` 24; `.col` bars 19 wide;
checkbox rows (native 13-16px box, label 13px); `.rlist .row` about 44, borderline.
- Fix:
  ```css
  .btn,.chip{min-height:44px}
  .btn.sm{min-height:36px;position:relative}
  .btn.sm::after,.x::after{content:"";position:absolute;inset:-6px}   /* hit area 44 without moving layout */
  .burger,.theme-btn{width:44px;height:44px}
  .x{width:44px;height:44px}
  .check{min-height:44px} .check input{width:20px;height:20px;accent-color:var(--p)}
  .nav a{min-height:44px}
  @media (pointer:fine){.btn{min-height:38px}.chip{min-height:32px}}  /* keep desktop density if wanted */
  ```
  The 24 px `.go` arrow is inside a link, so it is fine.

### D7. Order and request tables hide Amount/Status off-screen on phones with no scroll affordance. High / M / SAFE
- Where: `.tbl{overflow-x:auto}` L96, `td{white-space:nowrap}` L100; `table()` L383-388.
- Problem: at 390 px only 4 of 8 columns (number, customer, phone, time) show. Total, payment and status are off to the left with
  no scrollbar, shadow or hint. Admins triage by status and would never see it (`panel-orders-m-dark.png`). `tr tabindex=0` has no role or
  accessible name, so a screen reader announces an empty "row".
- Fix (minimal): `.tbl{overflow-x:auto;background:linear-gradient(to left,var(--sur) 30%,transparent) 0 0/40px 100% no-repeat local,linear-gradient(to left,rgba(0,0,0,.12),transparent) 0 0/14px 100% no-repeat scroll}`
  (the scroll-shadow trick), plus `<table aria-label="...">`. Give the clickable `<tr>` `role="link"`, or better, make the first cell a
  `<button>`/`<a>` and keep the `tr` click as a progressive enhancement.
  Better (M): below 700 px render each row as a card (`display:block` rows, `td::before{content:attr(data-l)}`) so status and amount are first-class.

### D8. Number and digit handling in forms and data (RTL/Persian). High / M / mixed
- `type=number` for price, stock and sort (L654-656, L671, L710): Persian/Arabic digits typed from a Persian keyboard are
  rejected by `type=number` in Chrome (value becomes ""), and the generic "price must be greater than 0" error is shown
  (the user sees no explanation). `saveTech` already normalizes Persian digits for the phone. Fix: use
  `type="text" inputmode="numeric" dir="ltr" autocomplete="off"` and normalize `[۰-۹٠-٩]` to ASCII in `saveProduct/saveRecord` before
  `+f.get()`. BEHAVIOR (input handling), low risk.
- Digit mix is inconsistent (verified in screenshots):
  - Phones, order IDs (EO-1001), tracking codes and card masks render in Latin digits inside `.ltr`, while dates, money, counts
    and stages use Persian digits (`fa-IR`). It is defensible for IDs, but phones should be Persian-digit LTR (`faD(phone)`) for consistency.
  - The Overview shows revenue as "۹٫۶ میلیون" (compact) in the stat card and "۹٬۶۰۰٬۰۰۰ تومان" in the trend header right below it.
  - Data view table shows raw English collection keys (`users`, `sessions`...) in an RTL cell (L578).
  - Fix: `td .ltr` for those keys, or a label map; consistent `toman()` everywhere except chart axes.
- `.form input[type=tel]` is not matched by the field style selector, so the technician phone field renders as an unstyled native box
  (square border, system font; see `panel-techform-err-m-light.png`). SAFE fix: add `.form input[type=tel]` and
  `.form input[type=password]` to the selector at L204 (better: `.form input:not([type=checkbox]):not([type=radio])`).

### D9. Form validation is a single text line; not associated with fields. Med / S-M / SAFE
- Where: `saveTech/saveProduct/saveService/saveRecord` (L687-736), `.err-msg` L207, forms L649-686.
- Problem: one message under the whole form. It is not tied to the field, there is no `aria-invalid` or `aria-describedby`, and
  focus does not move to the offending input. Required fields have no visible marker (`required` attr + `novalidate`).
  In the 390 px modal the message appears mid-dialog, far from the Save button. Persian copy is fine.
- Fix: on error set `aria-invalid="true"` on the field, `aria-describedby="xx-err"` and call `field.focus()`. Add `.req::after{content:" *";color:var(--err)}`
  or "(اجباری)" in the label. Modal footer: `.actions{position:sticky;bottom:-22px;background:var(--sur);padding-block:12px}`.

### D10. Modal action buttons fall below the fold at 800 px high; modal and drawer scroll as a whole. Med / S / SAFE
- Where: `.modal > .card{max-height:calc(100vh - 32px);overflow-y:auto}` L193; product form (screenshot `panel-prodform-d-dark.png` shows Save/Cancel clipped).
- Fix: make `.modal>.card{display:flex;flex-direction:column;overflow:hidden}`, form body `overflow:auto`, `.actions{position:sticky;bottom:0}` as above.
  Use `100dvh` instead of `100vh` for mobile browser chrome (also L35 `.shell` min-height, `.login`).

### D11. Toast is not reliably announced and is not safe-area aware. Med / S / SAFE
- Where: `toast()` L301, `.toast` L209.
- Problem: a `role=status` node inserted together with its text is frequently not announced (live regions must exist beforehand).
  `bottom:20px` ignores the iOS home indicator. Toasts stack on top of each other if several fire.
- Fix: one persistent `<div id="live" role="status" aria-live="polite" class="sr-only">` created once; set its `textContent` in `toast()`.
  `.toast{bottom:calc(20px + env(safe-area-inset-bottom))}`. Add `max-width:calc(100vw - 32px)`.
  Add the `.sr-only` utility (the panel has none today).

### D12. Empty, loading and error states are thin. Med / M / SAFE (+ a little BEHAVIOR for the offline banner)
- Empty: `<div class="empty">موردی یافت نشد</div>` is used for both "no data yet" and "no search results". Neither case offers
  "clear search/filter" or a create CTA (technicians, products and services each have one in the top bar, but the empty table does not point to it).
- Loading: `start()` L851 awaits probe and load before the first render, so the screen is blank with no `aria-busy`, spinner or skeleton. `refresh` has no pending state.
- Error: when the server is unreachable, `load()` silently falls back to the local mirror and `write()` shows only a toast. There is no
  persistent "offline / local data" banner outside the "داده و تنظیمات" view, so admins can edit what they believe is the real DB.
- Fix: `empty(msg, cta)`; distinguish `UI.q||UI.f!=='all'` ("نتیجه‌ای برای فیلتر شما نیست — پاک‌کردن فیلتر"). Add `<div class="card pad" aria-busy="true">` skeleton rows
  (`.sk{background:linear-gradient(90deg,var(--fill),var(--sur2),var(--fill));height:14px;border-radius:7px}` under `prefers-reduced-motion:no-preference`).
  Add a persistent `.banner.warn` in `shell()` when `!ONLINE`: "حالت آفلاین: تغییرات فقط در این مرورگر ذخیره می‌شوند".

### D13. Design tokens: panel mirrors the shop's palette but has drifted, and there is no scale for space/radius/type. Med / M / SAFE
- Drift (panel vs shop template, same names):

  | Token | Panel | Shop |
  |---|---|---|
  | `--p` (dark) | #a493ee | #8f7cdd |
  | `--p-ink` (light) | #5a48a0 | = `--p` (#6250a8) |
  | `--p-ink` (dark) | #c3b8f5 | #b3a5f0 |
  | `--bg` (dark) | #0b0a12 | #08070d |
  | `--p-soft` | literal hex | `color-mix()` |

  The panel header comment says the tokens "mirror the shop app". Decide one source of truth (export `:root` tokens to a shared `tokens.css` used by both).
- Hardcoded literals:
  - scrim `rgba(15,12,40,.45)` twice (L190, L218);
  - shadow `rgba(0,0,0,.25)` twice;
  - `#fff` on `.logo`, `.btn.pri` and `.count` (introduce `--on-p`, `--on-err`; the shop already has `--onp`);
  - `--chart` duplicates `--p`.
- Radii: 6, 8, 10, 12, 14, 16, 999 (`--r` is the only token). Font sizes in use: 11, 12, 12.5, 13, 13.5, 14, 15, 16, 17, 18, 19, 20, 22, 24 (14 values).
  Control heights: 32, 36, 38, 40, 42, 46.
- Duplicate rules: `.burger` and `.theme-btn` (L56-58) are identical, and `.x` is a third variant of the same 36-42 px icon button.
- Fix: add `--sp-1..8`, `--r-sm/md/lg/pill`, `--fs-12/13/14/16/20/24`, `--h-ctl:44px`; merge icon buttons into `.icon-btn`; collapse type to
  12/13/14/16/18/22. Pure refactor.

### D14. Persian copy inconsistencies (panel). Med / S / SAFE
- Same concept, different words:
  - "اپ" vs "اپلیکیشن" (sidebar "باز کردن اپلیکیشن" vs table "نمایش در اپ" and "اپ مشتری"). Pick one (اپلیکیشن in nav, اپ in dense UI is acceptable, but write it down).
  - Cancelled: لغو شد (badge) / لغوشده (filter chip) / لغو شده (pipeline "لغو شده:") / لغو (button). Delivered: تحویل شد (stage) / تحویل‌شده (filter).
    Use the ZWNJ form consistently (لغو‌شده/تحویل‌شده for adjectives, "تحویل شد" for the stage label).
  - Overview pipeline for requests uses ['جدید','بررسی','در حال انجام','تکمیل‌شده'] (L491) while the drawer and badges use
    STAGES.refill/used ("ثبت درخواست / جمع‌آوری کپسول / در حال شارژ / تحویل شد"). The same request has two vocabularies.
  - "درخواست خدمت" / "درخواست‌های خدمت" / "درخواست" / "کد" vs "شماره" for IDs (requests table says "کد", orders say "شماره").
- Button copy: "بله، انجام شود" on delete confirms is vague. Use the verb ("بله، حذف شود"). Title "تأیید" is generic: "حذف محصول؟".
- "به‌روزرسانی" button vs toast "به‌روز شد" is fine.
- Login hint prints the password in the UI: fine as a labelled demo gate, but make sure it is removed from production builds.

### D15. Misc. panel a11y and RTL details. Low-Med / S / SAFE
- `.chart .col` (14 focusable `tabindex=0 role=img` bars): focus stops add noise. Make the chart one focus stop with a text summary
  (`<table class="sr-only">`) and keep the tooltip for pointer only.
- `.tip` and `.toast` use `translateX(50%)` + `inset-inline-start:50%`: correct only because the page is fixed to RTL. Use
  `translate:50% 0` under `:dir(rtl)` or center with `inset-inline:0;margin-inline:auto;width:fit-content`.
- Phone sidebar uses physical `right:0; translateX(100%)` (L~220): switch to `inset-inline-start:0` + `translateX(calc(100% * var(--dir)))` or keep, since the document is RTL-only, and note it.
- `:focus-visible{outline:2px solid var(--p)}` is good (5.8 / 6.6 contrast); `border-radius:8px` on every focused element deforms pills. Remove the `border-radius` from the global rule.
- Sidebar and drawer: closing the sidebar scrim has no label/role; fine for pointer, but `Esc` is handled. OK.
- Reduced motion: handled for transitions and the drawer. Fine. Dark mode and OS preference: `prefers-color-scheme` is not honored on first visit (light is forced);
  verified with `colorScheme:'dark'`. Decide deliberately (see D26).
- `<html lang="fa" dir="rtl">` and `<title>` per view: good. There is no skip link (`<a href="#main" class="skip">`, S).
- Panel inline fonts: 3 base64 Vazir weights (~260 KB file). It works offline but blocks first paint. Optional: `font-display` is already `swap`; consider subset.

---------------------------------------------------------------------------------------------------

## B. SHOP (bundled template)

### D16. No usable document title. High / S / SAFE
- Where: `shop/index.html:5` ships `<title>Bundled Page</title>`. At runtime `document.title` is empty. The template `<helmet>` (L9-1468) has no `<title>`.
- Problem: WCAG 2.4.2; shows in tab strip, history, task switcher, PWA name and screen-reader page announcement.
- Fix: add `<title>امداد اکسیژن · فروشگاه</title>` in the template helmet. If the bundler overwrites it, set it in the bundler config.
  Per-route titles ("سبد خرید · امداد اکسیژن") in `go()` via `document.title=...` would be a bonus (BEHAVIOR, trivial).

### D17. Inputs under 16 px trigger iOS zoom; some fields have no accessible name. High / S / SAFE
- Measured: name inputs 14 px, phone/card/pin inputs 15 px, order-note/address/refill textareas 13 px, discount code 13 px, OTP 24 px.
  iOS Safari zooms the page when focusing any input under 16 px, and it does not zoom back out reliably.
- Unnamed (placeholder is the only name): OTP input (`placeholder="______"`, no `aria-label`), discount code, order note textarea, refill
  address and notes textareas. Visible headings above them are `<div>`s, not `<label>`s (`<label for=>` is used 0 times; 12 `<label>` wrappers exist).
- Fix: `input,textarea,select{font-size:16px}` (or `max(16px,1em)`) in the global CSS (L1000 area). Add `aria-label="کد تأیید ۶ رقمی"`, `"کد تخفیف"`, `"یادداشت سفارش"`, `"آدرس کامل تحویل"`, `"توضیحات"`
  to those fields in the markup; for OTP also `autocomplete="one-time-code" inputmode="numeric" pattern="\d*"` (some already set).
- The visible "(اختیاری)" hint in headings should stay.

### D18. Inline validation errors are tiny, not announced, and not attached to the offending field. High / M / SAFE
- Where: markup L1769, L1780 (`color:var(--err);font-size:11.5px;min-height:18px`); `authErr`; refill errors; JS `fail()` paths.
- Verified: submitting the login form with empty first name shows "نام و نام خانوادگی را وارد کنید" under the PHONE field (the wrong field), at 12 px (the 11.5 to 12 floor override).
  The toast "برای ثبت سفارش ابتدا وارد شوید" is the only role=status text; the inline error is not `role=alert`. There is no `aria-invalid`/`aria-describedby` anywhere.
  Refill form: "نوع ارسال را انتخاب کنید" appears under the radio group in red 12 px, with a toast. Better, but also not tied programmatically.
- Fix: render errors as `<div id="e-name" role="alert" style="font-size:13px">` next to the field, set `aria-invalid="true"` + `aria-describedby`, add a 2 px `--err` ring on the field
  (`input[aria-invalid=true]{box-shadow:0 0 0 2px var(--err)!important}`), and `focus()` the first invalid one. Bump error text to 13 px.

### D19. Dialogs (sheets) get role/aria-modal only at runtime; toast is `aria-hidden`. Med / S / SAFE-ish
- Where: JS L3786 adds `role=dialog aria-modal tabindex` and a focus trap L3755-3765 (good). The toast markup L2583 is `aria-hidden="true"` and announced through a separate live region (L3523-3530) (good).
- Remaining: the runtime dialog has no accessible name. Add `aria-labelledby` pointing at the sheet's heading (give each sheet title an `id`) or `aria-label`.
  Check that background content is `inert` while the sheet is open (not found in the code): `document.querySelector('[data-appbar]').closest('div').inert = true` for the page wrapper.
  Restoring focus to the opener on close is implemented for some paths (L3745) but not verified for every sheet.

### D20. Touch targets. Med / S / SAFE
- Measured at 390 px: add-to-cart "+" 40x40; cart stepper −/+ 28x28 (the `::after inset:-6px` extends this to 40, still under 44); delete 32x32 (44 with the pseudo);
  appbar back/theme buttons 40x40; "ویرایش شماره" and "ارسال مجدد" are 11-12 px text links; "تغییر آدرس" link ~12 px;
  stock/sort chips already 40. Also the support FAB overlays the 5th list row's "+" button until the page is scrolled (the CSS comment in L1310 acknowledges a mis-tap that started a phone call).
- Fix: `#cart-list button::after{inset:-8px}` and make the stepper buttons 32px; `[data-appbar] button[style*="width:40px"]{width:44px!important;height:44px!important}`;
  `.add-btn{width:44px;height:44px}` (it is the primary purchase action); inline links get `min-height:44px;display:inline-flex;align-items:center`.
  Reserve space instead of overlaying: add `padding-bottom` equal to FAB height to list pages, or move the FAB into the home/profile pages only.

### D21. Design-token layer exists but markup does not use it; compensated by `!important` attribute-selector overrides. Med / L / SAFE (if done mechanically)
- Evidence (template): `--fs-*`, `--sp-*`, `--h-*` tokens are defined (L1030-1043) but used 0 times in markup (1 in JS);
  `--r-*` used 9 times (JS only). The markup uses literals: 14 distinct font sizes (12.5 px x57, 12 x43, 13 x41, 11 x30, 13.5 x29, 11.5 x25, 15, 17, 20, 16, 14, 14.5, 10.5, 10, 9.5...),
  radii 9/10/12/14/16/18/20/24/999, heights 32/34/36/38/40/44/46/48/50, gaps 4-14, 30 `color:#fff`, 4 `rgba(15,12,40,.45)` scrims.
- Consequence: a "normalization layer" (L1186-1236) rewrites rendered values with `[style*="font-size:11px"]{font-size:12px!important}`,
  `[style*="border-radius:14px"]{border-radius:16px!important}`, `[style*="font-weight:800"]{...600!important}` etc. These selectors depend on React's exact
  serialization ("prop:value" vs "prop: value"), break on any rewording, cannot be overridden without more `!important`, and the 12 px floor already has exceptions (price pinned 15 px).
  The "type scale" has 12.5 and 13.5 half-steps that the floor leaves in place.
- Fix path: (1) generate the markup from a small class set or pass tokens through `style` helpers; (2) at minimum replace literals via a codemod
  (`font-size:12.5px` to `var(--fs-caption)` after deciding to merge 12/12.5, 13/13.5); (3) delete the corresponding override block once literals are gone.
  The visual output should be unchanged by design. Mark as a staged refactor behind visual-diff screenshots.

### D22. Primary action color is inconsistent. Med / S / BEHAVIOR (visual)
- Observed: cart, auth, checkout and pay CTAs use the purple gradient. The refill-service form CTA ("ثبت درخواست شارژ") is cyan with dark text in dark mode (screenshot `shop-refill-err-m-dark.png`);
  the code comment at L1208 even says "Primary CTA = teal fill". Five elements use `background:var(--acc)` (L-markup), the rest `--p`.
  Home hero primary is white. Three primary treatments on a 4-screen flow.
- Fix: choose one: purple `--grad-cta` for every "submit" action; keep teal only for informational/secondary emphasis. Needs sign-off since it changes the service form's look.

### D23. Floating layers consume too much of the viewport on small phones. Med / M / BEHAVIOR (layout)
- At 390x844 the stack is: appbar 64 px + support FAB (46 px tall, 270 px wide, above the nav) + 64 px floating tab bar + 12 px gaps + a sticky CTA bar (checkout/pay) + toast.
  On the checkout screen the CTA, tab bar and toast are visible together; the note textarea and discount field are partly covered (`shop-checkout-bottom-m-light.png`).
  At 320x568 only about 200 px of scrollable content remains. The tab bar should hide on checkout/pay/auth (focus tasks), as the CTA already replaces it logically.
- Fix: hide `[data-tabbar]` and the FAB on `checkout`, `pay`, `auth`, and forms (`body[data-route=...] [data-tabbar]{display:none}`), and make `body[data-scrolled]` default the FAB collapsed on all but home.

### D24. Mixed numeral systems in the shop. Med / S / SAFE
- OTP screen shows "09121234567" and the sample code "123456" in Latin digits within Persian sentences; "کد ۶ رقمی" is Persian; the cart badge and prices are Persian;
  payment placeholders are Latin dashes. Phone numbers appear Latin on the auth and success screens.
- Fix: one helper `faDigits()` for display; keep `dir="ltr"` + `unicode-bidi:isolate` for phone strings. Inputs remain ASCII-accepting but normalized on input
  (`phone` and `otp` already accept both? verify in `onPhone/onOtp` handlers). Pre-fill placeholders in Persian digits are already used for the phone ("۰۹۱۲ ۳۴۵ ۶۷۸۹").

### D25. Desktop and tablet: single 430 px column; FAB anchored to the viewport edge. Low-Med / S / SAFE
- At 1280 the app is a centered 398 px column (fine for a PWA prototype), but the FAB sits 16 px from the viewport's left edge, far from the column, while the tab bar is centered.
- Fix: anchor the FAB to the column: `[data-fab]{left:max(16px,calc(50vw - 199px))!important}` (same pattern already used for `[data-tabbar]`). Optional: add a `min-width:768px` shell with a side-rail, or frame the column with a device-like margin.

### D26. Theme behavior: `prefers-color-scheme` ignored, `defaultTheme` prop contradicts runtime. Low / S / BEHAVIOR (product decision)
- Observed: with OS dark the shop and panel both load light. The template prop says `defaultTheme: dark` but the app starts light. Pick one
  (honor `prefers-color-scheme` when no stored choice, or document "light first").
- `theme-color` meta is a single value `#0a8395` (white text on it is 4.47:1, but it does not match purple chrome in either theme): use two `<meta name="theme-color" media="(prefers-color-scheme:...)">` or set per theme.

### D27. Misc shop items. Low-Med
- RTL is handled well: logical `inset-inline-*`, `margin-inline`, `padding-inline`; back chevron is `›` (correct for RTL), "forward" chevrons `‹` (correct); no `margin-left/right`. The only physical positions are `left:0;right:0` on full-width fixed bars and the `text-align:left` on LTR (phone/card) fields: fine.
- `letter-spacing:1px/10px` is applied to digit-only LTR fields (phone, card, OTP): acceptable (does not touch Arabic-script joining). Keep it off any field that can hold Persian letters (name fields are clean).
- Contrast spot checks (computed): dark `--p-ink` on `--p-soft` 5.8; light 5.5; dark `--onp` on `--p` 5.3; white on the deep CTA gradient 7.2 (dark). White on `--warm` is 3.02: do not put text on `--warm` fills.
  White on `--acc` #1aa8bd is 2.85: only `--acc` as a text/icon color on the dark surface is fine; keep dark text on teal fills (already done).
- The aurora background animates by default and is paused only under `prefers-reduced-motion` (verified `0s`); also consider pausing it when `document.hidden`.
- `prefers-reduced-transparency` and the `@supports not (backdrop-filter)` fallback are implemented (good).
- Tab bar glass shows ghosted page text behind its labels (screenshot `shop-home-m-light.png` bottom): raise `--glass-chrome` alpha from .70 to about .86 or add `backdrop-filter:blur(30px) brightness()` so labels keep contrast over content. Measure label contrast over busy content: unlabeled.
- Cart stepper order: "+" at left, "−" at right in RTL; many Persian apps put "+" at the start (right). A convention choice. Keep consistent with the product list's "+" at the inline-end.
- Empty states are good (cart, profile). Missing: product list search with no results (verify copy), orders list empty, offline/network error for payment (`payErr`), and a loading skeleton for the product list when the API is slow.

---------------------------------------------------------------------------------------------------

## C. Cross-cutting recommendations

1. Share one `tokens.css` (palette, spacing, radius, type, heights, motion) between panel and shop and delete the drift (D13, D21).
2. Standardize a 44 px minimum on touch (D6, D20) and 16 px on inputs (D17).
3. Establish an error-message component (field-level, `aria-invalid`, `aria-describedby`, `role=alert`, 13 px) for both apps (D9, D18).
4. Add a persistent live region + `sr-only` utility to the panel; the shop already has one (D11).
5. Write a copy glossary (اپ/اپلیکیشن, لغو شد/لغوشده, تحویل شد/تحویل‌شده, کد/شماره) (D14).

## D. Safe, behavior-preserving batch (can ship together; no logic changes)
D3, D4, D5, D6, D8 (the `type=tel` selector part only), D10, D11 (live region), D13 (token/duplicate cleanup), D14 (copy), D15, D16, D17 (font-size + aria-labels),
D20, D24, D25. All are CSS/markup/copy-only. D1, D2 (focus trap, scrim click), D7 (card layout), D8 (digit normalization), D9, D12 (offline banner), D18 (focus move),
D22, D23, D26 change behavior or visual design and need review.

## E. Priority order
1. D3 overflow, D4 RTL arrows, D5 contrast, D16 title, D17 zoom/labels (fast, safe, visible).
2. D1/D2 focus management and dialog semantics, D18 error semantics, D7 mobile tables.
3. D6/D20 touch targets, D8/D24 digits and number inputs, D12 states.
4. D13/D21 token consolidation (largest, do last, with visual diffs).

Not verified: real screen-reader output, iOS Safari behavior (zoom claims are from WebKit's known rule), Safari/Firefox rendering of `:has()` and `color-mix`,
order-detail, wishlist and address-sheet screens in the shop (not driven), and the hero carousel autoplay behavior under reduced motion.
