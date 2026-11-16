# Head of Product review: Emdad Oxygen shop + admin panel

Branch `under-review`, read-only. I traced the flows in code and drove a scratch server (PORT 3102, copy of the repo) with Playwright. The repo is unmodified.

Conventions:
- `shop:NNNN` is a line in the unpacked shop source (`scratchpad/shop-src/template.html`).
- `panel:NNN` is a line in `panel/index.html`.
- `server:NNN` is a line in `server.js`.
- Verified = reproduced on the running app. Code-only = read from source, not run.
- Effort: S under half a day, M 1 to 3 days, L over 3 days.
- Fix type: SAFE = unambiguous bug fix. DECISION = needs a product or business call first.

## Summary table

| ID | Sev | Title | Verified | Fix type | Effort |
|---|---|---|---|---|---|
| P1 | Critical | Hiding or deleting oxy40, oxy5 or conc in the panel crashes the whole shop home | Yes | SAFE | S |
| P2 | Critical | Stock is never decremented, in the app, the panel or the server | Yes | DECISION (policy) + SAFE (mechanics) | M |
| P3 | Critical | A paid order can silently vanish when the server write fails | Yes | SAFE | M |
| P4 | High | Refill request drops address, delivery type, photos and cylinder type | Yes | SAFE + DECISION | M |
| P5 | High | One malformed URL kills the server process | Yes | SAFE | S |
| P6 | High | No authentication anywhere: fixed OTP, open API, client-side admin password | Yes | DECISION | L |
| P7 | High | Cart quantity can exceed stock and checkout still succeeds | Yes | SAFE | S |
| P8 | High | Cancel flow is half-built: no refund, no restock, no customer path, un-cancel by accident | Yes | DECISION | M |
| P9 | High | Status pipeline allows any jump, backward move or un-cancel; no guards | Yes | DECISION | S |
| P10 | High | Demo addresses prefilled for every new user and leaked between users on a device | Yes | SAFE | S |
| P11 | Medium | Technician assignment is orders-only, invisible to the customer, with no auto-advance and no delivery proof | Yes | DECISION | M |
| P12 | Medium | Search misses Latin digits, Arabic-Indic digits and ZWNJ variants, and logs every keystroke | Yes | SAFE | S |
| P13 | Medium | Order numbers have only 9000 values per month, and the server accepts duplicates | Yes | SAFE | S |
| P14 | Medium | PATCH upserts: a stale panel tab can resurrect a deleted order as a stub | Yes | SAFE | S |
| P15 | Medium | Used-equipment service identity is inconsistent (repair vs sale); no accept/reject/counter flow | Yes | DECISION | M |
| P16 | Medium | Discount code is hard-coded, public, unlimited, with a silent cap | Yes | DECISION | M |
| P17 | Medium | No shipping fee line; contradictory "coordinate payment" copy on paid orders | Yes | DECISION | S |
| P18 | Medium | Admin phone search fails because stored phones contain spaces | Yes | SAFE | S |
| P19 | Medium | Payments ledger only records successes; revenue ignores cancellations; status hard-coded | Code | DECISION | M |
| P20 | Medium | Features that look real but do nothing (SMS, map pin, OTP hint, PWA footer, placeholder contact) | Yes | DECISION | S |
| P21 | Medium | Address book, cart and wishlist are written to the DB but never restored on another device | Yes | DECISION | M |
| P22 | Medium | Product admin gaps: blank stock saves as 0, no audit diff, no images, default art wrong | Code | SAFE | S |
| P23 | Low | Missing must-have admin features (CSV export, manual order, internal notes, click-to-call, filters) | n/a | DECISION | M to L |
| P24 | Low | Unbounded `db.json` growth, whole-file rewrite on every write, no pagination | Code | DECISION | M |
| P25 | Low | Smaller edge cases (see list) | Mixed | SAFE | S |

---

## P1. Hiding or deleting a "featured" product white-screens the shop (Critical, verified)

