# Review of the shop + panel (Head of Staff summary)

Three teams reviewed the code independently: Engineering (`engineering-HoE.md`, E1–E25), Product Design
(`design-HoPD.md`, D1–D27) and Product (`product-HoP.md`, P1–P25). Line numbers for the shop refer to the
unpacked source of `shop/index.html` (its `__bundler/template`), not the bundled file.

## Fixed in this PR (safe, behaviour-preserving)
| Finding | Change |
|---|---|
| E1, P5 | malformed URL / id no longer crashes the server (400) |
| E4 | PATCH/PUT look the record up after the body is read |
| E5 | static server blocks dot-paths at any depth, server code and raw `db.json` |
| E9 | failed `db.json` writes return 500; an unreadable `db.json` is kept aside instead of overwritten |
| E8 (part) | POST with an existing id → 409 |
| E7 | panel: unescaped session type (stored XSS) |
| E10 | panel: no silent fork into the browser copy once the server was reachable; reconnects |
| D3, D4, D5, D6/D20 (panel) | overflow at 360px, RTL pipeline arrows + stacking, contrast, 44px touch targets |
| P1 | shop: hiding/deleting a featured product no longer white-screens the storefront (also wishlist/cart guards) |
| D16 | shop: real document title |

## Needs a product / owner decision (not changed)
- **E2/E3/E6/P6 — authentication.** `GET /api/db` and every write are public; the admin password is in client
  JS and the README; OTP is a fixed code. Go-live blocker.
- **P2 — stock is never decremented / restocked on cancel**, P8/P9 cancel & stage-transition rules,
  E8 order-number format, E11 PATCH-creates-record (shop signup relies on it).
- **P4** refill requests drop address/delivery data; **P3** shop shows "paid" when the server write failed.

## Follow-ups (larger, not in this PR)
Dialog focus management/inert background (D1, D2), phone table layout (D7), shop input sizes/labels (D17, D18),
digit normalisation in panel number inputs (D8), token unification between shop and panel (D13, D21), P7 stock clamp
in the cart, P10 demo addresses, P12 search normalisation.

## Known limitation
If a write to `db.json` fails the API now answers 500, but the in-memory copy already holds the change until restart.
