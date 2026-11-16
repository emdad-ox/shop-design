#!/usr/bin/env node
/*
 * Emdad Oxygen — JSON-DB server (zero dependencies, Node >= 18).
 *
 *   npm start                       → shop: http://localhost:3000/shop/   panel: /panel/
 *   PORT=8080 node server.js
 *
 * Environment:
 *   PORT            listen port (default 3000)
 *   HOST            bind address (default 127.0.0.1; 0.0.0.0 when PORT is set, i.e. hosting)
 *   ADMIN_PASSWORD  admin dashboard password (default "emdad" — change it for anything public)
 *   OTP_CODE        the one-time code every phone accepts (default "123456" = demo). With NODE_ENV=production
 *                   and no OTP_CODE, a random code is generated per request and printed to the console
 *                   (no SMS provider is wired in).
 *   DB_FILE         runtime database (default data/db.json; created from the seed ./db.json on first run)
 *
 * Serves shop/ and panel/ AND a REST API over the database.
 *
 * API (JSON; errors are { error, message? }):
 *   POST /api/admin/login {password}            → { token }   send as header X-Admin-Token
 *   POST /api/auth/otp {phone} · /api/auth/verify {phone, code, firstName?, lastName?} → { token, user }   send as Bearer
 *   GET  /api/health · /api/catalog             public (catalog = active products + services)
 *   GET  /api/me                                the signed-in customer's own records
 *   GET  /api/db · /api/<collection>[/<id>]     admin only
 *   POST/PUT/PATCH/DELETE /api/<collection>…    admin, or a customer on their own records (carts, wishlists, addressBooks,
 *                                               orders, serviceRequests, activity, sessions, own user name)
 * Orders (POST /api/orders): items need pid; the server checks and decrements stock, recomputes totals and the
 * discount, creates the payment, and answers 409 out_of_stock / duplicate_id. Orders and requests move forward one
 * stage at a time (422 otherwise); cancelling restocks and marks the payment refund_pending; an admin then PATCHes
 * the payment to refunded. Customers can only flag cancelRequested while stage <= 2.
 * Every write is persisted atomically (temp file + rename),
 * one write at a time, and is rolled back in memory if the disk write fails.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SEED_FILE = path.join(ROOT, 'db.json');
const DB_FILE = path.resolve(process.env.DB_FILE || path.join(ROOT, 'data', 'db.json'));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const MAX_BODY = 8 * 1024 * 1024;   // photos arrive as data URLs; keep a sane ceiling
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'emdad';
const PROD = process.env.NODE_ENV === 'production';
const FIXED_OTP = process.env.OTP_CODE || (PROD ? '' : '123456');
const TOKEN_TTL = 12 * 3600 * 1000;
const COLLECTIONS = ['users', 'sessions', 'carts', 'wishlists', 'addressBooks',
                     'orders', 'payments', 'serviceRequests', 'products', 'services', 'activity', 'technicians'];
const STAGED = ['orders', 'serviceRequests'];

class HttpError extends Error {
  constructor(status, error, extra) { super(error); this.status = status; this.body = { error, ...(extra || {}) }; }
}

// ---------------------------------------------------------------- database
function emptyDb() {
  const db = { meta: { app: 'emdad-oxygen-shop', schema: 2, updatedAt: null } };
  COLLECTIONS.forEach(c => { db[c] = []; });
  return db;
}
function normalize(db) {
  COLLECTIONS.forEach(c => { if (!Array.isArray(db[c])) db[c] = []; });
  db.meta = db.meta || emptyDb().meta;
  return db;
}
function loadDb() {
  try { return normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); }
  catch (e) {
    if (e.code !== 'ENOENT') {
      // keep the unreadable file instead of overwriting it with an empty database on the next write
      const keep = DB_FILE + '.corrupt-' + Date.now();
      try { fs.renameSync(DB_FILE, keep); } catch (e2) { /* nothing more to do */ }
      console.warn('[db] ' + path.basename(DB_FILE) + ' unreadable (' + e.message + '); moved to ' + path.basename(keep) + ', starting empty');
    }
    return null;
  }
}
function seedDb() {
  // first run: take the catalogue (products, services, technicians) from the committed seed; no customer data
  const db = emptyDb();
  try {
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    ['products', 'services', 'technicians'].forEach(c => { if (Array.isArray(seed[c])) db[c] = seed[c]; });
  } catch (e) { console.warn('[db] no seed catalogue:', e.message); }
  return db;
}
let db = loadDb() || seedDb();
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

