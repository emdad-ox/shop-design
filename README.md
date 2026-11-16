# Emdad Oxygen — shop app + admin dashboard

A Persian (RTL) medical-oxygen shop. Each page is a single offline HTML file: React, GSAP, the
Vazir font and images are inlined, so nothing else is needed.

| File | What it is |
|---|---|
| `shop/index.html` | The shop app — demo login code `123456` |
| `panel/index.html` | Admin dashboard (password: `ADMIN_PASSWORD`, see below) |
| `index.html` | Sends visitors from the site root to `shop/` |
| `db.json` | Seed catalogue (8 products, 2 services) — never holds customer data |
| `server.js`, `package.json` | Server for `db.json` (zero dependencies, Node ≥ 18) |

## Run it

```bash
npm start            # → shop: http://localhost:3000/shop/   panel: http://localhost:3000/panel/
```

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | listen port |
| `HOST` | `127.0.0.1` (`0.0.0.0` when `PORT` is set) | bind address |
| `ADMIN_PASSWORD` | `emdad` (demo — a warning is printed) | admin dashboard password, checked by the server |
| `OTP_CODE` | `123456` (demo) | the one-time code every phone accepts; with `NODE_ENV=production` and no `OTP_CODE` a random code is printed to the console (no SMS provider is wired in) |
| `DB_FILE` | `data/db.json` | runtime database (git-ignored; created from the seed `db.json` on first run) |

With the server running, every login, order and service request is stored in `data/db.json` and the shop and
dashboard share it across devices. Customers and the admin sign in through the server and only see what they
are allowed to: the admin signs in with `ADMIN_PASSWORD`, customers with their phone and the one-time code, and the
API (`/api/catalog`, `/api/me`, admin-only `/api/db` and collections) is described at the top of `server.js`. The server
checks and decrements stock when an order is placed, and orders move forward one stage at a time (cancelling restocks
and marks the payment for refund).
Without a server (GitHub Pages, or opening the file directly) the shop and dashboard are a browser-only demo
that shares data through the browser (storage keys `emdad-prototype:*`); there is no real authentication in
that mode.

Public site: https://emdad-ox.github.io/shop-design/shop/ (panel: https://emdad-ox.github.io/shop-design/panel/).

## Source

The pages are finished files; there is no build step in this repository any more. The original
build system (`build/`), design docs, checkpoints and the reverse-engineering reference were
removed on 15 Nov 2026 and are still in git history at commit
[`fa42564`](https://github.com/emdad-ox/shop-design/tree/fa42564).
