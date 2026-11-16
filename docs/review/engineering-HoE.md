# HoE review: Emdad Oxygen shop (branch under-review)

Scope: server.js (162 lines), panel/index.html (script from line 232 to 859), shop template.html (unpacked: DB layer at lines 3247-3470, order commit at 4040-4085). Read-only review. Nothing in the repo was edited.
SAFE = no behaviour change for legitimate users, fine inside the refactor. DECISION = changes behaviour or needs a product, ops or hosting call.
Line refs: S = server.js, P = panel/index.html, T = shop template.html.

## Verified by experiment (node v22)
- `decodeURIComponent('/%zz')` throws URIError. serveStatic calls it synchronously inside the http handler (S:128), so a single GET /%zz kills the process.
- `fs.stat('x\0y', cb)` throws synchronously (ERR_INVALID_ARG_VALUE). GET /%00 reaches S:132 the same way and also crashes the process.
- `new URL(req.url, base)` throws on some malformed request targets (S:150). That is a third crash path.

## Summary table
| ID | Sev | Where | One-liner | Effort | Class |
|---|---|---|---|---|---|
| E1 | critical | S:128,132,150 | Unauthenticated remote crash (malformed %-encoding, NUL byte, bad URL) | S | SAFE |
| E2 | critical | S:89,96, T:3364 | Whole DB (users, phones, sessions, addresses, orders, photos) readable by anyone, and polled by every shopper | M | DECISION |
| E3 | critical | S:100-121 | No authentication or authorization on any write: anyone can delete or alter any order, user or product | L | DECISION |
| E4 | high | S:93-120 | Stale index race: `idx` is computed before `await readBody`, then used after it (corrupts the wrong record) | S | SAFE |
| E5 | high | S:130-131 | Static server exposes `.git/*`, `server.js`, `db.json` and `db.json.tmp`. The dot-file check only looks at the basename | S | SAFE |
| E6 | high | P:244,847, README | Admin password hardcoded in client JS, printed on the login screen, and in the README | M | DECISION |
| E7 | high | P:642 | Stored XSS: `s.type` unescaped (the only unescaped interpolation I found) | S | SAFE |
| E8 | high | T:4065, S:109-113 | Order numbers are random 4 digits per month (collisions), and POST does not reject duplicate ids | S/M | SAFE (server 409), DECISION (id format) |
| E9 | high | S:56-67 | Persistence failure is swallowed, and API still answers 200 (silent data loss). A corrupt db.json is silently replaced by an empty DB | S | SAFE |
| E10 | high | P:312,329-337 | Panel silently falls back to the localStorage mirror when one fetch fails, and never goes back online. Later admin edits never reach db.json | S/M | SAFE |
| E11 | med | S:114-121 | PATCH/PUT upsert resurrects deleted records as ghost partial records | S | DECISION |
| E12 | med | S:109-111 | Client controls `createdAt` and `id` type on POST (`...body` after defaults), and ids are not coerced to string | S | SAFE |
| E13 | med | S:77, S:106 | Body-limit handling: `req.destroy()` before the 400 is sent. No Content-Type check, which allows no-preflight CSRF via `text/plain` | S | SAFE |
| E14 | med | S:149-162 | `listen(PORT)` binds all interfaces; no CORS policy, no security headers, no HEAD handling in api | S | DECISION (bind), SAFE (headers) |
| E15 | med | T:3433-3436, P:543,460 | Payments are client-asserted. The panel's "paid revenue" is whatever the browser POSTed. The payments table hard-codes the badge "موفق" for every status | S | SAFE (badge), DECISION (trust) |
| E16 | med | P:855, T:3402, S:89 | Polling pulls the entire DB (including base64 photos) every 10 s (panel) and every 15 s (each shopper), then the panel re-renders the whole app via innerHTML | M | SAFE |
| E17 | med | P:742-750, 702-703, 695 | Read-modify-write of `statusHistory` from stale in-memory DB: lost updates. Tech rename is a sequential, non-atomic PATCH loop | M | DECISION |
| E18 | med | P:791,798-806 vs 329 | Delete "cascades" are only claimed in confirm texts. Nothing cascades server-side; they depend on the shop's dbPull heuristics | M | DECISION |
| E19 | med | T:3340-3355 | Shop treats "missing in DB" as "admin deleted it", so a failed POST (no retry queue) makes a customer's order vanish locally after 2 min | M | DECISION |
| E20 | med | P:849-857 | Logout leaves `onhashchange`, so a hash change re-renders the dashboard over the login screen. `storage` listener is added on every login | S | SAFE |
| E21 | med | whole repo | Stock is never decremented on order, so the shop can oversell. Prices and totals come from the client | M | DECISION |
| E22 | low | duplication | Same data layer (applyLocal, ensure, COLS, STAGES, write/probe) written 3 times with drift | M-L | SAFE if behaviour-preserving |
| E23 | low | P:337,323 | After a server write, `applyLocal` fakes the result locally: POST id differs from the server's UUID until next poll | S | SAFE |
| E24 | low | misc | Dead code, minor bugs, maintainability notes (listed below) | S | SAFE |
| E25 | low | repo | `db.json` is committed and not git-ignored: live customer data will be committed. `db.json.tmp` is ignored, `db.json` is not | S | DECISION |