- **Flow:** admin product hide or delete, then the customer home page.
- **Where:** shop:4291 `featured: ['oxy40','oxy5','conc'].map(id => this.vm(this.PRODUCTS.find(...)))`. The pull at shop:3319 filters `active !== false`.
- **Repro:**
  1. In the panel, untick "نمایش در اپ" on کپسول ۴۰ لیتری, or delete it.
  2. Reload `/shop/`.
  3. I PATCHed `products/oxy40 {active:false}` and loaded the shop. The screen shows `Root.renderVals(): Cannot read properties of undefined (reading 'price')` and the whole app is dead, not only the home tab.
- **Expected vs actual:** hiding a product should only remove it from lists. Instead any of three seed products takes down the whole storefront for every customer.
- **Also crashes:**
  - If every product is hidden, `cur` (shop:4104) is undefined and `vm(undefined)` throws.
  - `wishItems` (shop:4471) calls `vm()` before `filter(Boolean)`.
  - `cartItems` (shop:4148-4150) dereferences a missing product. The pull usually cleans the cart first, so this is a race.
  - `_commitOrder` (shop:4067) throws on `p.title` if a cart product is gone. That is also a race.
- **Fix:**
  - Build `featured` from the first N active products, or filter missing ones: `.map(find).filter(Boolean).map(vm)`.
  - Guard `cur`, `cartItems`, `wishItems` and `_commitOrder` against a missing product.
  - Show an empty state when the catalogue is empty.
- **Effort:** S. **Type:** SAFE.

## P2. Stock is never decremented (Critical, verified)

- **Flow:** checkout, payment, order commit, panel stock.
- **Where:** `_commitOrder` shop:4058-4083, `dbSync` shop:3432-3439. There is no stock write anywhere in the shop, the panel (`panel:751-761` only edits stock by hand) or the server.
- **Repro:** order 2 × کپسول ۱۰ لیتری (stock 11). `GET /api/products` still shows `oxy10.stock = 11` after the paid order.
- **Impact:**
  - Unlimited overselling of the last unit.
  - "Out of stock", "low stock" and the overview "needs attention" counter never reflect real sales.
  - Stock drifts from reality until an admin hand-edits it.
  - Cancelling or deleting an order has no inventory effect either, so a fix must restock.
- **Fix:**
  1. Add atomic server endpoints, for example `POST /api/orders` doing validate, decrement and persist under the existing write queue. Reject with 409 when stock is short. The commit must not go through the generic collection API.
  2. Restock on cancel and on delete of an unfulfilled order.
  3. Log every stock movement.
  4. Show the 409 as "stock changed" on the payment page.
- **Decision needed:** reserve stock at cart, at payment start, or at payment success? Recommend decrement at payment success plus a hard check at "ادامه و پرداخت". Also decide how refill requests interact with cylinder inventory.
- **Effort:** M. **Type:** DECISION on policy, SAFE on mechanics.

## P3. A paid order can silently disappear (Critical, verified)

- **Flow:** payment, order commit, the sync diff.
- **Where:** `dbSync` shop:3432-3437 does a fire-and-forget POST. `_dbSnap` advances at shop:3451, so there is no retry. `dbWrite` shop:3289-3299 resolves `null` on any non-2xx. The `pending()` rule at shop:3339-3345 treats a local order missing from the DB for over 2 minutes as "admin deleted it" and drops it.
- **Repro:**
  1. Reach the payment page.
  2. Make `POST /api/orders` and `/api/payments` return 500.
  3. Pay. The customer sees "سفارش شما ثبت شد", a tracking code and a "paid" invoice.
  4. The server has 0 orders and 0 payments.
  5. After more than 2 minutes the pull runs and the order disappears from "سفارش‌های من" with no message.
  6. The customer was told they paid and the shop has no record.
- **Fix:**
  - Treat the server POST as part of the commit: on failure, keep the order in a local outbox and retry with backoff. Show "در حال ثبت…" and never the success page until the server acknowledges.
  - Make the order POST idempotent on `id`.
  - The "missing from DB means admin-deleted" rule needs an explicit tombstone or `deleted` flag, not absence.