let writing = Promise.resolve();
function save() {
  db.meta.updatedAt = new Date().toISOString();
  const data = JSON.stringify(db) + '\n';
  const job = writing.then(() => new Promise((resolve, reject) => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, data, (err) => {
      if (err) { console.error('[db] write failed:', err.message); return reject(err); }
      fs.rename(tmp, DB_FILE, (err2) => {
        if (err2) { console.error('[db] rename failed:', err2.message); return reject(err2); }
        resolve();
      });
    });
  }));
  writing = job.catch(() => {});   // one failed write must not block the queue
  return job;
}
if (!fs.existsSync(DB_FILE)) save().catch(() => {});

// All mutations run one at a time. `tx` replaces whole collections (never edits records in place), so a failed
// disk write can be undone by putting the old arrays back.
let lockChain = Promise.resolve();
function tx(cols, fn) {
  const run = lockChain.then(async () => {
    const before = {}; cols.forEach(c => { before[c] = db[c]; });
    try { const out = fn(); await save(); return out; }
    catch (e) {
      cols.forEach(c => { db[c] = before[c]; });
      if (e instanceof HttpError) throw e;
      throw new HttpError(500, 'write_failed');
    }
  });
  lockChain = run.catch(() => {});
  return run;
}

// ---------------------------------------------------------------- auth
const tokens = new Map();   // token -> { role, userId?, exp }
const otps = new Map();     // userId -> { code, exp }
const hits = new Map();     // rate-limit key -> { n, t }
setInterval(() => {
  const now = Date.now();
  tokens.forEach((v, k) => { if (v.exp < now) tokens.delete(k); });
  otps.forEach((v, k) => { if (v.exp < now) otps.delete(k); });
  hits.forEach((v, k) => { if (v.t < now) hits.delete(k); });
}, 60000).unref();

function issue(role, userId) {
  const token = crypto.randomBytes(32).toString('hex'), exp = Date.now() + TOKEN_TTL;
  tokens.set(token, { role, userId, exp });
  return { token, expiresAt: new Date(exp).toISOString() };
}
function authOf(req) {
  let t = req.headers['x-admin-token'];
  if (t) { const v = tokens.get(String(t)); return v && v.role === 'admin' && v.exp > Date.now() ? { role: 'admin' } : { role: 'guest', stale: true }; }
  const h = String(req.headers.authorization || '');
  if (/^Bearer /i.test(h)) {
    const v = tokens.get(h.slice(7).trim());
    return v && v.role === 'user' && v.exp > Date.now() ? { role: 'user', userId: v.userId, token: h.slice(7).trim() } : { role: 'guest', stale: true };
  }
  return { role: 'guest' };
}
function limited(key, max, windowMs) {            // true when over the limit
  const now = Date.now(), e = hits.get(key);
  return !!e && e.t > now && e.n >= max;
}
function fail(key, windowMs) {
  const now = Date.now(), e = hits.get(key);
  if (e && e.t > now) e.n++; else hits.set(key, { n: 1, t: now + windowMs });
}
const sameStr = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest(), hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};
const faDigits = s => String(s == null ? '' : s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
function userIdOf(phone) { const d = faDigits(phone).replace(/\D/g, '').slice(-10); return d.length === 10 ? 'u_0' + d : null; }

// ---------------------------------------------------------------- helpers
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' };
function send(res, status, body, extra) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...(extra || {}) });
  res.end(data);
}
function etagged(req, res, body) {
  const tag = 'W/"' + (db.meta.updatedAt || '0') + '"';
  if (req.headers['if-none-match'] === tag) { res.writeHead(304, { ETag: tag, 'Cache-Control': 'no-cache', ...SEC_HEADERS }); return res.end(); }
  send(res, 200, body, { ETag: tag, 'Cache-Control': 'no-cache' });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, over = false; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) over = true; else chunks.push(c); });   // keep draining so the 413 can be delivered
    req.on('end', () => {
      if (over) return reject(new HttpError(413, 'too_large'));
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new HttpError(400, 'invalid_json')); }
    });
    req.on('error', () => reject(new HttpError(400, 'bad_request')));
  });
}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
const omit = (o, keys) => { const r = { ...o }; keys.forEach(k => delete r[k]); return r; };
const isInt = (v) => typeof v === 'number' ? Number.isInteger(v) : (typeof v === 'string' && /^\d+$/.test(v));
const bad = (field, message) => new HttpError(422, 'invalid', { field, message });
const byId = (list, id) => list.findIndex(r => String(r.id) === String(id));

