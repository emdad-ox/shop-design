# Review of the shop + panel (Head of Staff summary)

Three teams reviewed the code independently: Engineering (`engineering-HoE.md`, E1–E25), Product Design
(`design-HoPD.md`, D1–D27) and Product (`product-HoP.md`, P1–P25). Shop line numbers in the reports refer to the
unpacked source of `shop/index.html` (its `__bundler/template`). The API, auth and lifecycle rules that came out of the
review are in [`../api.md`](../api.md).

## Implemented
| Area | Findings | What changed |
|---|---|---|
| Server | E1, E4, E5, E9, E12–E14, E18, E21, E23, P5 | no crash on bad URLs; static allowlist (no `.git`, server code, database); serialized writes with in-memory rollback; 409/413/415/422 handling; security headers, bind address; cascades on user/technician delete; ETag |
| Auth | E2, E3, E6, P6 | server-side admin login and phone+OTP login, tokens, rate limits, per-role access rules; `/api/db` is admin-only; customers use `/api/catalog` and `/api/me` |
| Orders & stock | P2, P3, P7, E8, E21 | server validates items, checks and decrements stock atomically, recomputes totals/discount, creates the payment; shop commits only after the server confirms |
| Lifecycle | P8, P9, E15 | stages advance one step; no un-cancel; cancel restocks and sets the payment to refund-pending; customer cancel request; refund completion |
| Panel | E7, E10, E16, E20, D1–D15, D26, P11, P12, P18, P19, P22, P23, P25 | see `panel/index.html`: XSS fix, reconnect banner, ETag polling, accessible dialogs/tables/forms, validation with Persian digits, CSV export, notes, pagination |
| Shop | P1, P4, P10, P12, P13, P15, P17, P20, P21, P25, D16–D20, D22–D25, D27 | no storefront crash on hidden products, refill/used requests keep all entered data, no shared demo addresses, search normalisation, 16px inputs, labels, 44px targets, dialog semantics, route titles |
| Data | E25, P15 | runtime DB is git-ignored `data/db.json`; `db.json` is only the seed catalogue |

## Not done (needs product input or is a separate job)
* P16 coupon backend (only `EMDAD10` exists, enforced by the server), P17 shipping fee, P19 payment status machine beyond paid/refund, P23, P24.
* Real SMS for OTP (a fixed demo code unless `OTP_CODE`/`NODE_ENV=production`), a real payment gateway (payment is still simulated in the shop).
* E22 shared data layer / escape-by-default templating; D13/D21 shared design-token refactor between shop and panel; D26 dark-mode default for the shop (kept light by the earlier decision).
* Panel: manual order creation, per-product low-stock threshold, technician/date filters, delivery proof, notifications, admin identity.
* Contact-sheet street address in the shop is still a placeholder.

## Known limits
* Tokens are in server memory: a restart signs everyone out.
* In offline/static mode (GitHub Pages, `file://`) there is no real authentication; it is a browser-only demo.
* Not tested on a real iOS device or with a screen reader.