## Findings in detail

### E1 critical: remote process crash (DoS)
- Where: S:128 (`decodeURIComponent(urlPath)` runs synchronously in the http handler), S:132 (`fs.stat` with a NUL byte throws synchronously), S:150 (`new URL`). The `.catch` at S:153 only wraps `api()`, so none of these are caught. There is no `process.on('uncaughtException')`.
- Repro: `curl localhost:3000/%zz` and `curl localhost:3000/%00`.
- Fix: wrap the whole handler body in try/catch and answer 400. In serveStatic, `try { rel = decodeURIComponent(...) } catch { 400 }`, and reject a `rel` containing `\0`. Add `req.url` parsing inside the try. Also add `fs.createReadStream(...).on('error', ...)` at S:145, because a vanishing file currently throws an unhandled stream error. In api(), `decodeURIComponent(rawId)` at S:92 turns a bad id into a 500; it should be a 400.
- Effort S. SAFE.

### E2 critical: GET /api/db and every collection are world-readable
- Where: S:89 (`GET /api/db`), S:96-99 (collections and `/:id`), T:3364 (every shopper downloads the full DB every 15 s: `fetch(DB_API + '/db')`), P:312.
- Problem: any visitor gets all users (phones, names, login counts), sessions with deviceIds, address books (home addresses), orders, service requests (with photos as data URLs), payments (masked cards) and the activity log. The shop only needs the catalogue, plus its own records.
- Fix, minimal and without a new auth system:
  1. Public `GET /api/catalog` returns only `products` and `services`.
  2. The shop's dbPull stops calling `/api/db`.
  3. Everything else needs the admin credential (see E3/E6).
- A user-scoped read for the shop needs some form of proof of identity. Today identity is "whatever phone you typed", so it needs a product decision.
- Effort M. DECISION (changes what the shop can read, and requires E3).
- Cheap interim: remove `GET /api/db` for non-localhost callers. Note that static `/db.json` has the same exposure (E5).

### E3 critical: no authentication or authorization on writes
- Where: S:100-121. Any client can DELETE, PATCH or PUT any record in any collection, including `products` (set price to 1, or delete the catalogue), `orders` (mark paid), and `users`.
- Problem: all the "security" is client-side (the panel gate at P:849 is only a JS comparison). The shop also writes `sessions` and `payments` directly (T:3433-3436, 3458-3466), so the server cannot tell the shop from an attacker.
- Fix (minimal, non-breaking in shape):
  - Add a server-side admin token (env `ADMIN_TOKEN`, sent as `Authorization: Bearer`). Require it for DELETE on everything, and for any write to `products`, `services`, `technicians`, and PATCH/PUT on `orders`/`serviceRequests`/`users` (stage, technician fields).
  - Leave customer-originated POSTs (orders, serviceRequests, activity) open but validated (E8, E12, E15).
  - A real fix needs OTP sessions issued by the server and per-user scoping. That is a product and architecture decision.