// ---------------------------------------------------------------- business rules
const LOCKED = ['stage', 'status', 'statusHistory', 'userId', 'createdAt', 'updatedAt', 'technicianId', 'cancelRequested',
                'cancelRequestedAt', 'cancelReason', 'cancelledAt', 'cancelledBy', 'id', 'no', 'code'];

function validateProduct(p) {
  if (p.price !== undefined && !(isInt(p.price) && +p.price > 0)) throw bad('price', 'قیمت باید عدد صحیح بزرگ‌تر از صفر باشد');
  if (p.stock !== undefined && !(isInt(p.stock) && +p.stock >= 0)) throw bad('stock', 'موجودی باید عدد صحیح و نامنفی باشد');
  if (p.sort !== undefined && p.sort !== '' && p.sort !== null && !isInt(p.sort)) throw bad('sort', 'ترتیب باید عدد صحیح باشد');
  return { ...p, ...(p.price !== undefined ? { price: +p.price } : {}), ...(p.stock !== undefined ? { stock: +p.stock } : {}) };
}

// restock the items of a cancelled order and mark its payment for refund (mutates db.* by replacing arrays)
function applyOrderCancel(order, by, now) {
  const add = {};
  (order.items || []).forEach(i => { if (i && i.pid) add[i.pid] = (add[i.pid] || 0) + (+i.qty || 0); });
  if (Object.keys(add).length) db.products = db.products.map(p => (add[p.id] ? { ...p, stock: (+p.stock || 0) + add[p.id], updatedAt: now } : p));
  db.payments = db.payments.map(p => (String(p.orderNo) === String(order.id) && p.status === 'paid'
    ? { ...p, status: 'refund_pending', refundDue: p.amount, updatedAt: now } : p));
  return { cancelledAt: now, cancelledBy: by, cancelRequested: false };
}

const DISCOUNTS = { EMDAD10: { pct: 10, max: 500000 } };

