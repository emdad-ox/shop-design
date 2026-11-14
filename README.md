# Emdad Oxygen Shop (امداد اکسیژن)

A Persian / Farsi **RTL medical-oxygen mobile-commerce PWA**, shipped as a **single, self-contained, offline HTML file** (custom React-18 "dc-runtime" framework, no build server needed to run it).

## What's here

| Path | What it is |
|------|-----------|
| **`Emdad Oxygen Shop - Enhanced.html`** | ⭐ **The deliverable.** Double-click to open — runs fully offline, no internet. |
| `Emdad Oxygen Shop - Offline.html` | The original file (untouched), used as the build source. |
| `Emdad Oxygen - Enhancements.md` | Human-readable changelog of everything that was added. |
| `build/` | The build system that turns the Offline file → Enhanced file. |
| `checkpoints/` | A snapshot of the source after each phase (P1…P12, GSAP-0…2, cart) — the full history. |
| `docs/` | Planning, reviews, and research produced along the way. |
| `reference/` | Raw decompiled/exploration artifacts from reverse-engineering the original bundle. |

## Running it

Just open **`Emdad Oxygen Shop - Enhanced.html`** in any modern browser. Everything (React, GSAP, the map tiles, all assets) is inlined — it works with the network off. Demo login OTP is `123456`.

## Rebuilding it

The Enhanced file is generated from the original by `build/build.py`, which:
1. Extracts the compiled template out of the Offline file's `__bundler/template` block.
2. Swaps in the edited app logic (`script_2.work.js`) and styles (`style_3.work.css`) via exact-block replace.
3. Applies the markup micro-edits in `markup_edits.json` (find/replace on the template).
4. Inlines the offline GSAP bundle (`gsap_bundle/_gsap_all.js`) before `</head>`.
5. Re-escapes `</` and writes `Emdad Oxygen Shop - Enhanced.html`.

```bash
python3 build/build.py      # regenerates the Enhanced file in place
```

### `build/` contents
- `build.py` — the builder (self-contained; paths resolve relative to this folder).
- `script_2.orig.js` / `script_2.work.js` — original vs. edited app component (the diff is all the app logic added).
- `style_3.orig.css` / `style_3.work.css` — original vs. edited design system + motion CSS.
- `markup_edits.json` — every exact find/replace applied to the compiled template.
- `template.extracted.html` — the decoded template, for reference when writing new markup edits.
- `gsap_bundle/` — GSAP 3.13.0 core + plugins (Flip, Draggable, Inertia, SplitText, DrawSVG, CustomEase/Bounce), concatenated into `_gsap_all.js` for offline inlining.

## What was built (summary)

A motion + polish + functional pass over the whole app:
- **Motion / View Transitions:** directional route cover-slides, card→detail shared-element expand, services→form container transform, full-page theme circle-reveal, list FLIPs.
- **GSAP (bundled offline):** drag-to-dismiss sheets, a success moment (CustomBounce + DrawSVG + Farsi-safe SplitText), and a full cart add-more/remove experience (Flip reflow + count-rolling prices).
- **Functional epics:** persistence/hydration, real History/back routing, a unified sticky app-bar, order/request lifecycle with loading states, delivery day/time scheduling, trust & safety content, real photo upload, and deeper accessibility.

See `Emdad Oxygen - Enhancements.md` for the full changelog and `docs/planning/MASTER_ROADMAP.md` for the plan.

## JSON database (`db.json`)

Everything the app does is recorded in **`db.json`** at the project root, next to the HTML: logins, sign-ups and logouts, carts, wishlists, address books, orders, service requests (refill / equipment), price inquiries, and an activity log.

```bash
npm start          # = node server.js → http://localhost:3000  (no npm install needed)
```

`server.js` has no dependencies and needs Node 18 or newer. It serves the app and a small REST API that writes to `db.json`. It writes to a temporary file first and renames it, so a crash can't leave `db.json` half-written.

| Collection | One record per… |
|---|---|
| `users` | Phone number (`u_09…`): name, phone, `loginCount`, `lastLoginAt` |
| `sessions` | `signup` (first verified login of a phone) / `login` / `logout` |
| `carts`, `wishlists`, `addressBooks` | Owner: the user, or `guest_<device>` before login (latest state) |
| `orders`, `serviceRequests`, `priceInquiries` | Submission, tied to the user |
| `activity` | Every action: `auth.*`, `cart.update`, `order.place`, `catalog.search`, … |

API endpoints:
- `GET /api/db` returns the whole database.
- `GET`, `POST`, `PUT`, `PATCH`, `DELETE` on `/api/<collection>[/<id>]` read and change records.

**Without the server** (GitHub Pages, double-clicking the file), the app still works. It saves the same records in the browser's local storage under the `emdad:db` key. To look at them, run `window.emdadDB.dump()` in the browser console. A static host can't write files, so `db.json` only fills up when the app runs through `npm start`.

The committed `db.json` is an empty template. Writes from local testing change it, so don't commit real customer data.

## Caveats
- Verified on a local dev server; the a11y and History-routing work is attribute/`activeElement`/`history.back()`-verified, not tested against a physical Back gesture or a live screen reader.
- `localStorage` persistence under the `file://` origin varies by browser — the app always runs, but may not persist across reloads when opened directly from disk.