- Effort L. DECISION. At minimum, document in the README that this build must not be exposed publicly.

### E4 high: stale index race in PUT/PATCH/POST (data corruption)
- Where: S:93 computes `idx` synchronously, S:106 then does `await readBody(req)`. After that await, S:114-120 uses `idx`, `created`, and `list[idx]`, even though other requests may have mutated `list` in between.
- Failure modes:
  - Request A (PATCH record at idx 5) is awaiting its body. Request B deletes record 2. A resumes and does `list[5] = rec`, overwriting a different record (the one that moved into slot 5) and leaving two records with A's id.
  - Two concurrent PUTs for a new id both see `idx < 0` and both push, giving a duplicate id.
  - `list[idx]` can be undefined after a delete, so `list[idx].createdAt` throws (500).
- This is realistic: the shop fires several writes at once (`dbSync` fires PUTs and POSTs without awaiting).
- Fix: move the `idx` computation (and `now`) to after `readBody`, just before use. Safest is a small `find(list, id)` helper called at the point of mutation.
- Effort S. SAFE.

### E5 high: static server exposes repository internals and the live DB
- Where: S:130-131. The dotfile test is `path.basename(file).startsWith('.')`, so it only blocks files whose own name starts with a dot. `/.git/config`, `/.git/HEAD`, `/.git/objects/...` have basenames like `config`, so they are served. `/server.js`, `/package.json`, `/README.md`, `/db.json` (the entire DB including users) and `/db.json.tmp` are served as well.
- Fix: check every path segment for a leading dot. Replace ROOT-wide serving with an allowlist: `/`, `/index.html`, `/shop/*`, `/panel/*`. For `/db.json` (the panel and app read `../db.json` as the seed catalogue when offline, P:315), serve a sanitized `{products, services}` view from the server instead.
- Effort S. SAFE for the segment check and the allowlist. The `/db.json` sanitization is SAFE if it keeps the products/services shape the panel seeds from (P:314-318).

### E6 high: hardcoded admin password in client code, displayed on the login page
- Where: P:244 (`ADMIN_PASS = 'emdad'`), P:847 (the hint literally prints the password in the login form), README table, git history (commit 1f1076c "change admin password to emdad").
- Problem: anyone viewing source or the login page is admin of the dashboard. Combined with E3 it is moot anyway, since the API needs no password at all.
- Fix: remove the printed password from the UI and README at minimum. A real fix is server-side auth (`POST /api/admin/login` comparing against an env var, returning a token that the panel sends on writes).
- Effort M (server-side login plus panel changes). DECISION. The demo gate is disclosed in P:241 and P:847, so this may be deliberate for a prototype. Removing the on-screen hint is SAFE but is a visible change, so get sign-off.

### E7 high: stored XSS in the customer drawer
- Where: P:642: `({ signup: ..., login: ..., logout: ... }[s.type] || s.type)` is concatenated into HTML without `esc()`. `sessions` is written by any client (S:100-121, no auth), so `type: '<img src=x onerror=...>'` runs in the admin's browser when they open that customer, and can then call the unauthenticated write API as the admin.
- Fix: `esc(...)` around the whole expression.
- Efficient defence in depth: harden `esc` callers by switching to a `h` tagged template that escapes by default (see E22). Also add a CSP header or meta tag (`default-src 'self'; script-src 'unsafe-inline'`) for the panel.
- Effort S. SAFE.
- esc() coverage audit (everything else checked and OK): table cells at P:517-570 all pass user fields through `esc()`; numeric fields go through `fa()`/`toman()` (these coerce through `Number`, so they are safe); `head(title)` callers all escape (P:619,629,639,714,716); `confirmBox(text)` callers escape ids and titles (P:791,798-806); attribute values (`data-id`, `value=`) all use `esc` and `esc` escapes quotes. Residual risks: `when()` returns the raw value `t` in its catch branch (P:298; unreachable in practice because `toLocaleString` does not throw on bad dates, but it should return `esc(t)` anyway), and `recordForm` interpolates `title` raw (P:708; callers pass static strings plus `esc(id)`).