function createOrder(auth, body) {
  const now = new Date().toISOString();
  const userId = auth.role === 'user' ? auth.userId : String(body.userId || '');
  if (!userId) throw new HttpError(403, 'forbidden');
  const id = String(body.id || body.no || '');
  if (!id) throw bad('id', 'شمارهٔ سفارش لازم است');
  if (db.orders.some(o => String(o.id) === id)) throw new HttpError(409, 'duplicate_id');
  if (!Array.isArray(body.items) || !body.items.length) throw bad('items', 'سفارش بدون کالا');
  const need = {};
  const items = body.items.map(i => {
    if (!isObj(i) || !i.pid) throw bad('items', 'شناسهٔ کالا لازم است');
    const p = db.products.find(x => x.id === i.pid);
    if (!p || p.active === false) throw new HttpError(404, 'unknown_product', { pid: i.pid });
    const qty = +i.qty;
    if (!Number.isInteger(qty) || qty < 1) throw bad('items', 'تعداد نامعتبر است');
    need[p.id] = (need[p.id] || 0) + qty;
    return { pid: p.id, title: p.title, qty, line: (+p.price || 0) * qty };
  });
  Object.keys(need).forEach(pid => {
    const p = db.products.find(x => x.id === pid), have = Math.max(0, +p.stock || 0);
    if (need[pid] > have) throw new HttpError(409, 'out_of_stock', { pid, available: have, message: 'موجودی «' + p.title + '» کافی نیست' });
  });
  const subtotal = items.reduce((a, i) => a + i.line, 0);
  const rule = DISCOUNTS[String(body.discCode || '').toUpperCase()];     // the server decides the discount; the client's number is ignored
  const disc = rule ? Math.min(Math.round(subtotal * rule.pct / 100), rule.max, subtotal) : 0;
  const user = db.users.find(u => u.id === userId) || {};
  const record = {
    ...omit(body, LOCKED.concat(['items', 'subtotal', 'disc', 'total', 'paid', 'payMethod', 'payRef', 'payCard', 'paidAt', 'phone', 'customer', 'discCode'])),
    id, no: id, discCode: rule ? String(body.discCode).toUpperCase() : '', userId, phone: user.phone || body.phone || '', customer: user.name || body.customer || '',
    items, count: items.reduce((a, i) => a + i.qty, 0), subtotal, disc, total: subtotal - disc,
    stage: 1, status: 'active', createdAt: now,
    statusHistory: [{ at: now, from: null, to: 1, by: 'customer' }],
    ...(body.paid ? { paid: true, payMethod: body.payMethod || 'online', payRef: String(body.payRef || ''), payCard: body.payCard || '', paidAt: body.paidAt || Date.now() } : {}),
  };
  db.products = db.products.map(p => (need[p.id] ? { ...p, stock: (+p.stock || 0) - need[p.id], updatedAt: now } : p));
  db.orders = db.orders.concat(record);
  if (record.paid) {
    let pid = record.payRef || 'pay_' + crypto.randomUUID();
    if (db.payments.some(p => String(p.id) === pid)) pid = 'pay_' + crypto.randomUUID();
    db.payments = db.payments.concat({ id: pid, orderNo: id, userId, amount: record.total, currency: 'IRT', method: record.payMethod,
      status: 'paid', cardMasked: record.payCard, createdAt: now, at: new Date(+record.paidAt || Date.now()).toISOString() });
  }
  return record;
}

// admin PATCH/PUT on orders / serviceRequests
function adminStaged(col, old, body, now) {
  const clean = omit(body, ['id', 'createdAt', 'updatedAt', 'statusHistory', 'userId']);
  const frozen = old.status === 'cancelled' || (+old.stage || 1) >= 4;
  const touched = Object.keys(clean);
  if (frozen && touched.some(k => !['notes', 'technicianId', 'delivery'].includes(k))) throw new HttpError(422, 'read_only', { message: 'این مورد بسته شده و قابل تغییر نیست' });
  const from = +old.stage || 1;
  let to = from, status = old.status || 'active';
  if (clean.stage !== undefined) {
    to = +clean.stage;
    if (!Number.isInteger(to) || to < from || to > from + 1 || to > 4) throw new HttpError(422, 'illegal_transition', { from, to: clean.stage });
  }
  if (clean.status !== undefined) {
    if (clean.status === 'cancelled') { if (from >= 4 || old.status === 'cancelled') throw new HttpError(422, 'illegal_transition', { from, to: 'cancelled' }); status = 'cancelled'; }
    else if (clean.status === 'active') { if (old.status === 'cancelled') throw new HttpError(422, 'illegal_transition', { from: 'cancelled', to: 'active' }); }
    else throw new HttpError(422, 'illegal_transition', { from: old.status, to: clean.status });
  }
  let rec = { ...old, ...clean, stage: to, status, updatedAt: now };
  const history = (old.statusHistory || []).slice();
  if (to !== from) history.push({ at: now, from, to, by: 'admin' });
  if (status === 'cancelled' && old.status !== 'cancelled') {
    history.push({ at: now, from: 'active', to: 'cancelled', by: 'admin' });
    rec = { ...rec, ...(col === 'orders' ? applyOrderCancel(old, 'admin', now) : { cancelledAt: now, cancelledBy: 'admin', cancelRequested: false }) };
  }
  rec.statusHistory = history;
  return rec;
}