- **Effort:** M. **Type:** SAFE.

## P4. Refill request loses the data the operator needs (High, verified)

- **Flow:** refill form, request record, panel detail.
- **Where:** `completeRefill` shop:3914-3922 stores only `{kind, code, date, ts, delivery(time), gas:'', notes}`. `showRequest` panel:627-634.
- **Repro:** log in, open refill, pick "تحویل درب منزل", pick the saved address, attach a photo, add a note, submit. The record in `serviceRequests` is `{kind:'refill', delivery:'هماهنگی تلفنی', gas:'', notes:'...'}`. Missing from it:
  - the pickup address (the user chose it, but it is not stored),
  - home delivery vs in-store,
  - the photo (`addPhotos` shop:3961 reads files, then they are cleared at shop:3920 and never written),
  - cylinder volume and gas type (the gas chips were removed, so `gas` is always `''`),
  - quantity.
- **Impact:** the pipeline has "جمع‌آوری کپسول" (pickup) but the admin cannot see where to pick up or what to refill. Every request needs a phone call.
- **Fix:**
  - Persist `deliveryType`, `addrTitle`, `addrText`, `lat`, `lng`, `photos`, `cylinderSize` and `gas` on the request, and render them in `showRequest`.
  - Photos are base64 inside `db.json` today. Store them as files or blobs with a size cap per request, because the 8 MB body limit and the whole-file rewrite will hurt.
  - Make cylinder size/type and quantity required fields or a structured choice. This reverses the 13-Nov decision "#6 gas type removed". Ask whether ops really want a phone call for that.
- **Effort:** M. **Type:** SAFE for address and delivery type, DECISION for restoring cylinder type and the photo storage design.

## P5. One bad URL crashes the server (High, verified)

- **Where:** server:128 `decodeURIComponent(urlPath)` in `serveStatic`. It is called synchronously from the request handler with no try/catch.
- **Repro:** `curl 'http://localhost:3102/%E0%A4%A'`. Result: connection reset, then the node process exits with an uncaught `URIError`. I had to restart it. Any scanner or typo takes the shop and the panel down.
- **Fix:** wrap in try/catch and return 400. Add `process.on('uncaughtException')` logging and run under a supervisor (systemd, pm2).
- **Effort:** S. **Type:** SAFE.

## P6. No authentication: go-live blocker (High, verified)

- **Where:**
  - Fixed OTP `123456` accepted for any phone: shop:3894 and the hint at shop:1781.
  - Admin password in client source: panel:244 `ADMIN_PASS = 'emdad'` and printed on the login screen at panel:847.
  - `server.js` has no authn or authz on any route, including `GET /api/db`.
- **Verified:**
  - `GET /api/db` returns every user, address, order and payment record without credentials.
  - `PATCH /api/orders/:id {stage:9}` is accepted.
  - Anyone can enter any phone, use `123456`, and see that account's orders.
- **Impact:** customer PII leak and any visitor can change order state, prices (`PUT /products`) or delete data.
- **Fix:** real SMS OTP with per-phone, rate-limited codes. Server-side sessions. Admin login on the server. Role-scoped API (customers can only read or write their own records; admin routes behind a session). Server-side recomputation of totals.
- **Effort:** L. **Type:** DECISION (SMS provider, hosting, timeline). The demo disclaimers exist, but this must be stated as a go-live gate.
- **Related hazard:** `startLoggedIn ?? true` at shop:2702 would auto-login every visitor as the demo user `0912 845 7455` if the bundle prop is ever omitted. Today it is `false` in the bundle (verified: new visitor is logged out). Flip the code default to `false`.

## P7. Cart quantity can exceed stock, and checkout still succeeds (High, verified)

- **Where:** the pull at shop:3357-3361 only drops missing ids and never clamps quantity. `paySubmit` shop:4034-4051 and `placeOrder` shop:4012-4018 do not re-check stock. `addToCart` shop:3807-3817 toasts "به سبد خرید اضافه شد" even when nothing was added at the cap.
- **Repro:**
  1. Cart holds 4 × کپسول ۵ لیتری (stock 4).
  2. Admin sets stock to 1, then 0.
  3. Pull. Cart still shows ×4.
  4. Checkout and the payment page proceed at the full amount.
