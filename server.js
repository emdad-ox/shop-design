#!/usr/bin/env node
/*
 * Emdad Oxygen — JSON-DB server (zero dependencies, Node >= 18).
 *
 * Serves this folder and reads/writes only ./db.json; the whole site is self-contained.
 *
 *   npm start            # or: node server.js   → shop: http://localhost:3000/shop/   panel: /panel/
 *   PORT=8080 node server.js
 *
 * Serves shop/ (the app) and panel/ (admin dashboard) AND a tiny REST API backed by ./db.json.
 * Every write is persisted to db.json atomically (temp file + rename), one write at a time.
 *
 * API (all JSON):
 *   GET    /api/health                  → { ok: true }
 *   GET    /api/db                      → the whole database
 *   GET    /api/:collection             → array of records
 *   GET    /api/:collection/:id         → one record (404 if missing)
 *   POST   /api/:collection             → append a record (id + createdAt added if missing) → 201
 *   PUT    /api/:collection/:id         → create-or-replace a record   → { record, created }
 *   PATCH  /api/:collection/:id         → merge into a record (creates) → { record, created }
 *   DELETE /api/:collection/:id         → remove a record
 *
 * Collections are fixed (see COLLECTIONS); unknown ones are rejected so a typo can't grow the file.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'db.json');
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 8 * 1024 * 1024;   // photos arrive as data URLs; keep a sane ceiling
const COLLECTIONS = ['users', 'sessions', 'carts', 'wishlists', 'addressBooks',
                     'orders', 'payments', 'serviceRequests', 'products', 'services', 'activity'];

function emptyDb() {
  const db = { meta: { app: 'emdad-oxygen-shop', schema: 1, updatedAt: null } };
  COLLECTIONS.forEach(c => { db[c] = []; });
  return db;
}
function loadDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    COLLECTIONS.forEach(c => { if (!Array.isArray(db[c])) db[c] = []; });
    db.meta = db.meta || emptyDb().meta;
    return db;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('[db] db.json unreadable, starting empty:', e.message);
    return emptyDb();
  }
}
let db = loadDb();
let writing = Promise.resolve();
function save() {
  db.meta.updatedAt = new Date().toISOString();
  const data = JSON.stringify(db, null, 2) + '\n';
  writing = writing.then(() => new Promise((resolve) => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, data, (err) => {
      if (err) { console.error('[db] write failed:', err.message); return resolve(); }
      fs.rename(tmp, DB_FILE, (err2) => { if (err2) console.error('[db] rename failed:', err2.message); resolve(); });
    });
  }));
  return writing;
}

function send(res, status, body) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function api(req, res, parts) {
  const [col, rawId] = parts;
  if (col === 'health') return send(res, 200, { ok: true, collections: COLLECTIONS });
  if (col === 'db' && req.method === 'GET') return send(res, 200, db);
  if (!COLLECTIONS.includes(col)) return send(res, 404, { error: 'unknown collection: ' + col });
  const list = db[col];
  const id = rawId !== undefined ? decodeURIComponent(rawId) : undefined;
  const idx = id === undefined ? -1 : list.findIndex(r => String(r.id) === id);
  const now = new Date().toISOString();

  if (req.method === 'GET') {
    if (id === undefined) return send(res, 200, list);
    return idx < 0 ? send(res, 404, { error: 'not found' }) : send(res, 200, list[idx]);
  }
  if (req.method === 'DELETE' && id !== undefined) {
    if (idx < 0) return send(res, 404, { error: 'not found' });
    const [removed] = list.splice(idx, 1); await save();
    return send(res, 200, { removed });
  }
  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: e.message }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'body must be a JSON object' });

  if (req.method === 'POST' && id === undefined) {
    const record = { id: body.id || crypto.randomUUID(), createdAt: now, ...body };
    list.push(record); await save();
    return send(res, 201, { record });
  }
  if ((req.method === 'PUT' || req.method === 'PATCH') && id !== undefined) {
    const created = idx < 0;
    const base = created ? { id, createdAt: now } : (req.method === 'PATCH' ? list[idx] : { id, createdAt: list[idx].createdAt });
    const record = { ...base, ...body, id, updatedAt: now };
    if (created) list.push(record); else list[idx] = record;
    await save();
    return send(res, created ? 201 : 200, { record, created });
  }
  return send(res, 405, { error: 'method not allowed' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript',
               '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/') { res.writeHead(302, { Location: '/shop/' }); return res.end(); }   // site root → the shop
  let file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || path.basename(file).startsWith('.')) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      // a folder (shop/, panel/) serves its index.html; without the trailing slash, redirect so the
      // pages' relative addresses (../api, ../db.json) resolve from inside the folder
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' }); return res.end(); }
      file = path.join(file, 'index.html');
      return fs.stat(file, (e2, st2) => send200(e2, st2));
    }
    send200(err, st);
  });
  function send200(err, st) {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'api') {
    api(req, res, parts.slice(1)).catch((e) => { console.error(e); send(res, 500, { error: 'server error' }); });
  } else if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url.pathname);
  } else { res.writeHead(405); res.end(); }
});
server.listen(PORT, () => {
  console.log('Emdad Oxygen shop  → http://localhost:' + PORT + '/shop/');
  console.log('Admin panel       → http://localhost:' + PORT + '/panel/');
  console.log('JSON DB            → ' + DB_FILE + '  (API: /api/db, /api/<collection>)');
});