### E8 high: order-number collisions and duplicate ids
- Where: T:4065 (`'EO-' + yyyymm + '-' + random 4 digits`) and S:109-111 (`id: body.id || randomUUID()`, `list.push`, no uniqueness check). The shop POSTs orders with `id: o.no` (T:3433) and requests with `id: r.code` (T:3441). Payments use `id: o.payRef`.
- Problem: random 4-digit suffix per month gives a ~50% chance of at least one collision at roughly 120 orders a month, and two customers can get the same number even earlier. The server then happily stores two records with the same id. The panel's `find` (P:617) shows the first one, `PATCH /orders/:id` updates the first one, and DELETE removes the first one. One customer's order status shows on the other's account. dbPull maps by `d.id` too (T:3350).
- Fix:
  1. Server: on POST with an `id` that already exists, answer 409 (or make the POST idempotent: return the existing record when the content matches).
  2. Shop: generate order numbers from a larger space (for example 6-8 chars, or a server-issued sequence).
  3. A server-issued sequence needs the server to be the allocator, which is a design decision.
- Effort S for 409, M for the id format. 409 is SAFE (the shop does not currently retry POSTs, but check `dbWrite` callers if added later). The id format is a DECISION because order numbers are customer-visible.

### E9 high: swallowed persistence errors, destructive corrupt-file handling
- Where: S:61-63. `writeFile` or `rename` errors are only logged and the promise resolves, so the caller at S:102/111/119 returns 200/201 for data that is not on disk. The in-memory DB and the file diverge permanently until restart (then the lost writes are really gone).
- Also S:49-51: if db.json fails to parse, the server logs and starts with an EMPTY db. The first write then atomically overwrites the corrupt file, destroying the only copy.
- Also: no write on shutdown (no SIGTERM/SIGINT handler awaiting `writing`).
- Fix:
  - Make `save()` reject on error and have `api()` return 500. Also roll back the in-memory mutation, or at least fail loudly.
  - On corrupt load: rename the bad file to `db.json.corrupt-<timestamp>` before starting empty, or refuse to start.
  - On SIGINT/SIGTERM: `await writing` then exit.
- Effort S. SAFE (error paths only).

### E10 high: panel silently degrades to the localStorage mirror
- Where: P:312 (`load()`: on any fetch error or a non-JSON body sets `ONLINE = false`), P:332 (a failed write only toasts). Once ONLINE is false it is never re-probed (only `start()` probes, P:852).
- Problem: one transient server hiccup (restart, timeout) during the 10-second poll makes the panel permanently offline. Every later admin edit is saved to the browser's localStorage only (P:336), the UI says success, and db.json never receives it. The shop (online) never sees the change.
- Fix: do not flip ONLINE on a load error. Keep ONLINE, show an "offline, retrying" indicator, and retry. Also check `r.ok` before `.json()` at P:312 (an error JSON currently gets passed to `ensure()` as if it were the DB).
- Effort S/M. SAFE.

### E11 med: upsert semantics create ghost records
- Where: S:114-121. PATCH and PUT create the record if the id is missing (`created`), and the panel's PATCH writes for stage, technician and edit actions use PATCH. If a record was deleted (or never existed, such as a stale tab), PATCH creates `{id, createdAt, updatedAt, ...partial}`: a headless "order" with only `stage:3` and no items, customer or total, which then shows in the orders table as a blank row.
- Fix: PATCH on a missing id returns 404. Keep PUT as create-or-replace.
- Effort S. DECISION: the shop relies on PATCH-creates for users (T:3464: `res.created ? 'signup' : 'login'`). Whoever changes this must update that call to PUT-create or add an explicit upsert flag.