- **Fix:**
  - On every pull and again at "ادامه و پرداخت", clamp each line to current stock, remove lines at 0, and show a notice ("موجودی کالا تغییر کرد").
  - Server rechecks at commit (see P2).
  - Fix the misleading toast: say "حداکثر موجودی در سبد است".
- **Effort:** S. **Type:** SAFE.

## P8. Cancel flow is half-built (High, verified)

- **Where:** `setStage` panel:742-750, `stageControl` panel:596-603, shop:3194-3205, `orderVM` shop:3217-3221.
- **Gaps:**
  - Only the admin can cancel. The customer has no cancel or "request cancellation" action.
  - A cancelled paid order still shows the customer "فاکتور پرداخت‌شده" with no refund status, reason or contact. I checked: no "بازگشت وجه" text appears.
  - Revenue is unaffected: the overview sums `payments.status === 'paid'` (panel:460) and nothing marks the payment refunded.
  - No restock (see P2).
  - No cancel reason, no confirmation dialog on the stage chips, and no notification to the customer.
  - Cancel is reversible by clicking any stage chip, which writes `status:'active'` (panel:744). See P9.
- **Fix, minimum:**
  - Add a confirmation, a reason and refund state (`refundStatus: none/pending/done`, with the amount) on cancel of a paid order.
  - Show the customer "لغو شد، بازگشت وجه تا X روز کاری".
  - Mark the payment `refunded` and exclude it from revenue.
  - Restock.
  - Optional customer-side "درخواست لغو" before stage 3.
- **Effort:** M. **Type:** DECISION (refund policy, SLAs, whether customers can cancel).

## P9. Status transitions are unguarded (High, verified)

- **Where:** panel:744-745 and 596-603.
- **Repro (all accepted, history logged):**
  - 1→4 skipping steps.
  - 4→1 backwards. A delivered order is "un-delivered".
  - Cancel from stage 1, then click stage 3 to un-cancel. The record goes to stage 3 / active.
  - Stage `9` via the raw API (server has no validation).
  - Resetting an order to stage 1 keeps its technician.
- **Impact:** delivered orders can be reopened by a mis-click, and the customer app mirrors it instantly.
- **Fix:**
  - Allow only next or previous stage by default.
  - Require a confirm for backward moves, for "تحویل شد", and for cancel and un-cancel.
  - Require a technician before "ارسال شد".
  - Treat "تحویل شد" and "لغو" as terminal unless an admin explicitly "reopens".
  - Validate `stage ∈ 1..4` server-side.
- **Effort:** S. **Type:** DECISION (which moves are legal).

## P10. Demo addresses are prefilled and leak between users (High, verified)

- **Where:** shop:2618-2621 seeds two fake addresses (سعادت‌آباد, ولیعصر) into the initial state. `DURABLE` (shop:2685) persists `addresses`, and logout (shop:4448) does not clear them.
- **Verified:**
  - A brand-new user lands on checkout with "منزل — تهران، سعادت‌آباد…" selected and no address validation. Pay goes through and the order stores the fake address (see the order JSON).
  - After logging out as A and in as B on the same device, B sees A's addresses.
  - The DB also fills with `addressBooks` rows containing the demo addresses, including `guest_*` rows for anonymous devices.
- **Fix:**
  - Start with an empty address book.
  - Require an address before payment.
  - Clear `addresses`, `addrId` and `rfAddrId` on logout.
  - Don't PUT `addressBooks` for an empty or guest book.
- **Effort:** S. **Type:** SAFE.

## P11. Technician flow is thin (Medium, verified)

