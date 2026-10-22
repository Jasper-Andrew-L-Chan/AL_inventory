'use strict';
/**
 * Shared server-side helpers for the AffordaLabs central database API.
 *
 * Storage: Upstash Redis (REST) — the single source of truth for every PC.
 *   al:users     hash   userId -> user JSON (password stored as scrypt hash only)
 *   al:items     hash   itemId -> medicine JSON (static fields only)
 *   al:stock     hash   "<itemId>|b|a|d|c" -> number  (beginning/added/deducted/current)
 *   al:txns      hash   txnId  -> transaction JSON
 *   al:settings  string pharmacy settings JSON
 *   al:drawer    string cash drawer JSON
 *   al:meta      hash   ver (change counter), shift (current shift id)
 *   al:receipts  set    every receipt number ever issued (uniqueness)
 */
const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const K = {
  users: 'al:users',
  items: 'al:items',
  stock: 'al:stock',
  txns: 'al:txns',
  settings: 'al:settings',
  drawer: 'al:drawer',
  meta: 'al:meta',
  receipts: 'al:receipts',
  rcptCounter: 'al:rcptctr'
};

const ALL_PERMISSIONS = ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'];
const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;

function configured() {
  return !!(REDIS_URL && REDIS_TOKEN);
}

// ── Redis REST ──────────────────────────────────────────────────────────────
async function rpipeline(cmds) {
  const res = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map(c => c.map(a => (typeof a === 'string' ? a : String(a)))))
  });
  if (!res.ok) throw new Error('Database error (' + res.status + ')');
  const out = await res.json();
  return out.map(x => {
    if (x && x.error) throw new Error('Database error: ' + x.error);
    return x ? x.result : null;
  });
}

async function rcmd(...args) {
  return (await rpipeline([args]))[0];
}

/** Convert a flat [field, value, field, value ...] reply to an object. */
function toObj(flat) {
  const o = {};
  if (!flat) return o;
  if (!Array.isArray(flat)) return flat;
  for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
}

function bumpCmd() {
  return ['HINCRBY', K.meta, 'ver', '1'];
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
function send(res, code, obj) {
  res.status(code).json(obj);
}

function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b.replace(/^\uFEFF/, '')); } catch (e) { b = {}; }
  }
  return b && typeof b === 'object' ? b : {};
}

function handler(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (!configured()) {
        return send(res, 503, { error: 'Central database is not configured. Add the Upstash Redis integration in Vercel (KV_REST_API_URL / KV_REST_API_TOKEN).' });
      }
      await fn(req, res);
    } catch (err) {
      console.error(err);
      send(res, 500, { error: (err && err.message) || 'Server error' });
    }
  };
}

// ── Sessions (HMAC-signed bearer token) ─────────────────────────────────────
function secret() {
  return process.env.SESSION_SECRET ||
    crypto.createHash('sha256').update('al-session:' + REDIS_TOKEN).digest('hex');
}

function b64u(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  return b64u(crypto.createHmac('sha256', secret()).update(payload).digest());
}

function signToken(userId) {
  const payload = b64u(JSON.stringify({ u: userId, e: Date.now() + TOKEN_TTL_MS }));
  return payload + '.' + sign(payload);
}

/** Returns userId for a valid, unexpired token, otherwise null. */
function verifyToken(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const parts = m[1].split('.');
  if (parts.length !== 2) return null;
  const expected = sign(parts[0]);
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!p.u || !p.e || p.e < Date.now()) return null;
    return p.u;
  } catch (e) {
    return null;
  }
}

// ── Passwords ───────────────────────────────────────────────────────────────
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + h;
}

function verifyPassword(pw, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const h = crypto.scryptSync(String(pw), parts[1], 64);
  const s = Buffer.from(parts[2], 'hex');
  return h.length === s.length && crypto.timingSafeEqual(h, s);
}

// ── Users ───────────────────────────────────────────────────────────────────
function isAdminUser(u) {
  if (!u) return false;
  const lvl = String(u.level || '').toLowerCase();
  const role = String(u.role || '').toLowerCase();
  return lvl === 'owner' || lvl === 'admin' || role.includes('owner') || role.includes('admin') || u.username === 'admin';
}

function isActive(u) {
  return !!u && String(u.status || 'Active').toLowerCase() === 'active';
}

function hasPerm(u, perms) {
  if (isAdminUser(u)) return true;
  const mine = Array.isArray(u.permissions) ? u.permissions : [];
  return perms.some(p => mine.includes(p));
}

function sanitizeUser(u) {
  if (!u) return null;
  const { passHash, ...rest } = u;
  return rest;
}

function normalizePermissions(perms) {
  return (Array.isArray(perms) ? perms : []).filter(p => ALL_PERMISSIONS.includes(p));
}