// ---------------------------------------------------------------- authorization of generic CRUD
function authorize(auth, method, col, id, body) {
  if (auth.role === 'admin') return;
  const guestPut = () => method === 'PUT' && typeof id === 'string' && id.startsWith('guest_');
  if (auth.role === 'guest') {
    if (['carts', 'wishlists', 'addressBooks'].includes(col) && guestPut()) return;
    if (col === 'activity' && method === 'POST') return;
    if (col === 'sessions' && method === 'POST') return;
    throw new HttpError(401, auth.stale ? 'session_expired' : 'unauthorized');
  }
  const uid = auth.userId;
  if (['carts', 'wishlists', 'addressBooks'].includes(col) && method === 'PUT' && (id === uid || String(id).startsWith('guest_'))) return;
  if (col === 'activity' && method === 'POST') return;
  if (col === 'sessions' && method === 'POST') return;
  if (col === 'users' && (method === 'PATCH' || method === 'PUT') && id === uid) return;
  if (col === 'orders' && method === 'POST') return;
  if (col === 'orders' && method === 'PATCH') return;      // narrowed below
  if (col === 'serviceRequests' && method === 'POST') return;
  throw new HttpError(403, 'forbidden');
}

async function crud(req, res, auth, col, id) {
  const method = req.method;
  if (method === 'GET') {
    if (auth.role !== 'admin') throw new HttpError(auth.role === 'guest' ? 401 : 403, auth.stale ? 'session_expired' : 'forbidden');
    if (id === undefined) return send(res, 200, db[col]);
    const i = byId(db[col], id);
    return i < 0 ? send(res, 404, { error: 'not_found' }) : send(res, 200, db[col][i]);
  }
  if (method === 'DELETE') {
    if (auth.role !== 'admin') throw new HttpError(auth.role === 'guest' ? 401 : 403, 'forbidden');
    if (id === undefined) return send(res, 405, { error: 'method_not_allowed' });
    const removed = await tx(COLLECTIONS, () => {
      const i = byId(db[col], id); if (i < 0) throw new HttpError(404, 'not_found');
      const rec = db[col][i];
      db[col] = db[col].filter((_, k) => k !== i);
      if (col === 'users') {                         // the account and everything private to it goes; orders stay (accounting)
        ['carts', 'wishlists', 'addressBooks'].forEach(c => { db[c] = db[c].filter(r => String(r.id) !== String(id) && r.userId !== id); });
        db.sessions = db.sessions.filter(s => s.userId !== id);
        tokens.forEach((v, k) => { if (v.userId === id) tokens.delete(k); });
      }
      if (col === 'technicians') STAGED.forEach(c => { db[c] = db[c].map(r => (r.technicianId === id ? { ...r, technicianId: null, updatedAt: new Date().toISOString() } : r)); });
      return rec;
    });
    return send(res, 200, { removed });
  }
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return send(res, 405, { error: 'method_not_allowed' });
  if (!/json/i.test(String(req.headers['content-type'] || ''))) throw new HttpError(415, 'content_type_must_be_json');
  authorize(auth, method, col, id, null);           // cheap rejection before reading the body
  const body = await readBody(req);
  if (!isObj(body)) throw new HttpError(400, 'body_must_be_object');
  const now = new Date().toISOString();

  if (method === 'POST') {
    if (id !== undefined) return send(res, 405, { error: 'method_not_allowed' });
    const record = await tx(COLLECTIONS, () => {
      if (col === 'orders' && (auth.role === 'user' || (Array.isArray(body.items) && body.items.some(i => i && i.pid)))) return createOrder(auth, body);
      let rec = { ...omit(body, ['createdAt', 'updatedAt']), id: String(body.id || crypto.randomUUID()), createdAt: now };
      if (db[col].some(r => String(r.id) === rec.id)) throw new HttpError(409, 'duplicate_id');
      if (auth.role === 'user') {
        if (['serviceRequests', 'sessions'].includes(col)) rec.userId = auth.userId;
        if (col === 'activity' && rec.userId && rec.userId !== auth.userId) rec.userId = auth.userId;
      }
      if (col === 'serviceRequests') {
        rec = { ...omit(rec, LOCKED.filter(k => !['id', 'userId', 'createdAt'].includes(k))), id: rec.id, userId: rec.userId, createdAt: now,
          stage: 1, status: 'active', statusHistory: [{ at: now, from: null, to: 1, by: auth.role === 'user' ? 'customer' : 'admin' }] };
        if (auth.role === 'admin') rec = { ...rec, ...pick(body, ['userId']) };
        rec.code = rec.id;
        const u = db.users.find(x => x.id === rec.userId); if (u) { rec.phone = u.phone || rec.phone; rec.customer = u.name || rec.customer; }
      }
      if (col === 'products') rec = validateProduct(rec);
      db[col] = db[col].concat(rec);
      return rec;
    });
    return send(res, 201, { record });
  }

  // PUT / PATCH with an id
  if (id === undefined) return send(res, 405, { error: 'method_not_allowed' });
  const out = await tx(COLLECTIONS, () => {
    const idx = byId(db[col], id), old = idx < 0 ? null : db[col][idx];
    const put = (rec) => { db[col] = idx < 0 ? db[col].concat(rec) : db[col].map((r, k) => (k === idx ? rec : r)); return { record: rec, created: idx < 0 }; };
    if (!old && col !== 'users' && !(['carts', 'wishlists', 'addressBooks'].includes(col) && method === 'PUT')) throw new HttpError(404, 'not_found');

    if (auth.role !== 'admin') {                                     // narrowing for non-admins
      if (col === 'users') {
        const allowed = pick(body, ['name', 'firstName', 'lastName']);
        if (!old) throw new HttpError(404, 'not_found');
        return put({ ...old, ...allowed, id: old.id, updatedAt: now });
      }
      if (col === 'orders') {
        if (!old || old.userId !== auth.userId) throw new HttpError(403, 'forbidden');
        const keys = Object.keys(body);
        if (body.cancelRequested !== true || keys.some(k => !['cancelRequested', 'cancelReason'].includes(k))) throw new HttpError(403, 'forbidden');
        if (old.status === 'cancelled' || (+old.stage || 1) > 2) throw new HttpError(422, 'illegal_transition', { message: 'در این مرحله امکان درخواست لغو نیست' });
        return put({ ...old, cancelRequested: true, cancelRequestedAt: now, cancelReason: String(body.cancelReason || '').slice(0, 300), updatedAt: now });
      }
      // carts / wishlists / addressBooks: owner-scoped documents
      return put({ ...(method === 'PATCH' && old ? old : {}), ...omit(body, ['createdAt', 'updatedAt', 'id']), id: String(id), createdAt: old ? old.createdAt : now, updatedAt: now,
        ...(auth.role === 'user' && String(id) === auth.userId ? { userId: auth.userId, ownerId: auth.userId } : {}) });
    }

    // admin
    if (STAGED.includes(col)) return put(adminStaged(col, old, body, now));
    if (col === 'payments') {
      const keys = Object.keys(omit(body, ['id']));
      if (keys.length !== 1 || keys[0] !== 'status' || !(old.status === 'refund_pending' && body.status === 'refunded'))
        throw new HttpError(422, 'illegal_transition', { from: old.status, to: body.status });
      return put({ ...old, status: 'refunded', refundedAt: now, updatedAt: now });
    }
    let rec = { ...(method === 'PATCH' && old ? old : { createdAt: old ? old.createdAt : now }), ...omit(body, ['createdAt', 'id']), id: old ? old.id : String(id), updatedAt: now };
    if (!old) rec.createdAt = now;
    if (col === 'products') rec = validateProduct(rec);
    return put(rec);
  });
  return send(res, out.created ? 201 : 200, out);
}