- **Where:** `deliveryBox` panel:605-615, `assignTech` panel:699-706, `V.technicians` panel:529-538, `orderVM` shop:3213-3231.
- **Gaps:**
  - Technicians can only be assigned to orders. Refill requests have the stages "جمع‌آوری کپسول" and "در حال شارژ" but no technician. The shop copy even promises "پس از تخصیص تکنسین" (shop:4435).
  - The customer never sees the technician name or phone. I verified `technicianName` reaches the customer's state but is not rendered.
  - Assignment does not move the stage. The admin must do both.
  - "Deliver" is just the admin clicking stage 4. There is no technician view, no proof of delivery (code or signature), and no cash/receipt step.
  - Deleting or deactivating a technician with open orders leaves a dangling `technicianId`, with no block or reassign prompt. The name is kept, but the "تحویل در جریان" count is lost.
  - Technician phone is optional, and the panel's phone display is not a `tel:` link.
  - Technician phone validation accepts Persian digits but not Arabic-Indic digits (panel:689; I typed `٠٩١٢…` and got "invalid").
- **Fix, suggested:**
  - Extend assignment to refill requests.
  - Show the technician on the customer's order and request detail.
  - Assign moves the stage to "ارسال شد", or at least prompts.
  - Block delete or deactivate while open jobs exist.
  - Add a delivery confirmation code or the customer's OTP.
  - Make phones `tel:` links.
- **Effort:** M. **Type:** DECISION (does a technician get their own app/login, proof-of-delivery rules).

## P12. Search and Persian-digit handling (Medium, verified)

- **Where:** shop:4092-4100. `deFa` at shop:3181. The log at shop:3450. Panel `match` at panel:393.
- **Results (product list):**

| Query | Hits |
|---|---|
| `۴۰` | 1 |
| `40` | 0 |
| `٤٠` | 0 |
| `اکسیژن ساز` | 0 |
| `اکسیژن‌ساز` | 1 |
| `co2` | 0 |
| `CO₂` | 1 |
| `كپسول` (Arabic kaf) | works (normalised) |

- **Impact:** Latin digits, Arabic-Indic digits, space vs ZWNJ and `co2` all fail on a catalogue whose titles use Persian digits and ZWNJ.
- **Also:**
  - `deFa` strips Arabic-Indic digits (`[^0-9]` removes them) rather than converting them. Phone, price, OTP and card all get an empty value from an Arabic keyboard.
  - `catalog.search` is logged on every keystroke: 14 log rows for 14 key events. Each one rewrites the whole `db.json`.
- **Fix:**
  - Normalise both haystack and needle: map `٠-٩` and `۰-۹` to `0-9`, ي→ی, ك→ک, remove ZWNJ and spaces, lowercase, `CO₂`→`co2`.
  - Add `٠-٩` to `deFa`.
  - Debounce the search log (about 800 ms) and log only the final query.
- **Effort:** S. **Type:** SAFE.

## P13. Order numbers collide (Medium, code-verified)

- **Where:** shop:4061-4064. The suffix is `1000 + rand*9000`, 4 digits per month. `server:110` POST does not reject an existing `id`.
- **Impact:** about 13% collision chance a month at 50 orders, about 42% at 100. I confirmed the server stores duplicate ids (`POST /orders {id:'DUP-1'}` twice gives 2 rows). The panel and shop `find()` the first row, so customer A can open customer B's invoice and the admin edits the wrong order.
- **Fix:** server-assigned sequential order number. Return 409 on a duplicate id. Use longer random suffixes for request codes.
- **Effort:** S. **Type:** SAFE.

## P14. PATCH is an upsert, so deleted records come back as stubs (Medium, verified)

- **Where:** server:112-120, panel `setStage` panel:746 and `assignTech` panel:703.
- **Repro:** `PATCH /orders/GHOST-9 {stage:4}` creates a fresh order `{id, stage:4, status:'active'}` with no items, customer or total. Real case: admin tab A deletes an order, stale tab B (up to 10 s old, since the panel only polls every 10 s) changes its stage, and the order reappears empty.
- **Related:** the panel's read-modify-write of `statusHistory` from a stale local copy loses entries when two admins act at once.
- **Fix:** `PATCH` returns 404 for a missing id (only `PUT` creates). Use `updatedAt` / If-Match checks. Append history server-side.
- **Effort:** S. **Type:** SAFE.

