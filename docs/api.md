# API contract (server mode)

Applies when `server.js` is running. Static hosting (GitHub Pages / `file://`) keeps the old browser-only
mode; nothing below applies there.

All bodies are JSON. Errors are `{ "error": "<code>", "message"?: "<fa text>" }` with the status noted.

## Credentials
| Role | How to get it | How to send it |
|---|---|---|
| **admin** | `POST /api/admin/login {password}` → `{ token, expiresAt }`. Password = env `ADMIN_PASSWORD` (default `emdad`, with a startup warning). 5 failures / 10 min / IP → 429. | header `X-Admin-Token: <token>` |
| **user** | `POST /api/auth/otp {phone}` → `{ ok: true }`; then `POST /api/auth/verify {phone, code, firstName?, lastName?}` → `{ token, user, created }`. Code = env `OTP_CODE` (default `123456`, demo). Phone is normalised to `u_0XXXXXXXXXX` (10 trailing digits, Persian/Arabic digits accepted); the user record is created/updated by the server. 5 bad codes / 10 min / phone → 429. | header `Authorization: Bearer <token>` |
| **guest** | none | – |

Tokens live in server memory (12 h); a restart signs everybody out (clients must handle 401 by re-login).
`POST /api/auth/logout` (user token) and `POST /api/admin/logout` revoke the token.

## Endpoints
| Endpoint | guest | user | admin |
|---|---|---|---|
| `GET /api/health` | `{ ok, auth: true }` | ✔ | ✔ |
| `GET /api/catalog` → `{ products: [active only], services: [active only] }` (no admin-only fields) | ✔ | ✔ | ✔ |
| `GET /api/me` → `{ user, orders, serviceRequests, payments, cart, wishlist, addressBook }` (own records only) | – | ✔ | – |
| `GET /api/db`, `GET /api/<collection>[/<id>]` | – | – | ✔ |
| `POST|PUT|PATCH|DELETE /api/<collection>…` generic CRUD | see matrix | see matrix | ✔ (subject to the business rules below) |

### Write matrix for guest / user (anything not listed → 401 for guest, 403 for user)
| Collection | guest | user |
|---|---|---|
| `carts`, `wishlists`, `addressBooks` | `PUT` id `guest_*` only | `PUT` id == own `userId` or `guest_*` |
| `activity` | `POST` | `POST` |
| `sessions` | `POST` (type logout/login with `guest_`/own ids not required) | `POST` with own `userId` |
| `users` | – | `PATCH`/`PUT` own id, only fields `name`, `firstName`, `lastName` |
| `orders` | – | `POST` with `userId` == self (see *Orders*); `PATCH` own order only `{ cancelRequested: true, cancelReason? }` while `stage <= 2` and not cancelled |
| `serviceRequests` | – | `POST` with `userId` == self (ids unique, 409 on duplicate) |
| `payments` | – | – (server creates the payment record when an order is posted with `paid: true`) |
| `products`, `services`, `technicians` | – | – |

`userId` on a user write that does not match the token → 403. The server stamps `userId` itself on user POSTs.

## Orders (user `POST /api/orders`)
Body is the shop's order object plus `items[].pid`:
`{ id|no, items:[{pid,title,qty,line}], subtotal, disc, discCode, total, paid, payRef, payCard, … }`.
Server, in one atomic step (all or nothing, one `save()`):
1. every `pid` must exist, be `active !== false`, `qty` integer ≥ 1 and `qty <= stock`; else **409** `{ error:'out_of_stock', pid, available }` (or `404 unknown_product`);
2. recompute `line = price*qty`, `subtotal`, clamp `disc` to `[0, subtotal]`, `total = subtotal - disc`; store `stage:1`, `status:'active'`;
3. decrement `stock` of each product; append `statusHistory`;
4. if `paid`, create a `payments` record `{id: payRef, orderNo, userId, amount: total, status:'paid'}`;
5. duplicate order id → **409** `{ error:'duplicate_id' }` (client retries once with a new number).
Response `201 { record }` (authoritative values — the client must adopt them).

## Order / request lifecycle (enforced on every admin `PATCH`/`PUT` to `orders` and `serviceRequests`)
* `stage` is 1..4. It may only stay or advance by exactly **+1**. A regression or skip → **422** `{ error:'illegal_transition', from, to }`. A cancelled or completed (stage 4) record is read-only except `notes`, `technicianId`. Un-cancel is not possible.
* `status:'cancelled'` is allowed while `stage < 4`. For an **order**: the server restocks each `items[].pid`, sets `cancelledAt`, `cancelledBy` (`admin`/`customer`), clears `cancelRequested`, and if a payment exists sets it `status:'refund_pending'` (`refundDue = total`). `refund_pending → refunded` is an admin `PATCH /api/payments/<id> {status:'refunded'}` (only that transition).
* Customer cancel request (`cancelRequested:true`) is only a flag for the admin to act on; it does not cancel.
* Every accepted transition appends `{at, from, to, by}` to `statusHistory`.
* Stock writes (`PATCH /api/products/<id> {stock}`) must be integer ≥ 0; `price` integer > 0; validation failure → **422** `{ error:'invalid', field }`.

## Other generic rules
* `PATCH` on a missing id → **404**, except `users` (user token / admin) where it upserts (shop signup flow relies on `created`).
* `POST` with an existing id → **409**.
* Failed disk write → **500** `{ error:'write_failed' }` and the in-memory state is rolled back to what is on disk.
* No CORS headers are sent (same-origin only).

## Clarifications (found while implementing the clients)
* Admin `PUT`/`PATCH` on a missing id is **404** for every collection except `users` and the owner-scoped
  `carts`/`wishlists`/`addressBooks`; create records with `POST`.
* A cancel appends two `statusHistory` entries when the stage also moved, and always
  `{ at, from: 'active', to: 'cancelled', by }`.
* A cancelled or stage-4 order/request answers **422** `{ error: 'read_only' }` to anything except changes to
  `notes`, `technicianId` and `delivery`. Other admin-set descriptive fields (e.g. `technicianName`, `assignedAt`,
  `offeredPrice`) are accepted on open records.
* `statusHistory`, `userId`, `createdAt` and `id` sent by a client on PATCH/PUT are ignored.

## Shapes and error codes the shop relies on
* `GET /api/me` → `cart`, `wishlist` and `addressBook` are the stored documents written with `PUT /api/carts|wishlists|addressBooks/<userId>`
  (`{ items:[{pid,title,qty,unitPrice}], count }`, `{ items:[{pid,title}] }`, `{ addresses:[…] }`), or `null`.
* Cancel request after stage 2 or on a cancelled order → **422** `{ error:'illegal_transition' }`.
* `401 wrong_code` = bad one-time code at `/api/auth/verify`; `401 session_expired` = a token that was sent but is unknown/expired
  (the client must sign out); `401 unauthorized` = no credentials.
* `403 forbidden` = authenticated but not allowed; `429 too_many_attempts` on repeated bad passwords/codes.
