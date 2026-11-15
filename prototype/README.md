# Emdad Oxygen — standalone prototype

This folder is a **self-contained copy** of the shop app and its admin dashboard. It uses no file
or script from the repository root, so it can be copied, zipped or hosted on its own.

| File | What it is |
|---|---|
| `index.html` | The shop app (one offline HTML file: React, GSAP, Vazir font and images are inlined) |
| `prototype.html` | Same app (identical copy, linked from the review page) |
| `admin.html` | Admin dashboard — password `emdad-admin` |
| `review.html` + `img/` | UI/UX review write-up with before/after screenshots |
| `db.json` | This prototype's own database (seed: 8 products, 2 services) |
| `server.js`, `package.json` | This prototype's own server (zero dependencies, Node ≥ 18) |

## Run it

```bash
cd prototype
npm start            # → http://localhost:3001/  and  http://localhost:3001/admin.html
```

Demo login code: `123456`. With the server running, every login, order and request is written to
**this folder's** `db.json`.

Without a server (GitHub Pages, or opening the file directly) the app and dashboard share data
through the browser only.

## How it is kept separate from the root app

- **API address is relative** (`api/…`, not `/api/…`): the app talks only to a server running from this
  folder. If the root server serves this folder, the API isn't found there, so the prototype falls
  back to browser-only mode and never touches the root `db.json`.
- **Browser storage has its own names**: `emdad-prototype:v1`, `emdad-prototype:db`,
  `emdad-prototype:device`, `emdad-prototype:splash`, `emdad-prototype:admin`. The root app uses
  `emdad:…`. On GitHub Pages both apps share one website origin, so without this they would share
  sign-ins, carts and orders.
- This is a **frozen snapshot**: rebuilding the root app (`python3 build/build.py`) does not change
  anything here.