// ---------------------------------------------------------------- routes
async function api(req, res, parts) {
  const [col, rawId] = parts;
  const auth = authOf(req);
  let id;
  try { id = rawId !== undefined ? decodeURIComponent(rawId) : undefined; } catch (e) { return send(res, 400, { error: 'bad_id' }); }

  if (col === 'health' && req.method === 'GET') return send(res, 200, { ok: true, auth: true });
  if (col === 'catalog' && req.method === 'GET') {
    return etagged(req, res, { products: db.products.filter(p => p.active !== false), services: db.services.filter(s => s.active !== false) });
  }
  if (col === 'db' && req.method === 'GET') {
    if (auth.role !== 'admin') throw new HttpError(auth.role === 'guest' ? 401 : 403, auth.stale ? 'session_expired' : 'forbidden');
    return etagged(req, res, db);
  }
  if (col === 'me' && req.method === 'GET') {
    if (auth.role !== 'user') throw new HttpError(401, auth.stale ? 'session_expired' : 'unauthorized');
    const uid = auth.userId;
    return send(res, 200, {
      user: db.users.find(u => u.id === uid) || null,
      orders: db.orders.filter(o => o.userId === uid),
      serviceRequests: db.serviceRequests.filter(r => r.userId === uid),
      payments: db.payments.filter(p => p.userId === uid),
      cart: db.carts.find(c => String(c.id) === uid) || null,
      wishlist: db.wishlists.find(c => String(c.id) === uid) || null,
      addressBook: db.addressBooks.find(c => String(c.id) === uid) || null,
    });
  }

  if (col === 'admin' && rawId === 'login' && req.method === 'POST') {
    const key = 'admin:' + (req.socket.remoteAddress || '');
    if (limited(key, 5, 600000)) throw new HttpError(429, 'too_many_attempts');
    const body = await readBody(req);
    if (!isObj(body) || typeof body.password !== 'string' || !sameStr(body.password, ADMIN_PASSWORD)) { fail(key, 600000); throw new HttpError(401, 'wrong_password'); }
    hits.delete(key);
    return send(res, 200, issue('admin'));
  }
  if (col === 'admin' && rawId === 'logout' && req.method === 'POST') { tokens.delete(String(req.headers['x-admin-token'] || '')); return send(res, 200, { ok: true }); }

  if (col === 'auth' && rawId === 'otp' && req.method === 'POST') {
    const body = await readBody(req), uid = isObj(body) && userIdOf(body.phone);
    if (!uid) throw bad('phone', 'شمارهٔ موبایل نامعتبر است');
    if (limited('otp:' + uid, 5, 600000)) throw new HttpError(429, 'too_many_attempts');
    fail('otp:' + uid, 600000);
    if (!FIXED_OTP) { const code = String(crypto.randomInt(100000, 1000000)); otps.set(uid, { code, exp: Date.now() + 300000 }); console.log('[otp] ' + uid + ' → ' + code); }
    return send(res, 200, { ok: true });
  }
  if (col === 'auth' && rawId === 'verify' && req.method === 'POST') {
    const body = await readBody(req), uid = isObj(body) && userIdOf(body.phone);
    if (!uid) throw bad('phone', 'شمارهٔ موبایل نامعتبر است');
    const key = 'verify:' + uid;
    if (limited(key, 5, 600000)) throw new HttpError(429, 'too_many_attempts');
    const code = faDigits(body.code).replace(/\D/g, '');
    const want = FIXED_OTP || (otps.get(uid) || {}).code;
    if (!want || !sameStr(code, want)) { fail(key, 600000); throw new HttpError(401, 'wrong_code', { message: 'کد واردشده درست نیست' }); }
    hits.delete(key); otps.delete(uid);
    const now = new Date().toISOString(), digits = uid.slice(2);
    const name = [body.firstName, body.lastName].filter(Boolean).join(' ').trim().slice(0, 100);
    const out = await tx(['users', 'sessions'], () => {
      const i = byId(db.users, uid), old = i < 0 ? null : db.users[i];
      const user = { ...(old || { id: uid, createdAt: now }), phone: digits, lastLoginAt: now, loginCount: ((old && old.loginCount) || 0) + 1, updatedAt: now,
        ...(name ? { name, firstName: String(body.firstName || '').slice(0, 50), lastName: String(body.lastName || '').slice(0, 50) } : {}) };
      db.users = old ? db.users.map((u, k) => (k === i ? user : u)) : db.users.concat(user);
      db.sessions = db.sessions.concat({ id: crypto.randomUUID(), userId: uid, phone: digits, type: old ? 'login' : 'signup', at: now, createdAt: now });
      return { user, created: !old };
    });
    return send(res, 200, { ...issue('user', uid), ...out });
  }
  if (col === 'auth' && rawId === 'logout' && req.method === 'POST') {
    if (auth.role === 'user') { tokens.delete(auth.token); await tx(['sessions'], () => { db.sessions = db.sessions.concat({ id: crypto.randomUUID(), userId: auth.userId, type: 'logout', at: new Date().toISOString() }); }).catch(() => {}); }
    return send(res, 200, { ok: true });
  }

  if (!COLLECTIONS.includes(col)) return send(res, 404, { error: 'unknown_collection' });
  return crud(req, res, auth, col, id);
}