## P15. Used-equipment service: identity and workflow (Medium, verified)

- **Where:** the seed `db.json` has service title "تعمیر تجهیزات / تجهیزات خود را به ما بسپارید" (repair). The shop's `DEFAULT_SERVICES` (shop:3306) says "فروش تجهیزات" (sale). The form says "ثبت پیشنهاد فروش". The panel calls it "تجهیزات" (panel:253). The overview legend uses yet other labels (panel:491).
- **Gaps:**
  - Once `db.json` is served, the shop home shows "تعمیر تجهیزات" but the form is a sell-your-equipment offer. A customer with a broken device would submit a "sale offer".
  - Photos are collected but not stored (same as P4).
  - The admin's only price field is the same `price` the customer proposed. `requestForm` (panel:715-718) overwrites it, so the original offer is lost, and there is no counter-offer or accept/decline state. The final stage "تکمیل شد" covers accept, reject and cancel alike. The shop promises "پذیرش، رد یا مذاکره" (shop:4436).
  - The `used` stage names "در حال بررسی → قیمت‌گذاری" are fine, but nothing records who quoted what.
- **Fix:**
  - Decide: repair, buy used, or both. Align the seed `db.json`, the shop copy and the panel.
  - Add `offeredPrice` (admin) separate from `askingPrice` (customer), plus outcome states (accepted, rejected, countered).
  - Persist photos.
- **Effort:** M. **Type:** DECISION.

## P16. Discount code (Medium, verified)

- **Where:** shop:4340 `code === 'EMDAD10'`, shop:3849 `min(round(subtotal*0.10), 500000)`, placeholder shop:2041.
- **Issues:**
  - The code is advertised in the input placeholder, so every customer uses it, with unlimited reuse by the same user.
  - It is client-only and not managed in the panel.
  - The ۵۰۰٬۰۰۰ cap is silent. A ۶٫۹M cart shows 10% off but gets ۴۹۰k less than expected. I checked: total ۶٬۴۰۰٬۰۰۰ instead of ۶٬۲۱۰٬۰۰۰.
  - The error "نامعتبر یا منقضی" implies expiry that does not exist.
  - The server trusts the client total.
- **Fix:** server-side `coupons` collection (code, type, value, cap, minimum, expiry, usage limit, per-user limit). Panel CRUD. Show the cap in the UI. Recompute on the server. Remove the placeholder hint.
- **Effort:** M. **Type:** DECISION (do you want coupons at all, and the rules).

## P17. Shipping and payment copy contradictions (Medium, verified)

- **Where:** shop:1728 and shop:2169 ("هزینه ارسال: هماهنگی تلفنی"), shop:2118 and shop:2192 ("جهت هماهنگی پرداخت و زمان تحویل…").
- **Issue:** the total never includes a delivery fee, yet payment is taken online up front. Right after a successful payment the order page tells the customer "همکاران ما برای هماهنگی پرداخت تماس می‌گیرند". Which is it: is delivery free, is it paid in cash on delivery, or is there an extra online charge later?
- **Fix:** pick a rule (free, fixed, per-zone) and put it in `cartTotals`. Remove the "coordinate payment" sentence for paid orders.
- **Effort:** S. **Type:** DECISION.

## P18. Admin phone search fails (Medium, verified)

- **Where:** the shop stores `phone: "0912 345 6789"` (with spaces, built at shop:3897) in `users`, `orders` and `serviceRequests`. Panel `match` at panel:393 and the orders and requests tables use it as-is.
- **Repro:** panel orders, search `09123456789` gives 0 rows. `۰۹۱۲` gives 1 row, so the failure is the spaces. Also Arabic-Indic input is not handled.
- **Fix:** store a normalised `phone` (E.164 or 11 digits) next to a display field. In `match`, normalise both sides (strip spaces, convert all digit scripts).
- **Effort:** S. **Type:** SAFE.

## P19. Payments and revenue (Medium, code)

