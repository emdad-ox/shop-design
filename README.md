# Emdad Oxygen — shop app + admin dashboard

A Persian (RTL) medical-oxygen shop. Each page is a single offline HTML file: React, GSAP, the
Vazir font and images are inlined, so nothing else is needed.

| File | What it is |
|---|---|
| `shop/index.html` | The shop app — demo login code `123456` |
| `panel/index.html` | Admin dashboard — password `emdad-admin` |
| `index.html` | Sends visitors from the site root to `shop/` |
| `db.json` | Database (seed: 8 products, 2 services) |
| `server.js`, `package.json` | Server for `db.json` (zero dependencies, Node ≥ 18) |

## Run it

```bash
npm start            # → shop: http://localhost:3000/shop/   panel: http://localhost:3000/panel/
```

With the server running, every login, order and service request is written to `db.json`, and the
app and dashboard share it across devices. Without a server (GitHub Pages, or opening the file
directly) the app and dashboard share data through the browser only (storage keys
`emdad-prototype:*`).

Public site: https://emdad-ox.github.io/shop-design/shop/ (panel: https://emdad-ox.github.io/shop-design/panel/).

## Source

The pages are finished files; there is no build step in this repository any more. The original
build system (`build/`), design docs, checkpoints and the reverse-engineering reference were
removed on 15 Nov 2026 and are still in git history at commit
[`fa42564`](https://github.com/emdad-ox/shop-design/tree/fa42564).