// ---------------------------------------------------------------- static files
const PRIVATE = new Set(['server.js', 'package.json', 'package-lock.json', 'db.json', 'data', 'node_modules', 'docs']);
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript',
               '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serveStatic(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch (e) { res.writeHead(400); return res.end('bad request'); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end('bad request'); }
  if (rel === '/') { res.writeHead(302, { Location: '/shop/' }); return res.end(); }   // site root → the shop
  let file = path.normalize(path.join(ROOT, rel));
  // only the pages are public: no dot-files/folders at any depth (.git …), no server code, no database
  const segs = path.relative(ROOT, file).split(path.sep);
  if (!file.startsWith(ROOT + path.sep) || segs.some(s => s.startsWith('.')) || PRIVATE.has(segs[0])
      || /\.(tmp|corrupt-\d+)$/.test(file)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      // a folder (shop/, panel/) serves its index.html; without the trailing slash, redirect so the
      // pages' relative addresses (../api) resolve from inside the folder
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: rel + '/' }); return res.end(); }
      file = path.join(file, 'index.html');
      return fs.stat(file, (e2, st2) => send200(e2, st2));
    }
    send200(err, st);
  });
  function send200(err, st) {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SEC_HEADERS });
    fs.createReadStream(file).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'api') {
    api(req, res, parts.slice(1)).catch((e) => {
      if (res.headersSent) return;
      if (e instanceof HttpError) return send(res, e.status, e.body);
      console.error(e); send(res, 500, { error: 'server_error' });
    });
  } else if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url.pathname);
  } else { res.writeHead(405); res.end(); }
});
server.listen(PORT, HOST, () => {
  console.log('Emdad Oxygen shop  → http://localhost:' + PORT + '/shop/');
  console.log('Admin panel       → http://localhost:' + PORT + '/panel/');
  console.log('Database           → ' + DB_FILE + '  (API: see the header of server.js)');
  if (!process.env.ADMIN_PASSWORD) console.warn('[security] ADMIN_PASSWORD is not set: the admin password is the demo default. Set it before exposing this server.');
  if (FIXED_OTP) console.warn('[security] every phone accepts the one-time code ' + (process.env.OTP_CODE ? '(OTP_CODE)' : '"123456" (demo)') + '. Set NODE_ENV=production and wire an SMS provider before going live.');
});