- **Where:** shop:3434-3437, panel:539-545 (status column hard-coded "موفق" at panel:542), panel:460.
- **Issues:**
  - Cancelled and failed payment attempts are only logged as activity, not stored. There is no failed, cancelled or pending payment record.
  - The simulated gateway has no decline or timeout path. Expiry is not checked against today: I paid with `01/28`, and `01/99` is also accepted (shop:4043).
  - Revenue includes cancelled orders (P8) and is not net of refunds.
  - Deleting an order keeps the payment row, and clicking it toasts "سفارش پیدا نشد" (documented, but it is a dead link).
- **Fix:** payment status machine (`initiated`, `paid`, `failed`, `cancelled`, `refunded`), written by the server. Net revenue. Disable the link when the order is gone.
- **Effort:** M. **Type:** DECISION (needs the real gateway design).

## P20. Visible but non-functional (Medium, verified)

- **SMS:** the UI says "کد تأیید پیامک شد", "کد پیگیری برای شما پیامک شد", "پیامک تأیید برای شما ارسال شد", "نتیجه با پیامک اطلاع‌رسانی می‌شود" (shop:1989, shop:2112, shop:3889, shop:4435-4436). No SMS exists. The OTP and tracking code are never delivered.
- **Map pin:** the button "📍 انتخاب موقعیت روی نقشه" in the refill form (shop:1908) toasts "در نمونه بعدی" (shop:4289). Address creation has the same dev-speak toast "MapPicker در نمونه بعدی" (shop:4288).
- **Contact sheet:** the address is "نشانی دقیق از طریق تماس تلفنی" and the map query is a generic string (shop:3472-3480, TODO(content)).
- **Footer:** "نسخه پیش‌نمایش PWA" (shop:2293). The gateway and OTP hint text are demo copy.
- **Test card:** the payment page prints a test card number.
- **Fix:** hide or gate these for production, or finish them. Change the SMS claims so they are true.
- **Effort:** S to hide, L for real SMS. **Type:** DECISION.

## P21. Account data not restored on another device (Medium, verified by code)

- **Where:** the pull (shop:3314-3366) restores only `orders` and `requests` from the DB. `carts`, `wishlists` and `addressBooks` are written (shop:3418-3431) but never read back.
- **Impact:** "same account on any device" (shop:3322 comment) only holds for orders and requests. A customer's saved addresses, cart and wishlist are lost on a new device even though the DB holds them.
- **Fix:** restore addresses (and optionally cart and wishlist) on login. Merge with local entries.
- **Effort:** M. **Type:** DECISION on merge semantics. Restoring addresses is SAFE.

## P22. Product and service admin (Medium, code)

- **Where:** `saveProduct` panel:751-761, `productForm` panel:644-663.
- **Issues:**
  - Blank stock saves as 0 with no error (`Math.round(+'') = 0`, and the form is `novalidate`), which silently marks the product "ناموجود". Price blank is caught.
  - No upper bounds (price and stock accept 10^15) and duplicate titles are allowed.
  - `type=number` inputs may drop Persian or Arabic digits typed from a phone keyboard (not tested on a device; verify on iOS and Android). Add `inputmode="numeric"` text fields normalised with the same digit function.
  - New accessories default to the `cyl` icon (`art:'cyl'` default regardless of category).
  - There are no product photos: only four SVG archetypes.
  - `logAdmin` (panel:340) records only the title for price and stock edits, with no before/after. It is not awaited, and the actor is hard-coded `admin`. Price and stock changes are not auditable.
  - `sort` defaults to `products.length+1`, which can collide after deletes.
  - "Hide" means the product disappears but stays in carts until the next pull (P1, P7).
- **Fix:** validate stock like price. Normalise digits. Log `{field, from, to}`. Choose default art by category. Plan real images.
- **Effort:** S (validation, logging), M (images). **Type:** SAFE except images (DECISION).

## P23. Missing must-have admin features (Low, product gaps)