function newUserRecord(d) {
  const username = String(d.username || '').toLowerCase().trim();
  const fullName = String(d.fullName || '').trim() || username;
  const level = d.level || 'Staff';
  const admin = level === 'Owner' || level === 'Admin';
  return {
    id: d.id || ('usr-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex')),
    username,
    passHash: hashPassword(d.password),
    fullName,
    firstName: d.firstName || fullName.split(' ')[0] || username,
    initials: d.initials || fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    role: d.role || 'Staff Pharmacist',
    level,
    permissions: admin ? [...ALL_PERMISSIONS] : normalizePermissions(d.permissions),
    prcLicense: d.prcLicense || '-',
    phone: d.phone || '-',
    status: d.status || 'Active',
    avatar: null
  };
}

async function getAllUsers() {
  const flat = await rcmd('HGETALL', K.users);
  const obj = toObj(flat);
  return Object.values(obj).map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
}

/** First run: create the initial administrator so someone can sign in. */
async function ensureSeed() {
  const n = await rcmd('HLEN', K.users);
  if (Number(n) > 0) return;
  const claimed = await rcmd('SET', 'al:seeded', '1', 'NX');
  if (claimed !== 'OK') return;
  const pw = process.env.ADMIN_PASSWORD || 'admin123';
  const u = newUserRecord({
    username: 'admin',
    password: pw,
    fullName: 'System Administrator',
    role: 'Owner / Administrator',
    level: 'Admin',
    permissions: ALL_PERMISSIONS,
    prcLicense: 'N/A',
    phone: '-',
    status: 'Active'
  });
  u.mustChange = !process.env.ADMIN_PASSWORD;
  await rpipeline([['HSET', K.users, u.id, JSON.stringify(u)], bumpCmd()]);
}

/** Authenticate request -> { user } or sends 401 and returns null. */
async function authUser(req, res) {
  const userId = verifyToken(req);
  if (!userId) {
    send(res, 401, { error: 'Not signed in' });
    return null;
  }
  const json = await rcmd('HGET', K.users, userId);
  let user = null;
  try { user = json ? JSON.parse(json) : null; } catch (e) { user = null; }
  if (!user || !isActive(user)) {
    send(res, 401, { error: 'Account disabled or removed' });
    return null;
  }
  return user;
}

// ── Shift rollover (6:00 AM – 9:00 PM, Philippine time, done once centrally) ─
function currentShiftId() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const pad = n => String(n).padStart(2, '0');
  const date = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const h = d.getUTCHours();
  if (h >= 6 && h < 21) return date + '_open_06_21';
  return date + '_closed_h' + (h < 6 ? 'early' : 'late');
}

/**
 * When a new shift starts, every medicine's "beginning stock" becomes its
 * current stock and Added / Deducted reset to 0. Done exactly once on the
 * server so all PCs agree. Returns the new version, or null if another
 * request is already handling it.
 */
async function rollShift(shiftId) {
  const lock = await rcmd('SET', 'al:shiftlock:' + shiftId, '1', 'NX', 'EX', '300');
  if (lock !== 'OK') return null;
  const stock = toObj(await rcmd('HGETALL', K.stock));
  const args = [];
  Object.keys(stock).forEach(f => {
    if (f.endsWith('|c')) {
      const id = f.slice(0, -2);
      args.push(id + '|b', stock[f], id + '|a', '0', id + '|d', '0');
    }
  });
  for (let i = 0; i < args.length; i += 300) {
    await rcmd('HSET', K.stock, ...args.slice(i, i + 300));
  }
  const r = await rpipeline([['HSET', K.meta, 'shift', shiftId], bumpCmd()]);
  return Number(r[1]);
}

// ── Items / stock helpers ───────────────────────────────────────────────────
const STOCK_FIELDS = ['beginningStock', 'addedStock', 'deductedStock', 'currentStock'];

function splitItem(item) {
  const rest = { ...item };
  const stock = {};
  STOCK_FIELDS.forEach(f => {
    stock[f] = Number(rest[f]) || 0;
    delete rest[f];
  });
  return { rest, stock };
}

function stockCmds(id, stock, mode) {
  const set = mode === 'set';
  const op = set ? 'HSET' : 'HSETNX';
  return [
    [op, K.stock, id + '|b', stock.beginningStock],
    [op, K.stock, id + '|a', stock.addedStock],
    [op, K.stock, id + '|d', stock.deductedStock],
    [op, K.stock, id + '|c', stock.currentStock]
  ];
}

module.exports = {
  K, ALL_PERMISSIONS, configured, rpipeline, rcmd, toObj, bumpCmd,
  send, readBody, handler,
  signToken, verifyToken, hashPassword, verifyPassword,
  isAdminUser, isActive, hasPerm, sanitizeUser, normalizePermissions,
  newUserRecord, getAllUsers, ensureSeed, authUser,
  currentShiftId, rollShift, splitItem, stockCmds
};