### E12 med: client-controlled id and createdAt, id typing
- Where: S:110: `{ id: body.id || randomUUID(), createdAt: now, ...body }`. The `...body` last means a client can set its own `createdAt` (backdating revenue, activity, and the panel's 14-day chart) and `id` can be a number, object or empty string. `body.id = 0` becomes a UUID, an object id yields `"[object Object]"` in comparisons. PUT/PATCH (S:117) allow `createdAt` override on PATCH.
- Fix: coerce `id` to a non-empty string (`String(body.id)`), enforce a length and charset cap, and put `createdAt: now` after `...body` (or strip it).
- Effort S. SAFE.

### E13 med: body handling and CSRF surface
- Where: S:77 and S:106. On overflow it calls `reject()` then `req.destroy()`, so the 400 at S:106 is written to a destroyed socket and the client just sees a reset. `readBody` ignores Content-Type, so a malicious page can POST JSON as `text/plain` (a CORS "simple request", no preflight) to an internal-network or localhost server and create records (orders, users, activity). PUT/PATCH/DELETE need a preflight, which fails because no CORS headers are sent (good; do not add `Access-Control-Allow-Origin: *` without E3).
- 8 MB limit is large for an unauthenticated endpoint; each accepted request also rewrites the whole DB (E16).
- Fix: require `Content-Type: application/json` on writes (415 otherwise), and drain rather than destroy on overflow so the 413 is delivered. Consider a per-collection limit (8 MB only for `serviceRequests`).
- Effort S. SAFE (both apps send application/json).

### E14 med: network exposure and headers
- Where: S:158 `server.listen(PORT)` binds 0.0.0.0, so on a laptop or LAN everyone nearby has E2/E3. No `X-Content-Type-Options`, no CSP, no `Referrer-Policy`. `.js` is served without charset (S:125). `HEAD` on `/api/*` falls to 405.
- Fix: `listen(PORT, process.env.HOST || '127.0.0.1')` is DECISION (a deployment may rely on LAN access). Headers are SAFE: add `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a CSP for the panel.
- Effort S.

### E15 med: payments and revenue are client-asserted
- Where: T:4048 (`payRef` is `Math.random()`), T:3435 (the shop POSTs `status:'paid'`, `amount`), P:460 (revenue = sum of `payments` where `status==='paid'`), P:542 (the payments table renders a hard-coded green "موفق" badge for every payment regardless of status).
- Problem: gateway is simulated by design (the shop says so, T:2631), but the dashboard presents these numbers as real revenue. Anyone can POST fake paid payments and inflate revenue. Even in the prototype, the table's hard-coded badge is wrong for any non-paid status.
- Fix: P:542, render the badge from `p.status` (SAFE). Real payments need a server-side gateway callback (DECISION, product scope).
- Effort S (badge).

### E16 med: performance of polling and full re-render
- Where: P:855 (every 10 s: `load()` fetches `/api/db`, then `render()` replaces `#app.innerHTML`), T:3402 (each shopper every 15 s fetches the whole `/api/db`), S:56-58 (every write does `JSON.stringify(db, null, 2)` of the whole DB, and writes the whole file).
- Problem: the DB holds base64 photos (up to 8 MB per request, S:34), `sessions` and `activity` that grow forever, and every client downloads all of it on every tick. The panel re-renders and re-parses everything even when nothing changed, which also resets table scroll within overflow containers and any text selection. Each search keystroke does a full re-render (P:838). With N shoppers the server serves N x 15 s full dumps.
- Fix (minimal, SAFE):
  - Use `meta.updatedAt` (already maintained, S:57) with `If-None-Match`/ETag or a cheap `GET /api/meta`, and skip the fetch and render when unchanged.
  - Compare `JSON.stringify` before re-rendering in the panel (or skip render when the response is identical).
  - Debounce the search input (150 ms).
  - Stop pretty-printing the DB (`JSON.stringify(db)` without indent) or at least do not block the event loop for large DBs.
  - Cap `activity` and `sessions` server-side (the shop mirror already caps at 400, T:3284), or archive.
  - Move photos out of JSON into files (M/L, DECISION).
- Effort M.

### E17 med: lost updates on array and counter fields
- Where: P:744-746 (`statusHistory` is read from the panel's in-memory copy and written back whole via shallow-merge PATCH, so two admins or an admin and the shop overwrite each other's history), P:702-703 (same for assignment), P:695 (renaming a technician issues N sequential PATCHes; a failure midway leaves orders with mixed names), T:3464 (`loginCount: prevCount + 1` computed from a local mirror).
- Fix: server-side append endpoint, for example `POST /api/orders/:id/history` or a `$push` style PATCH body, and compute `loginCount` on the server. Alternatively add `If-Match`-style optimistic concurrency using `updatedAt`.
- Effort M. DECISION (API shape).
- Also denormalised `technicianName` on orders (P:695,703) is a duplicate source of truth. Prefer storing only `technicianId` and resolving the name at render time (SAFE for the panel; the shop's order view would need to join).

### E18 med: delete cascades are only described, not implemented
- Where: P:791 says deleting a product removes it "from customers' carts"; P:798/800 say deleting an order/request removes it from the customer's list "in the app"; P:802 says a deleted user is logged out; P:806 says technicians' orders keep their name.
- Reality: the server and the panel delete exactly one record. The behaviour relies on the shop's `dbPull` heuristics (T:3329 logout when the user vanishes, T:3357-3361 cart pruning, T:3344 local-missing-in-DB inference). The `carts` and `wishlists` records in the DB keep the dead product id forever. Deleting a user leaves `carts`, `wishlists`, `addressBooks`, `sessions`, `activity` rows behind (personal data retention problem). Deleting an order leaves its `payments` record pointing to a missing order (documented as intentional at P:798, fine).
- Fix: either implement the cascade in one server place (for users: remove their carts, wishlists, addressBooks, sessions), or at minimum make the confirm texts accurate. Product ids referenced by `carts` and `orders.items` are stored by title snapshot in orders (T:4070), so orders are safe.
- Effort M. DECISION (what to retain for audit).

### E19 med: shop drops local records that the server never got
- Where: T:3339-3347. A local order or request not present in the DB is dropped once more than 2 minutes old, on the assumption that an admin deleted it. `dbWrite` has no retry (T:3289-3299; a failed fetch resolves to `null`), so if the server was unreachable at checkout the customer's order silently disappears from their app after 2 minutes, while they were told it was placed (and the payment record is also lost).
- Fix: keep an outbox of unsent writes in localStorage and retry on `online`/next poll. Only treat "missing in DB" as deleted for ids in `_dbStored` (this is the existing intent; the 2-minute grace branch is what breaks it).
- Effort M. DECISION (offline behaviour).

### E20 med: logout and listener leaks in the panel
- Where: P:780 (`logout` calls `boot()` which renders the login form, but `window.onhashchange = route` stays), P:853-855.
- Problem: after logout any hash change (back button, clicking a link) calls `route()` and `render()`, drawing the full dashboard from the still-in-memory `DB` over the login screen. `start()` adds a new `storage` listener on every login without removing the old one (P:854), so listeners accumulate and each fires a render.
- Fix: in `logout`: `window.onhashchange = null`, `DB = null`, remove the storage listener (keep a handle), `clearInterval(POLL)`. Register the storage listener once.
- Effort S. SAFE.

### E21 med: oversell and client-trusted pricing
- Where: T:4059-4082 (`_commitOrder` snapshots price and totals from the client's `PRODUCTS`, never decrements or checks `stock`; the stock check is UI-only, T:3860,4094). The panel's stock badge (P:549) therefore never moves from orders. An attacker can POST an order with any `total`.
- Fix: server-side `POST /api/orders` that recomputes totals from `products` and decrements stock atomically within the write queue. This changes the data flow, so it needs a product decision on whether stock is a hard limit. Until then the panel's "low stock" overview card (P:351,470) only reflects manual edits.
- Effort M-L. DECISION.

### E22 low: triplicated data layer, hand-rolled templating, no module structure
- Same logic exists three times and has already drifted:
  - `applyLocal` / `dbApplyLocal` / server PUT-PATCH (S:114-121, P:321-328, T:3274-3287): identical bugs repeated, including `list[idx].createdAt` on missing index.
  - Collections list: S:35, P:245, T:3256 (the shop's list lacks `technicians`, so the mirror has no such column, which is harmless today but proves drift).
  - `write` / `dbWrite`, `probe` / `_dbProbe` (the `github.io` special case is repeated at P:308 and T:3388), `ensure` / `dbMirror`.
  - Stage names and request kinds (P:248-253 vs the shop's `stepperVM`).
- The panel builds HTML by string concatenation with manual `esc()` at about 200 sites (E7 is the proof that this does not hold). Overlay and form code is long single-line concatenations (P:619-642 lines are 300-600 characters).
- Fix, behaviour-preserving, in order of value:
  1. Extract one shared `db-client.js` (local mirror, probe, write, applyLocal) used by both pages. The shop is a single-file bundle, so this needs the shop build step to be restorable (README says `build/` was removed on 15 Nov 2026). If the shop cannot be rebuilt, only the panel can be consolidated and the duplication has to be documented with a "keep in sync" comment and a shared test vector file.
  2. In the panel, introduce `h\`...\`` tagged-template escaping (escape by default, `raw()` for trusted fragments) and migrate the views. Eliminates the E7 class.
  3. Split the panel script into `data`, `views`, `actions` sections or ES modules. There is no build step, so use plain `<script type="module">` files.
  4. Add tests for the server (node:test, zero-dep): CRUD, concurrency (E4), malformed URLs (E1), traversal (E5).
- Effort M-L. SAFE only if validated by tests, because behaviour must not change.

### E23 low: panel local state diverges from server after writes
- Where: P:334, P:323. After a successful server POST the panel applies the write to `DB` with a locally generated `r_...` id (the server returned a UUID in the response body, which is ignored, `r.json()` is never read). The `logAdmin` activity row therefore has a different id locally than on the server until the next poll replaces `DB`. PUT/PATCH are unaffected because the id is in the URL.
- Fix: use the server response record when ONLINE (`DB[col]` replaced by the returned record). Ties in with E16 (skip full re-fetch).
- Effort S. SAFE.

### E24 low: dead code and small bugs (all SAFE, effort S)
- P:340 `logAdmin` is fire-and-forget (no await, errors are only a toast "ذخیره روی سرور انجام نشد" that can mislead the admin after a successful main write).
- P:343/P:350/P:528: `(DB.technicians || [])` and similar fallbacks are redundant, since `ensure()` creates every collection (P:304).
- P:349 `userOf` uses strict `===` while the rest of the file uses `String(...) ===`. P:790 `request-stage` does `x.id === el.dataset.id` (strict, breaks for numeric ids), also unused `kind` parameter in `setStage` for orders.
- P:596 `stageControl(kind, r, act)`: the `kind` for requests may be `undefined` (P:790 passes `r && r.kind`), falling back to order stage names silently for unknown kinds.
- P:393 `match`: `faD(k).includes(UI.q)` only converts the record to Persian digits, so a query typed in Persian digits against Latin-digit data fails; normalise both sides.
- P:565 customers table: `when({ at: u.lastLoginAt })` ignores `createdAt` fallback (fine) but `newest(...)` sorts by `lastLoginAt` first, so users who never logged in sort last.
- P:573 activity list is sliced to 300 only after a full sort of the unbounded array on every render.
- P:547 `(+a.sort || 999)`: `sort: 0` is treated as 999. P:758: a blank sort becomes `length + 1`, which can collide.
- P:815 `reset-ok` hardcodes a collection list that omits `technicians` (correct, but a third copy of the list; derive from COLS).
- P:827 `route()` always does `window.scrollTo(0,0)` after render, including for hashchange triggered by `go` with same view.
- S:106-108: an empty body on PUT/PATCH is accepted as `{}` (S:79 resolves `{}`), producing an empty record. Validate non-empty for PUT.
- S:125 `MIME` has no `.ico`/`.webp`/`.woff`; the `Content-Length` header is not set for static files; no `ETag`/`Last-Modified` (the `Cache-Control: no-cache` forces full 500 KB+ re-downloads of the 2 MB shop page unless the browser revalidates, which it cannot without validators).
- index.html at the repo root uses meta refresh plus `location.replace`, harmless.
- T:3473 TODO(content) placeholder address and T:2656,2665 TODO demo prices are still shipping.

### E25 low: runtime data tracked in git
- Where: `.gitignore` lists `db.json.tmp` and `node_modules/` but not `db.json`, and `db.json` is tracked (the seed). When `npm start` runs, real users, sessions, addresses and orders are written into the tracked file and one `git add -A` away from being committed and published (the README says the site is on GitHub Pages, which serves the repo files).
- Fix: keep `db.seed.json` tracked and git-ignore `db.json` (server copies the seed on first run), or add `skip-worktree` guidance. Changes the file layout and the README, and the `../db.json` fetch URLs in the apps (P:315, shop), so it needs a decision.
- Effort S. DECISION.

## What to do in this refactor (SAFE list, order of execution)
1. E1 crash guards (try/catch in handler, decode and NUL checks, stream error handler). Add a smoke test.
2. E4 move `idx` after `await readBody` (one-line change) plus a concurrency test.
3. E5 per-segment dotfile check and static allowlist (decide on `/db.json` first, see below).
4. E7 `esc()` on P:642, then switch the panel to escape-by-default templating (E22 step 2).
5. E9 fail-loud persistence, corrupt-file backup, graceful shutdown.
6. E10 keep ONLINE on transient failure, check `r.ok` in `load()`, retry.
7. E12 and E13 server input hardening (string ids, `createdAt` ordering, Content-Type, 413 delivery).
8. E20 logout cleanup. E15 payments badge from `p.status`. E23 use the server response.
9. E16 cheap wins (skip identical polls, debounce search, compact JSON, cap activity).
10. E22 server tests plus shared data layer (panel first, shop only if its build can be restored).

## Needs a product / ops decision before anyone touches it
- E2/E3/E6/E14 (the auth model: who may read and write what, whether this build is ever public-facing, bind address). Everything here is "prototype by design" per the README and P:241, so the decision is whether the repo is still a demo.
- E5 `/db.json` exposure: the panel and the shop use the static `../db.json` as the offline seed (P:315). Proposed fix is a sanitized seed, but GitHub Pages hosting (no server) will keep serving the committed file as is, so it must remain free of customer data (ties to E25).
- E8 order-number format (customer-visible), E11 PATCH-creates semantics (the shop's signup detection depends on it, T:3464), E17 history API shape, E18 cascade and retention policy, E19 offline outbox, E21 stock and server-side pricing, E15 real payment verification.

## Positive notes
- The write queue (S:55-67) does serialize file writes and snapshots data at call time, with a temp file plus rename. It is correct apart from E4/E9.
- Path traversal on `..` and encoded `%2e%2e` is blocked correctly (normalize, then `startsWith(ROOT + sep)`); the issues are what is inside ROOT (E5) and crashes (E1).
- Panel escaping discipline is good: one miss in about 200 interpolations (E7). `esc` itself escapes quotes, so attribute contexts are safe.
- Collections are whitelisted (S:90), so typos cannot grow the file, and prototype pollution through `{...body}` is not possible (spread defines own properties).
- The panel is accessible and thorough (focus management, ARIA, reduced motion).