None of these exist today:
- CSV export of orders and payments for accounting. Only a raw `db.json` download exists (panel:771).
- Create an order manually (the business is phone-driven: "هماهنگی تلفنی" appears throughout).
- Internal admin notes on orders and requests.
- Click-to-call (`tel:`) on customer and technician phones.
- Filters by date, payment status or technician, plus sort and pagination (the tables render every row).
- Low-stock threshold per product (hard-coded ≤3 at panel:351).
- Customer-facing notifications on every status change.
- Admin identity, so the activity log shows who did what.
- Back-in-stock notification (the "ناموجود" button is simply disabled).
- Order edit cannot change items or totals, and editing the address or time after payment gives the customer no notice.

**Effort:** M to L. **Type:** DECISION (prioritise).

## P24. Storage and scale (Low, code)

- **Where:** `save()` rewrites the entire `db.json` on every write (server:55-65).
- **Issues:**
  - Every cart tap, search keystroke and page view writes `carts` / `activity`.
  - Every anonymous device creates permanent `guest_*` rows in `carts`, `wishlists` and `addressBooks`.
  - The server never trims `activity` (only the browser mirror is capped at 400).
  - Photos as base64 inside the JSON will make the file huge once P4 is fixed.
- **Fix:** move to SQLite or Postgres, or at least stop persisting carts and activity for guests. Cap activity. Paginate lists.
- **Effort:** M. **Type:** DECISION.

## P25. Smaller edge cases (Low)

- **Wishlist, cart and detail:**
  - `addToCart` can write `{id:0}` if stock drops to 0 between render and tap (shop:3810), leaving a ghost line.
  - Detail-page quantity can ask for more than remains after items already in the cart; it silently caps.
- **Auth:**
  - Returning users must retype first and last name at login, and the typed name overwrites the stored or admin-edited name (shop:3900-3903).
  - The OTP field slices to 6 characters before normalising, so pasting "123 456" does not auto-submit.
  - Phone is stored with spaces (see P18).
  - Auth wording: `validPhone` accepts `98…` prefixes but `userIdOf` assumes the last 10 digits. Fine, but there is no uniqueness handling for landline-style typos.
- **Checkout and pay:**
  - Pay button gets a new amount if the pull changes prices mid-entry, with no warning.
  - Card expiry is not checked against the current date (see P19).
  - A product deleted between "pay" and the 1.2 s commit could create a paid order with zero lines (race; shop:4067 would throw on `p.title`).
- **Panel:**
  - Overview request pipeline labels (panel:491) differ from `STAGES` used in the drawer.
  - `reset` and "داده و تنظیمات" pages are offline-only.
  - Stage chips write immediately with no undo.
  - Customer "خرید" sums paid orders including cancelled ones (panel:564).
  - The 10 s poll re-renders the table, which can steal row focus.
- **Server:**
  - `DELETE` on duplicate ids removes only the first match.
  - CORS and rate limiting are absent.
  - `Content-Type` is not checked.

---

## What works well (so reviewers do not "fix" it)

- Stock cap is enforced at the cart `+` button and the detail page, with a visible denial.
- Phone input normalises Persian digits and strips spaces for the login form.
- Luhn check, CVV, month and masked-card storage; no full PAN, CVV or PIN is persisted.
- Admin edits and deletions propagate to the customer app within 15 s or on tab focus (verified for stage, cancel and deletion of an account).
- Technician create, rename (propagated to orders) and assign flow works end to end for orders.
- Product/service CRUD, search and stage badges work.

## Suggested order of work

1. **This week (all SAFE, all S):** P1, P5, P7, P10, P12, P13, P14, P18, P22 validation, and the P4 persistence of address and delivery type.
2. **Next:** P3 (outbox and server-acknowledged commit) together with the P2 order endpoint, because both change how the order is committed.
3. **Needs a product call before engineering:** P8 (refunds and cancel), P9 (legal transitions), P11 (technician model), P15 (what the used-equipment service is), P16 (coupons), P17 (shipping), P20 (what to cut vs build).
4. **Go-live gate:** P6, plus P19 and P24 once real money and volume arrive.
