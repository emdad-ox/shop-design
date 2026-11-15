# Emdad Oxygen — shop app + admin dashboard

A Persian (RTL) medical-oxygen shop. Each page is a single offline HTML file: React, GSAP, the
Vazir font and images are inlined, so nothing else is needed.

| File | What it is |
|---|---|
| `index.html` | The shop app — demo login code `123456` |
| `prototype.html` | Same app (identical copy, linked from the review page) |
| `admin.html` | Admin dashboard — password `emdad-admin` |
| `review.html` + `img/` | UI/UX review write-up with before/after screenshots |
| `db.json` | Database (seed: 8 products, 2 services) |
| `server.js`, `package.json` | Server for `db.json` (zero dependencies, Node ≥ 18) |

## Run it

```bash
npm start            # → http://localhost:3000/  and  http://localhost:3000/admin.html
```

With the server running, every login, order and service request is written to `db.json`, and the
app and dashboard share it across devices. Without a server (GitHub Pages, or opening the file
directly) the app and dashboard share data through the browser only (storage keys
`emdad-prototype:*`).

Public site: https://emdad-ox.github.io/shop-design/ (dashboard: `/admin.html`).

## Source

The pages are finished files; there is no build step in this repository any more. The original
build system (`build/`), design docs, checkpoints and the reverse-engineering reference were
removed on 15 Nov 2026 and are still in git history at commit
[`fa42564`](https://github.com/emdad-ox/shop-design/tree/fa42564).
